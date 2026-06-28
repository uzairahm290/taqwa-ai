// Single shared cache — whichever screen imports first pays the parse cost.
// Subsequent imports (and re-renders) get the cached array instantly.
let _cache = null;

export function getQuranData() {
  if (!_cache) {
    try { _cache = require('../assets/quran.json'); }
    catch { _cache = []; }
  }
  return _cache;
}

// Call this once from the Quran tab so the JSON is parsed before
// the user navigates into a surah (hiding the 2-3 s parse behind the tab load).
export function preloadQuranData() {
  if (!_cache) getQuranData();
}
