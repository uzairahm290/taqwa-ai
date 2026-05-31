import { getLocalDateString } from '../lib/dateUtils';
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchNearbyMosques, fetchMosquesWithin100m } from '../lib/placesClient';

export function useMosque() {
  const [nearbyMosques, setNearbyMosques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const loadNearbyMosques = useCallback(async (lat, lng) => {
    setLoading(true);
    try {
      const results = await fetchNearbyMosques(lat, lng, 2000);
      setNearbyMosques(results);
    } catch (_) {}
    setLoading(false);
  }, []);

  async function checkAutoDetect(lat, lng, prayerName) {
    try {
      const mosques = await fetchMosquesWithin100m(lat, lng);
      if (mosques.length > 0) {
        return mosques[0]; // closest mosque
      }
    } catch (_) {}
    return null;
  }

  async function checkinMosque({ prayerName, mosque, userId, autoDetected = false }) {
    setCheckinLoading(true);
    try {
      await supabase.from('mosque_checkins').insert({
        user_id: userId,
        prayer_name: prayerName,
        mosque_name: mosque.name,
        mosque_place_id: mosque.place_id,
        lat: mosque.geometry?.location?.lat,
        lng: mosque.geometry?.location?.lng,
        auto_detected: autoDetected,
      });

      await supabase.from('prayers').upsert({
        user_id: userId,
        date: getLocalDateString(),
        [prayerName.toLowerCase()]: true,
        [`${prayerName.toLowerCase()}_location`]: 'mosque',
      });
    } finally {
      setCheckinLoading(false);
    }
  }

  async function getMosqueStreak(userId) {
    const { data } = await supabase
      .from('mosque_checkins')
      .select('checked_in_at')
      .eq('user_id', userId)
      .order('checked_in_at', { ascending: false });

    if (!data?.length) return 0;

    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const uniqueDays = [...new Set(data.map((r) => r.checked_in_at.split('T')[0]))];
    for (const day of uniqueDays) {
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((checkDate - d) / 86400000);
      if (diff === 0 || diff === streak) {
        streak++;
        checkDate = d;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  return { nearbyMosques, loading, checkinLoading, loadNearbyMosques, checkAutoDetect, checkinMosque, getMosqueStreak };
}
