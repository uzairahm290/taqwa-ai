import { useState, useEffect, useRef, useCallback } from 'react';
import { getLocalDateString } from '../lib/dateUtils';
import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRESETS = [
  { id: 'subhanallah',   name: 'SubhanAllah',       arabic: 'سُبْحَانَ اللَّهِ',      meaning: 'Glory be to Allah',              target: 33  },
  { id: 'alhamdulillah', name: 'Alhamdulillah',     arabic: 'الْحَمْدُ لِلَّهِ',      meaning: 'Praise be to Allah',             target: 33  },
  { id: 'allahuakbar',   name: 'Allahu Akbar',      arabic: 'اللَّهُ أَكْبَرُ',       meaning: 'Allah is the Greatest',          target: 34  },
  { id: 'astaghfirullah',name: 'Astaghfirullah',    arabic: 'أَسْتَغْفِرُ اللَّهَ',   meaning: 'I seek forgiveness from Allah',  target: 100 },
  { id: 'lailaha',       name: 'Lā ilāha illallāh', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', meaning: 'There is no god but Allah',   target: 100 },
];

const CACHE_KEY = '@dhikr_daily';

async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export function useDhikr() {
  const today = getLocalDateString();

  // roundCount = count within the current round (0 → target, then resets)
  const [roundCount, setRoundCount] = useState(0);
  // dailyCounts = { dhikrId: totalForToday } — persisted to DB
  const [dailyCounts, setDailyCounts] = useState({});
  const [activeId, setActiveId] = useState('subhanallah');
  const [completing, setCompleting] = useState(false); // brief "complete" flash
  const [customDhikr, setCustomDhikr] = useState(null); // { id, name, arabic, meaning, target }
  const [loading, setLoading] = useState(true);

  const saveTimers = useRef({});
  const completingTimer = useRef(null);

  const activePreset = customDhikr?.id === activeId
    ? customDhikr
    : (PRESETS.find((p) => p.id === activeId) ?? PRESETS[0]);

  // ── Load today's counts from cache then DB ──────────────────────────────────
  useEffect(() => {
    load();
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
      if (completingTimer.current) clearTimeout(completingTimer.current);
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${today}`);
      if (cached) setDailyCounts(JSON.parse(cached));
    } catch (_) {}

    try {
      const user = await getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('dhikr_sessions')
        .select('dhikr_id, count')
        .eq('user_id', user.id)
        .eq('date', today);
      if (!error && data?.length) {
        const map = Object.fromEntries(data.map((r) => [r.dhikr_id, r.count]));
        setDailyCounts(map);
        await AsyncStorage.setItem(`${CACHE_KEY}_${today}`, JSON.stringify(map));
      }
    } catch (_) {}
    setLoading(false);
  }

  // ── Switch preset — reset the round ────────────────────────────────────────
  const switchPreset = useCallback((id) => {
    setActiveId(id);
    setRoundCount(0);
    setCompleting(false);
    if (completingTimer.current) clearTimeout(completingTimer.current);
  }, []);

  // ── Increment ───────────────────────────────────────────────────────────────
  const increment = useCallback(() => {
    const target = activePreset.target;

    setRoundCount((prev) => {
      const next = prev + 1;
      if (next >= target) {
        // Round complete — flash then reset
        setCompleting(true);
        if (completingTimer.current) clearTimeout(completingTimer.current);
        completingTimer.current = setTimeout(() => {
          setRoundCount(0);
          setCompleting(false);
        }, 900);
        return target; // hold at target momentarily
      }
      return next;
    });

    // Accumulate daily total
    setDailyCounts((prev) => {
      const newTotal = (prev[activeId] || 0) + 1;
      const next = { ...prev, [activeId]: newTotal };
      // Persist to cache immediately
      AsyncStorage.setItem(`${CACHE_KEY}_${today}`, JSON.stringify(next)).catch(() => {});
      // Debounce DB write
      if (saveTimers.current[activeId]) clearTimeout(saveTimers.current[activeId]);
      saveTimers.current[activeId] = setTimeout(() => saveToDb(activeId, newTotal), 1500);
      return next;
    });
  }, [activeId, activePreset.target, today]);

  // ── Reset current round (not daily total) ───────────────────────────────────
  const resetRound = useCallback(() => {
    setRoundCount(0);
    setCompleting(false);
    if (completingTimer.current) clearTimeout(completingTimer.current);
  }, []);

  // ── DB save ─────────────────────────────────────────────────────────────────
  async function saveToDb(dhikrId, count) {
    try {
      const user = await getUser();
      if (!user) return;
      const preset = dhikrId === customDhikr?.id
        ? customDhikr
        : PRESETS.find((p) => p.id === dhikrId) ?? PRESETS[0];
      const { error } = await supabase.from('dhikr_sessions').upsert(
        {
          user_id: user.id, date: today,
          dhikr_id: dhikrId,
          dhikr_name: preset.name,
          arabic: preset.arabic,
          count,
          target: preset.target,
        },
        { onConflict: 'user_id,date,dhikr_id' }
      );
      if (error) console.error('[useDhikr] save error:', error);
    } catch (err) {
      console.error('[useDhikr] saveToDb crash:', err);
    }
  }

  const totalToday = Object.values(dailyCounts).reduce((s, v) => s + (v || 0), 0);
  const activeTotal = dailyCounts[activeId] || 0;
  const completedRounds = activePreset.target > 0
    ? Math.floor(activeTotal / activePreset.target)
    : 0;

  return {
    activeId, activePreset, roundCount, completing,
    dailyCounts, activeTotal, totalToday, completedRounds,
    loading,
    increment, resetRound, switchPreset,
    customDhikr, setCustomDhikr,
  };
}
