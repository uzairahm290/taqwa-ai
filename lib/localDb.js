import AsyncStorage from '@react-native-async-storage/async-storage';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Habits ────────────────────────────────────────────────────────────────

export async function getHabits() {
  try {
    const raw = await AsyncStorage.getItem('@habits');
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

async function _saveHabits(habits) {
  await AsyncStorage.setItem('@habits', JSON.stringify(habits));
}

export async function addHabit({ name, icon }) {
  const habits = await getHabits();
  const h = { id: genId(), name, icon, is_active: true, created_at: new Date().toISOString() };
  await _saveHabits([...habits, h]);
  return h;
}

export async function archiveHabit(id) {
  const habits = await getHabits();
  await _saveHabits(habits.map(h => h.id === id ? { ...h, is_active: false } : h));
}

export async function getHabitLogs(date) {
  try {
    const raw = await AsyncStorage.getItem(`@habit_logs_${date}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

export async function toggleHabitLog(habitId, date) {
  const logs = await getHabitLogs(date);
  const existing = logs.find(l => l.habit_id === habitId);
  let updated;
  if (existing) {
    updated = logs.map(l => l.habit_id === habitId ? { ...l, completed: !l.completed } : l);
  } else {
    updated = [...logs, { id: genId(), habit_id: habitId, completed: true }];
  }
  await AsyncStorage.setItem(`@habit_logs_${date}`, JSON.stringify(updated));
  return updated;
}

// ── Quran ─────────────────────────────────────────────────────────────────

export async function getQuranSettings() {
  try {
    const raw = await AsyncStorage.getItem('@quran_settings');
    return raw ? JSON.parse(raw) : { method: 'page', daily_goal: 5, target_date: null };
  } catch (_) { return { method: 'page', daily_goal: 5, target_date: null }; }
}

export async function saveQuranSettings(settings) {
  await AsyncStorage.setItem('@quran_settings', JSON.stringify(settings));
}

export async function getQuranLog(date) {
  try {
    const raw = await AsyncStorage.getItem(`@quran_log_${date}`);
    return raw !== null ? parseInt(raw, 10) : null;
  } catch (_) { return null; }
}

export async function saveQuranLog(date, value) {
  await AsyncStorage.setItem(`@quran_log_${date}`, String(value));
}

export async function getAllQuranLogs() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const logKeys = keys.filter(k => k.startsWith('@quran_log_'));
    if (!logKeys.length) return [];
    const pairs = await AsyncStorage.multiGet(logKeys);
    return pairs.map(([key, val]) => ({
      date: key.replace('@quran_log_', ''),
      value: val !== null ? parseInt(val, 10) : 0,
    }));
  } catch (_) { return []; }
}

export async function getQuranSurahs() {
  try {
    const raw = await AsyncStorage.getItem('@quran_surahs');
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

export async function toggleQuranSurah(surahNumber) {
  const surahs = await getQuranSurahs();
  const updated = { ...surahs, [surahNumber]: !surahs[surahNumber] };
  await AsyncStorage.setItem('@quran_surahs', JSON.stringify(updated));
  return updated;
}
