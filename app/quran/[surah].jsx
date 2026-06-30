import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Platform, Animated, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../components/theme';
import BackgroundEffect from '../../components/BackgroundEffect';
import { useBookmarks } from '../../hooks/useBookmarks';
import {
  getOrDownloadVerse,
  getSurahCacheStatus,
  downloadSurah,
} from '../../lib/quranAudioCache';
import { getQuranData } from '../../lib/quranData';
import NetInfo from '@react-native-community/netinfo';
import Toast from '../../components/Toast';

// Remove Arabic diacritics (harakat) for comparison — diacritic ORDER differs
// between the source JSON and string literals, so indexOf on raw text fails.
const removeHarakat = (s) => s.replace(/[ً-ٰٟ]/g, '');

// Strip Bismillah prefix from verse 1 of surahs that show the standalone banner.
// The JSON prepends Bismillah to verse 1 for surahs 2–114 (except 9).
function stripBismillahPrefix(ar) {
  if (!ar) return ar;
  const clean = ar.replace(/^﻿/, '').trim();
  const bare = removeHarakat(clean);
  // Confirm it starts with Baa-Sin-Meem (بسم)
  if (!bare.startsWith('بسم')) return ar;
  // Find 'ٱلرحيم' or 'الرحيم' in the diacritic-stripped text
  const bareTarget1 = 'ٱلرحيم'; // ٱلرحيم
  const bareTarget2 = 'الرحيم'; // الرحيم
  let endBareIdx = bare.indexOf(bareTarget1);
  let endBareLen = bareTarget1.length;
  if (endBareIdx === -1) { endBareIdx = bare.indexOf(bareTarget2); endBareLen = bareTarget2.length; }
  if (endBareIdx === -1) return ar;
  const targetBareEnd = endBareIdx + endBareLen;
  // Map the bare-string position back to the original (diacritics add chars but don't count)
  let origPos = 0, barePos = 0;
  while (origPos < clean.length && barePos < targetBareEnd) {
    const cp = clean.codePointAt(origPos);
    if (!((cp >= 0x064B && cp <= 0x065F) || cp === 0x0670)) barePos++;
    origPos++;
  }
  // Skip any diacritics that trail the last consonant of the Bismillah
  while (origPos < clean.length) {
    const cp = clean.codePointAt(origPos);
    if (!((cp >= 0x064B && cp <= 0x065F) || cp === 0x0670)) break;
    origPos++;
  }
  const result = clean.slice(origPos).trim();
  return result.length > 0 ? result : ar;
}

function fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Verse number badge ───────────────────────────────────────────────────────
function VerseBadge({ n, color }) {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color }}>{n}</Text>
    </View>
  );
}

