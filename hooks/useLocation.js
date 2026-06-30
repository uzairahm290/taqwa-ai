import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabaseClient';
import { cacheUserProfile, getCachedUserProfile } from '../lib/offlineCache';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cached = await getCachedUserProfile();
      if (cached?.lat) setLocation({ lat: cached.lat, lng: cached.lng, city: cached.city });

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lng } = loc.coords;

        let city = '';
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocode[0]) {
          city = geocode[0].city || geocode[0].region || '';
        }

        setLocation({ lat, lng, city });
        await cacheUserProfile({ lat, lng, city });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('user_location').upsert({ user_id: user.id, lat, lng, city });
          }
        } catch (_) {}
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, error, loading };
}
