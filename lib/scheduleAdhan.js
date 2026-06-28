import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { fetchPrayerTimes, CALCULATION_METHODS, MADHAB } from './aladhanClient';
import { getLocalDateString } from './dateUtils';

export const ADHAN_CHANNEL_ID = 'adhan_v2';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const ARABIC = { Fajr: 'فجر', Dhuhr: 'ظهر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء' };
const LAST_SCHEDULED_KEY = '@adhan_last_scheduled';
const DAYS_AHEAD = 7;

async function getPrayerTimesForDate(userId, date, lat, lng, method, school) {
  const dateStr = getLocalDateString(date);
  // Try Supabase cache first
  try {
    const { data } = await supabase
      .from('prayer_times_cache')
      .select('fajr, dhuhr, asr, maghrib, isha')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .maybeSingle();

    if (data) {
      const clean = (s) => (s ? s.split(' ')[0] : null);
      return {
        Fajr: clean(data.fajr),
        Dhuhr: clean(data.dhuhr),
        Asr: clean(data.asr),
        Maghrib: clean(data.maghrib),
        Isha: clean(data.isha),
      };
    }
  } catch (_) {}

  // Fall back to Al-Adhan API
  const apiData = await fetchPrayerTimes(lat, lng, method, school, date);
  const clean = (s) => (s ? s.split(' ')[0] : null);
  return {
    Fajr: clean(apiData.timings.Fajr),
    Dhuhr: clean(apiData.timings.Dhuhr),
    Asr: clean(apiData.timings.Asr),
    Maghrib: clean(apiData.timings.Maghrib),
    Isha: clean(apiData.timings.Isha),
  };
}

export async function scheduleAdhanNotifications({ force = false } = {}) {
  try {
    // Throttle: only reschedule if last schedule was >3 days ago (unless forced)
    if (!force) {
      const last = await AsyncStorage.getItem(LAST_SCHEDULED_KEY);
      if (last) {
        const daysSince = (Date.now() - new Date(last).getTime()) / 86400000;
        if (daysSince < 3) return;
      }
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const [{ data: locData }, { data: notifData }] = await Promise.all([
      supabase.from('user_location')
        .select('lat, lng, calculation_method, madhab')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('notification_settings')
        .select('fajr, dhuhr, asr, maghrib, isha')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!locData?.lat || !locData?.lng) return;

    const method = CALCULATION_METHODS[locData.calculation_method || 'Karachi'] ?? 1;
    const school = MADHAB[locData.madhab || 'Hanafi'] ?? 1;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    let count = 0;

    for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);

      let times;
      try {
        times = await getPrayerTimesForDate(user.id, date, locData.lat, locData.lng, method, school);
      } catch (_) {
        continue; // Skip days where API fails
      }

      for (const prayer of PRAYERS) {
        // Respect per-prayer notification toggles (default true if no row)
        if (notifData?.[prayer.toLowerCase()] === false) continue;

        const timeStr = times[prayer];
        if (!timeStr || !timeStr.includes(':')) continue;

        const [h, m] = timeStr.split(':').map(Number);
        const fireAt = new Date(date);
        fireAt.setHours(h, m, 0, 0);

        if (fireAt <= now) continue;

        const isFajr = prayer === 'Fajr';

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${prayer} · ${ARABIC[prayer]}`,
            body: isFajr
              ? 'الصلاة خير من النوم  ·  Prayer is better than sleep'
              : 'حي على الصلاة  ·  Come to prayer',
            data: { prayer, type: 'adhan' },
            ...(Platform.OS === 'ios' && { sound: 'azan.mp3' }),
            ...(Platform.OS === 'android' && { channelId: ADHAN_CHANNEL_ID }),
          },
          trigger: { type: 'date', date: fireAt },
        });
        count++;
      }
    }

    await AsyncStorage.setItem(LAST_SCHEDULED_KEY, new Date().toISOString());
    console.log(`[Adhan] Scheduled ${count} notifications across ${DAYS_AHEAD} days`);
    return count;
  } catch (err) {
    console.error('[Adhan] scheduleAdhanNotifications error:', err);
    return 0;
  }
}

export async function cancelAdhanNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(LAST_SCHEDULED_KEY);
}
