import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabaseClient';

const RECOVERY_PHRASE_KEY = 'mizan_recovery_phrase';

function generateRandomString(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 for readability
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useRecoveryAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSavedPhrase = async () => {
    return await SecureStore.getItemAsync(RECOVERY_PHRASE_KEY);
  };

  const parsePhrase = (phrase) => {
    const parts = phrase.split('-');
    if (parts.length !== 3 || parts[0] !== 'MZ') {
      throw new Error('Invalid recovery phrase format. Must be like MZ-XXXX-XXXX');
    }
    const id = parts[1];
    const secret = parts[2];
    return { email: `user_${id.toLowerCase()}@mizan.local`, password: secret };
  };

  const createNewAccount = async () => {
    const id = generateRandomString(6);
    const secret = generateRandomString(8);
    const phrase = `MZ-${id}-${secret}`;
    const email = `user_${id.toLowerCase()}@mizan.local`;
    const password = secret;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.warn('Auto signup failed (Supabase offline). Running in offline mode.');
      throw error;
    }

    await SecureStore.setItemAsync(RECOVERY_PHRASE_KEY, phrase);
    return { session: data.session, phrase };
  };

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const phrase = await getSavedPhrase();
      
      // Check if already signed in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setLoading(false);
        return { session, phrase };
      }

      if (phrase) {
        // We have a phrase but no session, try to log in
        try {
          const { email, password } = parsePhrase(phrase);
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          setLoading(false);
          return { session: data.session, phrase };
        } catch (e) {
          // If login fails, we might need to recreate an account if the database was wiped
          // But usually we just throw
          throw e;
        }
      } else {
        // First time opening app, create new account
        const result = await createNewAccount();
        setLoading(false);
        return result;
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { error: err };
    }
  }, []);

  const restoreAccount = async (phrase) => {
    setLoading(true);
    setError(null);
    try {
      const { email, password } = parsePhrase(phrase.trim().toUpperCase());
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      // Save the new phrase locally
      await SecureStore.setItemAsync(RECOVERY_PHRASE_KEY, phrase.trim().toUpperCase());
      
      setLoading(false);
      return data;
    } catch (err) {
      setError('Invalid or expired recovery phrase');
      setLoading(false);
      return { error: err };
    }
  };

  return {
    initializeAuth,
    restoreAccount,
    getSavedPhrase,
    loading,
    error,
  };
}