// ─── Single verse card ────────────────────────────────────────────────────────
function VerseCard({ verse, surahId, surahName, isBookmarked, toggleBookmark, onPlay, isPlaying, isLoading, COLORS, isDark }) {
  const showsBanner = surahId !== 1 && surahId !== 9;
  const arabicText = (verse.id === 1 && showsBanner)
    ? stripBismillahPrefix(verse.ar)
    : verse.ar;

  async function handleShare() {
    try {
      await Share.share({
        title: `${surahName} · Verse ${verse.id} | Taqwa AI`,
        message: [
          arabicText ?? verse.ar,
          '',
          verse.en,
          '',
          `— Surah ${surahName}, Verse ${verse.id}`,
          '',
          '📿 Taqwa AI – Your Islamic Companion',
        ].join('\n'),
      });
    } catch (_) {}
  }

  return (
    <View style={{
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderRadius: 16, borderWidth: 0.5,
      borderColor: isPlaying ? COLORS.gold : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
      padding: 18, marginBottom: 12,
    }}>
      {arabicText ? (
        <Text style={{
          fontFamily: 'Amiri_400Regular', fontSize: 24, color: COLORS.textPrimary,
          textAlign: 'right', lineHeight: 46, writingDirection: 'rtl', marginBottom: 14,
        }}>
          {arabicText}
        </Text>
      ) : null}
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 14 }}>
        {verse.en}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <VerseBadge n={verse.id} color={COLORS.textTertiary} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Share */}
          <TouchableOpacity onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="share-2" size={17} color={COLORS.textTertiary} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
          {/* Bookmark */}
          <TouchableOpacity onPress={() => toggleBookmark(surahId, verse.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather
              name="bookmark" size={18}
              color={isBookmarked ? COLORS.gold : COLORS.textTertiary}
              style={{ opacity: isBookmarked ? 1 : 0.5 }}
            />
          </TouchableOpacity>
          {/* Play */}
          <TouchableOpacity onPress={() => onPlay(verse.gid)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.gold} />
            ) : (
              <Feather
                name={isPlaying ? 'pause-circle' : 'play-circle'}
                size={24}
                color={isPlaying ? COLORS.gold : COLORS.textSecondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Bottom Audio Player ──────────────────────────────────────────────────────
function BottomPlayer({
  visible, surahName, verseNumber, totalVerses,
  audioState, autoPlay, progress,
  onPlayPause, onStop, onPrev, onNext, onAutoPlayToggle,
  COLORS, isDark,
}) {
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 120,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible]);

  const isPlaying = audioState === 'playing';
  const isLoading = audioState === 'loading';
  const progressPct = progress.total > 0 ? Math.min(1, progress.current / progress.total) : 0;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View style={{
        backgroundColor: isDark ? '#0E0E18' : '#FAF8F2',
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(201,168,76,0.2)' : 'rgba(166,131,38,0.15)',
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        paddingTop: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDark ? 0.4 : 0.08,
        shadowRadius: 12,
        elevation: 16,
      }}>
        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: isDark ? '#1C1C28' : '#EAE6DF', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
          <View style={{ height: 3, width: `${progressPct * 100}%`, backgroundColor: COLORS.gold, borderRadius: 2 }} />
        </View>

        {/* Time row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: COLORS.textTertiary }}>
            {fmt(progress.current)}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', flex: 1 }}>
            {surahName} · Verse {verseNumber} of {totalVerses}
          </Text>
          <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: COLORS.textTertiary }}>
            {fmt(progress.total)}
          </Text>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Auto-play toggle */}
          <TouchableOpacity
            onPress={onAutoPlayToggle}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
              backgroundColor: autoPlay
                ? (isDark ? 'rgba(201,168,76,0.15)' : 'rgba(166,131,38,0.1)')
                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
              borderWidth: 1,
              borderColor: autoPlay
                ? (isDark ? 'rgba(201,168,76,0.4)' : 'rgba(166,131,38,0.3)')
                : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            }}
          >
            <Feather name="repeat" size={12} color={autoPlay ? COLORS.gold : COLORS.textTertiary} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: autoPlay ? COLORS.gold : COLORS.textTertiary }}>
              Auto
            </Text>
          </TouchableOpacity>

          {/* Prev */}
          <TouchableOpacity onPress={onPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="skip-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            onPress={onPlayPause}
            style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: COLORS.gold,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Feather name={isPlaying ? 'pause' : 'play'} size={24} color="#000" style={!isPlaying ? { marginLeft: 2 } : {}} />
            )}
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity onPress={onNext} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="skip-forward" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity
            onPress={onStop}
            style={{
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }}
          >
            <Feather name="x" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function QuranReaderScreen() {
  const { surah: surahParam } = useLocalSearchParams();
  const surahId = Number(surahParam);
  const router = useRouter();
  const { COLORS, isDark } = useAppTheme();
  const { toggleBookmark, isBookmarked } = useBookmarks();

  // Synchronous — no loading flash. getQuranData() is cached after first call.
  const surahData = useMemo(
    () => getQuranData().find((s) => s.id === surahId) ?? null,
    [surahId]
  );

  const [search, setSearch] = useState('');
  const [currentGid, setCurrentGid] = useState(null);
  const [audioState, setAudioState] = useState('idle');
  const [autoPlay, setAutoPlay] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [cacheCount, setCacheCount] = useState({ cached: 0, total: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState({ done: 0, total: 0 });

  const soundRef          = useRef(null);
  const loadGenRef        = useRef(0);
  const autoPlayRef       = useRef(false);
  const audioModRef       = useRef(null);
  const downloadCancelRef = useRef(false);
  const toastRef          = useRef(null);

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // Check cache status in background — doesn't block rendering
  useEffect(() => {
    if (surahData) {
      getSurahCacheStatus(surahData.verses).then(setCacheCount);
    }
  }, [surahData]);

  // Cleanup on unmount — stop any playing audio
  useEffect(() => {
    return () => { _destroySound(); };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function _destroySound() {
    if (soundRef.current) {
      try { soundRef.current.remove(); } catch (_) {}
      soundRef.current = null;
    }
  }

  async function _getAudioModule() {
    if (!audioModRef.current) {
      audioModRef.current = await import('expo-audio');
    }
    return audioModRef.current;
  }

  // ── Core playback ─────────────────────────────────────────────────────────────

  async function playGid(gid) {
    // Claim this generation — any concurrent/previous call will see a different number
    const myGen = ++loadGenRef.current;

    // SYNCHRONOUSLY stop any existing player before any await
    _destroySound();

    setCurrentGid(gid);
    setAudioState('loading');
    setProgress({ current: 0, total: 0 });

    try {
      const { createAudioPlayer, setAudioModeAsync } = await _getAudioModule();
      if (myGen !== loadGenRef.current) return; // superseded while importing

      await setAudioModeAsync({ playsInSilentMode: true });
      if (myGen !== loadGenRef.current) return;

      // Resolve from cache; download if needed (requires internet)
      let uri;
      try {
        uri = await getOrDownloadVerse(gid);
      } catch {
        if (myGen !== loadGenRef.current) return;
        const net = await NetInfo.fetch();
        const msg = net.isConnected
          ? 'Failed to load audio. Please try again.'
          : 'No internet connection. Download the surah first to play offline.';
        toastRef.current?.show(msg, 'error', 4000);
        setAudioState('idle');
        setCurrentGid(null);
        return;
      }
      if (myGen !== loadGenRef.current) return;

      const player = createAudioPlayer(uri);

      // Final check before we commit — another call might have fired while we created the player
      if (myGen !== loadGenRef.current) {
        try { player.remove(); } catch (_) {}
        return;
      }

      soundRef.current = player;

      let finishHandled = false; // guard against didJustFinish firing more than once

      player.addListener('playbackStatusUpdate', (status) => {
        // Ignore events from stale players
        if (myGen !== loadGenRef.current) return;

        if (status.isLoaded) {
          if (status.playing) setAudioState('playing');

          if ((status.currentTime ?? 0) > 0 || (status.duration ?? 0) > 0) {
            setProgress({ current: status.currentTime ?? 0, total: status.duration ?? 0 });
          }

          if (status.didJustFinish && !finishHandled) {
            finishHandled = true;
            setAudioState('idle');
            setProgress({ current: 0, total: 0 });

            if (autoPlayRef.current) {
              // Use `gid` from the closure — it's the verse that just finished
              const allVerses = getQuranData().find((s) => s.id === surahId)?.verses || [];
              const nextVerse = allVerses[allVerses.findIndex((v) => v.gid === gid) + 1];

              if (nextVerse) {
                // Small gap between verses, then check we're still the active generation
                setTimeout(() => {
                  if (myGen === loadGenRef.current) {
                    playGid(nextVerse.gid);
                  }
                }, 500);
              } else {
                // End of surah
                setCurrentGid(null);
              }
            } else {
              setCurrentGid(null);
            }
          }
        }
      });

      player.play();
    } catch (err) {
      if (myGen !== loadGenRef.current) return;
      console.warn('[QuranReader] Audio error:', err);
      setAudioState('idle');
      setCurrentGid(null);
    }
  }

  // ── Public controls ───────────────────────────────────────────────────────────

  // Per-verse play button: toggle if same verse, start fresh otherwise
  function handlePlay(gid) {
    if (gid === currentGid && soundRef.current) {
      if (audioState === 'playing') {
        soundRef.current.pause();
        setAudioState('paused');
      } else {
        soundRef.current.play();
        setAudioState('playing');
      }
      return;
    }
    playGid(gid);
  }

  // Bottom player play/pause button
  function handlePlayPause() {
    if (!soundRef.current) return;
    if (audioState === 'playing') {
      soundRef.current.pause();
      setAudioState('paused');
    } else {
      soundRef.current.play();
      setAudioState('playing');
    }
  }

  function handleStop() {
    loadGenRef.current++;
    _destroySound();
    setCurrentGid(null);
    setAudioState('idle');
    setProgress({ current: 0, total: 0 });
  }

  async function handleDownloadSurah() {
    if (!surahData || isDownloading) return;
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      toastRef.current?.show('No internet connection. Connect to Wi-Fi or mobile data to download audio.', 'error', 4000);
      return;
    }
    setIsDownloading(true);
    downloadCancelRef.current = false;
    setDlProgress({ done: 0, total: surahData.verses.length });
    try {
      await downloadSurah(
        surahData.verses,
        (done, total) => setDlProgress({ done, total }),
        downloadCancelRef
      );
      setCacheCount({ cached: surahData.verses.length, total: surahData.verses.length });
      toastRef.current?.show('Surah downloaded for offline playback.', 'success');
    } catch {
      toastRef.current?.show('Download failed. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  }

  const filteredVerses = useMemo(() => {
    if (!surahData) return [];
    if (!search.trim()) return surahData.verses;
    const q = search.toLowerCase();
    return surahData.verses.filter((v) => v.en?.toLowerCase().includes(q) || String(v.id).includes(q));
  }, [surahData, search]);

  const currentVerseIdx = useMemo(
    () => surahData?.verses.findIndex((v) => v.gid === currentGid) ?? -1,
    [currentGid, surahData]
  );

  const currentVerse = surahData?.verses[currentVerseIdx];

  function handlePrev() {
    if (!surahData || currentVerseIdx <= 0) return;
    playGid(surahData.verses[currentVerseIdx - 1].gid);
  }

  function handleNext() {
    if (!surahData || currentVerseIdx < 0 || currentVerseIdx >= surahData.verses.length - 1) return;
    playGid(surahData.verses[currentVerseIdx + 1].gid);
  }

  const playerVisible = currentGid !== null;
  const PLAYER_HEIGHT = Platform.OS === 'ios' ? 140 : 120;

  // ─── Error / loading states ────────────────────────────────────────────────
  if (!surahData) {
    const data = getQuranData();
    if (data.length === 0) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <BackgroundEffect />
          <Feather name="book-open" size={48} color={COLORS.gold} style={{ marginBottom: 20, opacity: 0.6 }} />
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 }}>
            Quran data not found
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            Run the following command once to bundle the Quran text:
          </Text>
          <View style={{ backgroundColor: isDark ? '#0D0D14' : '#F0EDE5', borderRadius: 10, padding: 16, width: '100%' }}>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: COLORS.gold }}>
              node scripts/download-quran.js
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 32, padding: 14 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textSecondary }}>← Go back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  const typeLabel = surahData.type === 'Meccan' ? 'Makkī' : 'Madanī';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <BackgroundEffect />

      {/* ── Header ── */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 14, paddingHorizontal: 20,
        borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        flexDirection: 'row', alignItems: 'center', gap: 14,
      }}>
        <TouchableOpacity onPress={() => { handleStop(); router.back(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, lineHeight: 26 }}>
            {surahData.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 3, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: COLORS.gold }}>{surahData.nameAr}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>
              · {surahData.count} verses · {typeLabel}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* Download / Cache status */}
          {isDownloading ? (
            <TouchableOpacity
              onPress={() => { downloadCancelRef.current = true; setIsDownloading(false); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20,
                borderWidth: 1, borderColor: isDark ? 'rgba(201,168,76,0.3)' : 'rgba(166,131,38,0.25)',
                backgroundColor: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(166,131,38,0.06)',
              }}
            >
              <ActivityIndicator size="small" color={COLORS.gold} style={{ width: 12, height: 12 }} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.gold }}>
                {dlProgress.done}/{dlProgress.total}
              </Text>
            </TouchableOpacity>
          ) : cacheCount.cached === cacheCount.total && cacheCount.total > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
              <Feather name="check-circle" size={13} color={COLORS.gold} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.gold }}>Cached</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleDownloadSurah}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20,
                borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <Feather name="download" size={12} color={COLORS.textSecondary} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.textSecondary }}>
                {cacheCount.cached > 0 ? `${cacheCount.cached}/${cacheCount.total}` : 'Download'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Play all */}
          <TouchableOpacity
            onPress={() => playGid(surahData.verses[0]?.gid)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
              borderWidth: 1, borderColor: isDark ? 'rgba(201,168,76,0.3)' : 'rgba(166,131,38,0.25)',
              backgroundColor: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(166,131,38,0.06)',
            }}
          >
            <Feather name="play" size={12} color={COLORS.gold} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.gold }}>Play all</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bismillah banner — shown for surahs 2–114 except 9.
          Surah 1's verse 1 IS the Bismillah so it shows in the verse list instead. */}
      {surahData.id !== 9 && surahData.id !== 1 && (
        <View style={{ paddingVertical: 20, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 28, color: COLORS.gold, textAlign: 'center' }}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={{
        marginHorizontal: 16, marginTop: 14, marginBottom: 4,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        borderRadius: 12, borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8,
      }}>
        <Feather name="search" size={14} color={COLORS.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search translation..."
          placeholderTextColor={COLORS.textTertiary}
          style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textPrimary }}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={13} color={COLORS.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {search ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginLeft: 20, marginTop: 6, marginBottom: 2 }}>
          {filteredVerses.length} {filteredVerses.length === 1 ? 'verse' : 'verses'} found
        </Text>
      ) : null}

      {/* Verse list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: playerVisible ? PLAYER_HEIGHT + 20 : 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filteredVerses.map((verse) => (
          <VerseCard
            key={verse.id}
            verse={verse}
            surahId={surahId}
            surahName={surahData.name}
            isBookmarked={isBookmarked(surahId, verse.id)}
            toggleBookmark={toggleBookmark}
            onPlay={handlePlay}
            isPlaying={currentGid === verse.gid && audioState === 'playing'}
            isLoading={currentGid === verse.gid && audioState === 'loading'}
            COLORS={COLORS}
            isDark={isDark}
          />
        ))}
      </ScrollView>

      {/* ── Bottom Player ── */}
      <BottomPlayer
        visible={playerVisible}
        surahName={surahData.name}
        verseNumber={currentVerse?.id ?? '—'}
        totalVerses={surahData.count}
        audioState={audioState}
        autoPlay={autoPlay}
        progress={progress}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onPrev={handlePrev}
        onNext={handleNext}
        onAutoPlayToggle={() => setAutoPlay((p) => !p)}
        COLORS={COLORS}
        isDark={isDark}
      />

      <Toast ref={toastRef} />
    </View>
  );
}
