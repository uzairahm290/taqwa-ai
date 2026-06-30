import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@quran_bookmarks';

// Bookmark id format: "surahNumber:verseNumber"
function toId(surah, verse) { return `${surah}:${verse}`; }

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(new Set());

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setBookmarks(new Set(JSON.parse(raw)));
    }).catch(() => {});
  }, []);

  async function persist(next) {
    setBookmarks(next);
    await AsyncStorage.setItem(KEY, JSON.stringify([...next]));
  }

  const toggleBookmark = useCallback(async (surahNumber, verseNumber) => {
    setBookmarks((prev) => {
      const id = toId(surahNumber, verseNumber);
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (surahNumber, verseNumber) => bookmarks.has(toId(surahNumber, verseNumber)),
    [bookmarks]
  );

  // Returns all bookmarks as [{surah, verse}]
  const allBookmarks = [...bookmarks].map((id) => {
    const [surah, verse] = id.split(':').map(Number);
    return { surah, verse };
  });

  return { toggleBookmark, isBookmarked, allBookmarks };
}
