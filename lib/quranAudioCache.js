import * as FileSystem from 'expo-file-system/legacy';

const CDN = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';
const CACHE_DIR = `${FileSystem.cacheDirectory}quran-audio/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function localPath(gid) {
  return `${CACHE_DIR}${gid}.mp3`;
}

// Returns local file URI if cached, otherwise null
export async function getCachedUri(gid) {
  try {
    const info = await FileSystem.getInfoAsync(localPath(gid));
    return info.exists && info.size > 0 ? localPath(gid) : null;
  } catch {
    return null;
  }
}

// Download a single verse and return its local URI
export async function downloadVerse(gid, onProgress) {
  await ensureDir();
  const dest = localPath(gid);

  try {
    const task = FileSystem.createDownloadResumable(
      `${CDN}/${gid}.mp3`,
      dest,
      {},
      onProgress
        ? ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
            if (totalBytesExpectedToWrite > 0) {
              onProgress(totalBytesWritten / totalBytesExpectedToWrite);
            }
          }
        : undefined
    );

    const result = await task.downloadAsync();
    return result?.uri ?? null;
  } catch (err) {
    // Clean up partial download
    try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch (_) {}
    throw err;
  }
}

// Get local URI, downloading if needed. onProgress(0–1) called during download.
export async function getOrDownloadVerse(gid, onProgress) {
  const cached = await getCachedUri(gid);
  if (cached) return cached;
  return downloadVerse(gid, onProgress);
}

// Returns { cached: number, total: number }
export async function getSurahCacheStatus(verses) {
  const results = await Promise.all(verses.map((v) => getCachedUri(v.gid)));
  return {
    cached: results.filter(Boolean).length,
    total: verses.length,
  };
}

// Download every verse in a surah that isn't already cached.
// onProgress(done, total) called after each verse completes.
export async function downloadSurah(verses, onProgress, cancelRef) {
  await ensureDir();
  let done = 0;
  for (const verse of verses) {
    if (cancelRef?.current) break;
    const cached = await getCachedUri(verse.gid);
    if (!cached) {
      await downloadVerse(verse.gid);
    }
    done++;
    onProgress?.(done, verses.length);
  }
}

// Total size of the cache in bytes
export async function getCacheSizeBytes() {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR, { size: true });
    return info.size ?? 0;
  } catch {
    return 0;
  }
}

// Delete all cached audio
export async function clearAudioCache() {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch (_) {}
}
