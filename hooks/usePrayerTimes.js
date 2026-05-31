import { getLocalDateString } from '../lib/dateUtils';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchPrayerTimes, CALCULATION_METHODS, MADHAB } from '../lib/aladhanClient';
import {
  cachePrayerSettings,
  cachePrayerTimes,
  cachePrayerTimesToday,
  enqueueWrite,
  getCachedPrayerSettings,
  getCachedPrayerTimes,
  getCachedPrayerTimesToday,
} from '../lib/offlineCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function usePrayerTimes(location, activeDateStr) {
  const [times, setTimes] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [methodName, setMethodName] = useState('Karachi');
  const [naflPrefs, setNaflPrefs] = useState({ Tahajjud: false, Duha: false, Witr: false });

  const targetDate = activeDateStr ? new Date(activeDateStr) : new Date();
  const dateKey = getLocalDateString(targetDate);
  const isToday = dateKey === getLocalDateString();

  async function loadLocalPrayerRecord() {
    try {
      const raw = await AsyncStorage.getItem(`@prayers_${dateKey}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function saveLocalPrayerRecord(record) {
    try {
      await AsyncStorage.setItem(`@prayers_${dateKey}`, JSON.stringify(record));
    } catch (_) {}
  }

  function applyTimes(t) {
    setTimes(t);
    if (isToday) computeNextPrayer(t);
    else setNextPrayer(null);
  }

  function cleanApiTimes(apiData) {
    const clean = (s) => s ? s.split(' ')[0] : s;
    return {
      Fajr: clean(apiData.timings.Fajr),
      Dhuhr: clean(apiData.timings.Dhuhr),
      Asr: clean(apiData.timings.Asr),
      Maghrib: clean(apiData.timings.Maghrib),
      Isha: clean(apiData.timings.Isha),
      Sehri: clean(apiData.timings.Imsak),
      Iftar: clean(apiData.timings.Maghrib),
    };
  }

  function cleanDbTimes(cached) {
    const clean = (s) => s ? s.split(' ')[0] : s;
    return {
      Fajr: clean(cached.fajr),
      Dhuhr: clean(cached.dhuhr),
      Asr: clean(cached.asr),
      Maghrib: clean(cached.maghrib),
      Isha: clean(cached.isha),
      Sehri: clean(cached.sehri),
      Iftar: clean(cached.iftar),
    };
  }

  function getUpcomingDateKeys(days = 7) {
    return Array.from({ length: days }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return { date, dateKey: getLocalDateString(date) };
    });
  }

  function prayerTimesDbPayload(userId, key, t) {
    return {
      user_id: userId,
      date: key,
      fajr: t.Fajr,
      dhuhr: t.Dhuhr,
      asr: t.Asr,
      maghrib: t.Maghrib,
      isha: t.Isha,
      sehri: t.Sehri,
      iftar: t.Iftar,
    };
  }

  async function prefetchUpcomingPrayerTimes(user, method, school) {
    if (!location?.lat || !location?.lng) return;

    await Promise.all(getUpcomingDateKeys().map(async ({ date, dateKey: key }) => {
      try {
        const cached = await getCachedPrayerTimes(key, location, method, school);
        if (cached) return;

        const apiData = await fetchPrayerTimes(location.lat, location.lng, method, school, date);
        const t = cleanApiTimes(apiData);
        await cachePrayerTimes(key, location, method, school, t);

        if (key === getLocalDateString()) {
          await cachePrayerTimesToday(t);
        }

        if (user) {
          await supabase.from('prayer_times_cache').upsert(prayerTimesDbPayload(user.id, key, t));
        }
      } catch (_) {}
    }));
  }

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@nafl_preferences');
        if (saved) setNaflPrefs(JSON.parse(saved));
      } catch (_) {}
    })();
  }, []);

  async function toggleNaflPref(nafl) {
    const newPrefs = { ...naflPrefs, [nafl]: !naflPrefs[nafl] };
    setNaflPrefs(newPrefs);
    try {
      await AsyncStorage.setItem('@nafl_preferences', JSON.stringify(newPrefs));
    } catch (_) {}
  }

  async function loadPrayerTimes() {
    if (!location || !location.lat || !location.lng) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const localRecord = await loadLocalPrayerRecord();
      if (localRecord) setTodayRecord(localRecord);
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
      } catch (_) {}

      let methodName = 'Karachi';
      let school = MADHAB['Hanafi'];
      let method = CALCULATION_METHODS['Karachi'];
      const savedSettings = await getCachedPrayerSettings();

      if (savedSettings?.calculation_method) methodName = savedSettings.calculation_method;
      if (savedSettings?.madhab) school = MADHAB[savedSettings.madhab] ?? school;
      method = CALCULATION_METHODS[methodName] ?? method;
      setMethodName(methodName);

      if (user) {
        // Load today's prayer record from DB
        const { data: record } = await supabase
          .from('prayers')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateKey)
          .single();

        if (record) {
          setTodayRecord(record);
          await saveLocalPrayerRecord(record);
        } else if (!localRecord) {
          setTodayRecord(null);
        }

        // Fetch settings for method/madhab
        const { data: locData } = await supabase
          .from('user_location')
          .select('calculation_method, madhab')
          .eq('user_id', user.id)
          .single();

        if (locData?.calculation_method) methodName = locData.calculation_method;
        if (locData?.madhab) school = MADHAB[locData.madhab] ?? school;
        method = CALCULATION_METHODS[methodName] ?? method;
        setMethodName(methodName);
        await cachePrayerSettings({
          calculation_method: methodName,
          madhab: locData?.madhab || savedSettings?.madhab || 'Hanafi',
        });

        const localTimes = await getCachedPrayerTimes(dateKey, location, method, school);
        if (localTimes) {
          applyTimes(localTimes);
          void prefetchUpcomingPrayerTimes(user, method, school);
          setLoading(false);
          return;
        }

        // Try DB cache first
        const { data: cached } = await supabase
          .from('prayer_times_cache')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateKey)
          .single();

        if (cached) {
          const t = cleanDbTimes(cached);
          applyTimes(t);
          await cachePrayerTimes(dateKey, location, method, school, t);
          if (isToday) await cachePrayerTimesToday(t);
          void prefetchUpcomingPrayerTimes(user, method, school);
          setLoading(false);
          return;
        }
      } else {
        if (localRecord) setTodayRecord(localRecord);
        setMethodName(methodName);

        const localTimes = await getCachedPrayerTimes(dateKey, location, method, school);
        if (localTimes) {
          applyTimes(localTimes);
          void prefetchUpcomingPrayerTimes(user, method, school);
          setLoading(false);
          return;
        }
      }

      setMethodName(methodName);

      const apiData = await fetchPrayerTimes(location.lat, location.lng, method, school, targetDate);
      const t = cleanApiTimes(apiData);

      applyTimes(t);
      await cachePrayerTimes(dateKey, location, method, school, t);

      if (isToday) {
        await cachePrayerTimesToday(t);
      }

      if (user) {
        await supabase.from('prayer_times_cache').upsert(prayerTimesDbPayload(user.id, dateKey, t));
      }
      void prefetchUpcomingPrayerTimes(user, method, school);
    } catch (_) {
      const savedSettings = await getCachedPrayerSettings();
      const methodName = savedSettings?.calculation_method || 'Karachi';
      setMethodName(methodName);
      const method = CALCULATION_METHODS[methodName] ?? CALCULATION_METHODS.Karachi;
      const school = savedSettings?.madhab ? (MADHAB[savedSettings.madhab] ?? MADHAB.Hanafi) : MADHAB.Hanafi;
      const offline = await getCachedPrayerTimes(dateKey, location, method, school);
      if (offline) {
        applyTimes(offline);
      } else if (isToday) {
        const todayOffline = await getCachedPrayerTimesToday();
        if (todayOffline) applyTimes(todayOffline);
      }
    } finally {
      setLoading(false);
    }
  }

  function computeNextPrayer(t) {
    const now = new Date();
    for (const name of PRAYERS) {
      const [h, m] = t[name].split(':').map(Number);
      const prayerDate = new Date();
      prayerDate.setHours(h, m, 0, 0);
      if (prayerDate > now) {
        setNextPrayer({ name, time: t[name], date: prayerDate });
        return;
      }
    }
    // All passed today — next is Fajr tomorrow
    const [h, m] = t.Fajr.split(':').map(Number);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(h, m, 0, 0);
    setNextPrayer({ name: 'Fajr', time: t.Fajr, date: tomorrow });
  }

  async function logPrayer(prayerName, prayed, locationStr = 'home') {
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch (_) {}

    const col = prayerName.toLowerCase();
    const locCol = `${col}_location`;

    if (user) {
      const payload = {
        user_id: user.id,
        date: dateKey,
        [col]: prayed,
        [locCol]: prayed ? locationStr : null,
      };
      const { error } = await supabase.from('prayers').upsert(payload);
      if (error) await enqueueWrite({ table: 'prayers', method: 'upsert', payload });
    }

    const nextRecord = {
      ...(todayRecord || {}),
      date: dateKey,
      [col]: prayed,
      [locCol]: prayed ? locationStr : null,
    };
    await saveLocalPrayerRecord(nextRecord);
    setTodayRecord(nextRecord);
  }

  useEffect(() => {
    if (!location) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPrayerTimes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, dateKey]);

  useEffect(() => {
    if (!times || !isToday) return;
    const interval = setInterval(() => {
      computeNextPrayer(times);
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [times, isToday]);

  return { times, todayRecord, nextPrayer, loading, logPrayer, reload: loadPrayerTimes, methodName, naflPrefs, toggleNaflPref };
}

export function useWeeklyPrayers() {
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch (_) {}

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(getLocalDateString(d));
    }

    async function loadLocalWeek() {
      try {
        const keys = days.map(d => `@prayers_${d}`);
        const pairs = await AsyncStorage.multiGet(keys);
        return pairs.map(([key, val]) => {
          if (!val) return null;
          const parsed = JSON.parse(val);
          parsed.date = key.replace('@prayers_', '');
          return parsed;
        }).filter(Boolean);
      } catch (_) {
        return [];
      }
    }

    const localData = await loadLocalWeek();
    if (localData.length) setWeekData(localData);

    if (user) {
      const { data } = await supabase
        .from('prayers')
        .select('*')
        .eq('user_id', user.id)
        .in('date', days)
        .order('date');

      if (data?.length) {
        setWeekData(data);
        await AsyncStorage.multiSet(
          data.map((record) => [`@prayers_${record.date}`, JSON.stringify(record)])
        );
      } else if (!localData.length) {
        setWeekData([]);
      }
    } else {
      setWeekData(localData);
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  return { weekData, loading, reload: load };
}
