import { getLocalDateString } from '../lib/dateUtils';
import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getQuranSettings, saveQuranSettings,
  getQuranLog, saveQuranLog, getAllQuranLogs,
  getQuranSurahs, toggleQuranSurah,
} from '../lib/localDb';

const SURAHS_CACHE_KEY = '@quran_all_surahs';

export function useQuran() {
  const [settings, setSettings] = useState({ method: 'page', daily_goal: 5, target_date: null });
  const [logs, setLogs] = useState([]);        // [{ date, value }]
  const [surahMap, setSurahMap] = useState({}); // { [surahNumber]: true/false }
  const [allSurahs, setAllSurahs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    loadAllSurahs();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, allLogs, surahs] = await Promise.all([
        getQuranSettings(),
        getAllQuranLogs(),
        getQuranSurahs(),
      ]);
      setSettings(s);
      setLogs(allLogs.sort((a, b) => (a.date > b.date ? -1 : 1)));
      setSurahMap(surahs);
    } catch (err) {
      console.error('[useQuran] load error:', err);
    }
    setLoading(false);
  }

  async function loadAllSurahs() {
    try {
      const cached = await AsyncStorage.getItem(SURAHS_CACHE_KEY);
      if (cached) setAllSurahs(JSON.parse(cached));
    } catch (_) {}

    try {
      const res = await fetch('https://api.alquran.cloud/v1/surah');
      const json = await res.json();
      if (json.data?.length) {
        setAllSurahs(json.data);
        await AsyncStorage.setItem(SURAHS_CACHE_KEY, JSON.stringify(json.data));
      }
    } catch (_) {}
  }

  async function logPages(value) {
    const today = getLocalDateString();
    setLogs(prev => {
      const exists = prev.find(l => l.date === today);
      if (exists) return prev.map(l => l.date === today ? { ...l, value } : l);
      return [{ date: today, value }, ...prev];
    });
    await saveQuranLog(today, value);
  }

  async function toggleSurah(surahNumber) {
    const updated = await toggleQuranSurah(surahNumber);
    setSurahMap(updated);
  }

  async function updateSettings(newSettings) {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveQuranSettings(updated);
  }

  // Convert surahMap → array format the UI expects: [{ surah_number, completed }]
  const surahs = useMemo(() =>
    Object.entries(surahMap).map(([num, completed]) => ({
      surah_number: parseInt(num, 10),
      completed,
    })),
  [surahMap]);

  const today = getLocalDateString();
  const todayLog = useMemo(() => logs.find(l => l.date === today), [logs, today]);
  const totalPages = useMemo(() => logs.reduce((s, l) => s + (l.value || 0), 0), [logs]);

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = getLocalDateString(d);
      if (logs.find(l => l.date === dateStr && l.value > 0)) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return s;
  }, [logs]);

  return {
    settings, logs, surahs, allSurahs,
    loading, todayLog, totalPages, streak,
    logPages, toggleSurah, updateSettings,
    reload: load,
  };
}
