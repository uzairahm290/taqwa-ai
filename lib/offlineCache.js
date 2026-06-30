import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PRAYER_TIMES_TODAY: 'prayer_times_today',
  PRAYER_TIMES_PREFIX: '@prayer_times',
  PRAYER_SETTINGS: '@prayer_settings',
  DUAS_CACHE: 'duas_cache',
  LAST_7_PRAYERS: 'last_7_prayers',
  LAST_7_HABITS: 'last_7_habits',
  USER_PROFILE: 'user_profile',
  WRITE_QUEUE: 'write_queue',
};

export async function cacheSet(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

export async function cacheGet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export async function cacheRemove(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (_) {}
}

export async function cachePrayerTimesToday(data) {
  await cacheSet(KEYS.PRAYER_TIMES_TODAY, data);
}

export async function getCachedPrayerTimesToday() {
  return cacheGet(KEYS.PRAYER_TIMES_TODAY);
}

function prayerTimesKey(dateKey, location, method, school) {
  const lat = Number(location?.lat).toFixed(2);
  const lng = Number(location?.lng).toFixed(2);
  return `${KEYS.PRAYER_TIMES_PREFIX}_${dateKey}_${lat}_${lng}_${method}_${school}`;
}

export async function cachePrayerTimes(dateKey, location, method, school, data) {
  await cacheSet(prayerTimesKey(dateKey, location, method, school), {
    date: dateKey,
    lat: Number(location?.lat),
    lng: Number(location?.lng),
    method,
    school,
    times: data,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedPrayerTimes(dateKey, location, method, school) {
  const cached = await cacheGet(prayerTimesKey(dateKey, location, method, school));
  return cached?.times ?? null;
}

export async function cachePrayerSettings(settings) {
  await cacheSet(KEYS.PRAYER_SETTINGS, settings);
}

export async function getCachedPrayerSettings() {
  return cacheGet(KEYS.PRAYER_SETTINGS);
}

export async function cacheDuas(duas) {
  await cacheSet(KEYS.DUAS_CACHE, duas);
}

export async function getCachedDuas() {
  return cacheGet(KEYS.DUAS_CACHE);
}

export async function cacheLast7Prayers(data) {
  await cacheSet(KEYS.LAST_7_PRAYERS, data);
}

export async function getCachedLast7Prayers() {
  return cacheGet(KEYS.LAST_7_PRAYERS);
}

export async function cacheLast7Habits(data) {
  await cacheSet(KEYS.LAST_7_HABITS, data);
}

export async function getCachedLast7Habits() {
  return cacheGet(KEYS.LAST_7_HABITS);
}

export async function cacheUserProfile(profile) {
  await cacheSet(KEYS.USER_PROFILE, profile);
}

export async function getCachedUserProfile() {
  return cacheGet(KEYS.USER_PROFILE);
}

// Write queue for offline mutations
export async function enqueueWrite(operation) {
  const queue = (await cacheGet(KEYS.WRITE_QUEUE)) || [];
  queue.push({ ...operation, queuedAt: new Date().toISOString() });
  await cacheSet(KEYS.WRITE_QUEUE, queue);
}

export async function flushWriteQueue(supabase) {
  const queue = (await cacheGet(KEYS.WRITE_QUEUE)) || [];
  if (!queue.length) return;
  const remaining = [];
  for (const op of queue) {
    try {
      await supabase.from(op.table)[op.method](op.payload);
    } catch (_) {
      remaining.push(op);
    }
  }
  await cacheSet(KEYS.WRITE_QUEUE, remaining);
}
