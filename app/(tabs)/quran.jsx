import { getLocalDateString } from '../../lib/dateUtils';
import { preloadQuranData } from '../../lib/quranData';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, RefreshControl, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../../components/theme';
import BackgroundEffect from '../../components/BackgroundEffect';
import { useQuran } from '../../hooks/useQuran';

const TABS = [
  { key: 'pages', label: 'Pages' },
  { key: 'surahs', label: 'Surahs' },
  { key: 'juz', label: 'Juz' },
  { key: 'goal', label: 'Goal' },
];

const DAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TOTAL_PAGES = 604;
const FALLBACK_TARGET = new Date('2027-03-09');

function targetDateFromSettings(settings) {
  if (settings?.target_date) {
    const d = new Date(settings.target_date + 'T00:00:00');
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }
  return FALLBACK_TARGET;
}

// ─── Circular progress ring ───────────────────────────────────────────────────
function CircularRing({ pct, size = 104 }) {
  const { COLORS, isDark } = useAppTheme();
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(pct / 100, 1);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={isDark ? '#1C1C28' : 'rgba(0,0,0,0.05)'} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={COLORS.gold} strokeWidth={stroke} fill="none"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 22, color: COLORS.textPrimary, lineHeight: 26 }}>{pct}%</Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary }}>done</Text>
    </View>
  );
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────
function WeeklyChart({ logs, dailyGoal }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const today = getLocalDateString();
  const MAX_H = 64;

  const bars = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = getLocalDateString(d);
    const pages = logs.find((l) => l.date === dateStr)?.value || 0;
    return { day: DAY_ABBR[d.getDay()], pages, isToday: dateStr === today, metGoal: pages >= dailyGoal };
  }), [logs, dailyGoal, today]);

  const maxPages = Math.max(...bars.map((b) => b.pages), dailyGoal, 1);

  return (
    <View style={[CARD_STYLE, { padding: 16 }]}>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1.2, marginBottom: 18 }}>
        THIS WEEK
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: MAX_H + 22 }}>
        {bars.map((b, idx) => {
          const barH = b.pages > 0 ? Math.max(10, (b.pages / maxPages) * MAX_H) : 7;
          const barColor = b.isToday ? COLORS.gold
            : b.pages > 0 ? (b.metGoal ? COLORS.success : (isDark ? '#3A2C12' : '#F2E8D5'))
            : (isDark ? '#1C1C28' : '#EAE6DF');
          return (
            <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
              {b.pages > 0 && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: b.isToday ? COLORS.gold : COLORS.textTertiary, marginBottom: 3 }}>
                  {b.pages}
                </Text>
              )}
              <View style={{ width: 30, height: barH, backgroundColor: barColor, borderRadius: 5 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 7, color: b.isToday ? COLORS.gold : COLORS.textTertiary }}>
                {b.day}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 14 }}>
        {[
          { color: COLORS.gold, label: 'Today' },
          { color: COLORS.success, label: 'Met goal' },
          { color: isDark ? '#3A2C12' : '#F2E8D5', label: 'Below goal' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Pages tab ────────────────────────────────────────────────────────────────
function PagesTab({ data }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const { logs, settings, todayLog, totalPages, streak, logPages } = data;
  const [inputPages, setInputPages] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedState, setSavedState] = useState(false);

  useEffect(() => {
    if (todayLog?.value !== undefined) {
      setTimeout(() => setInputPages(todayLog.value), 0);
    }
  }, [todayLog?.value]);

  const dailyGoal = settings?.daily_goal || 5;
  const targetDate = targetDateFromSettings(settings);
  const pct = Math.min(100, Math.round((totalPages / TOTAL_PAGES) * 100));
  const pagesLeft = Math.max(0, TOTAL_PAGES - totalPages);
  const daysLeft = Math.max(1, Math.ceil((targetDate - new Date()) / 86400000));
  const pagesPerDay = Math.ceil(pagesLeft / daysLeft);
  const isOnTrack = pagesPerDay <= dailyGoal;

  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return getLocalDateString(d); })();
  const thisWeekPages = logs.filter((l) => l.date >= weekStart).reduce((s, l) => s + (l.value || 0), 0);
  const daysIntoWeek = Math.max(1, new Date().getDay() || 7);
  const diff = thisWeekPages - dailyGoal * daysIntoWeek;

  const targetLabel = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  async function handleSave() {
    if (inputPages <= 0 || saving) return;
    setSaving(true);
    await logPages(inputPages);
    setSaving(false);
    setSavedState(true);
    setTimeout(() => setSavedState(false), 2000);
  }

  return (
    <>
      {/* ── Overall Progress ── */}
      <View style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 14 }]}>
        <CircularRing pct={pct} />
        <View style={{ flex: 1, marginLeft: 18 }}>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 20, color: COLORS.textPrimary }}>
            Quran Progress
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 6 }}>
            {'Pages read: '}
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.gold }}>{totalPages}</Text>
            {' / '}{TOTAL_PAGES}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, marginTop: 4 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary }}>You haven{"'"}t</Text> set a daily goal yet. Start with just 1 page a day to build the habit!
          </Text>
          {streak > 0 ? (
            <View style={{
              marginTop: 9, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
              backgroundColor: isDark ? 'rgba(61,168,118,0.12)' : 'rgba(39,122,80,0.1)',
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
              borderWidth: 1, borderColor: isDark ? 'rgba(61,168,118,0.25)' : 'rgba(39,122,80,0.2)', gap: 5,
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success }} />
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: COLORS.success }}>
                {streak} day streak
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Log Today's Reading ── */}
      <View style={[CARD_STYLE, { padding: 16, marginBottom: 14, borderColor: isDark ? 'rgba(201,168,76,0.25)' : 'rgba(166,131,38,0.2)' }]}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.gold, letterSpacing: 1.5, marginBottom: 16 }}>
          LOG TODAY'S READING
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setInputPages((p) => Math.max(0, p - 1))}
            style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: isDark ? '#1A1A24' : '#F7F4EB', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 24, color: COLORS.textPrimary, lineHeight: 28 }}>−</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', minWidth: 60 }}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 56, color: COLORS.textPrimary, lineHeight: 62 }}>
              {inputPages}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary }}>pages</Text>
          </View>

          <TouchableOpacity
            onPress={() => setInputPages((p) => Math.min(604, p + 1))}
            style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: isDark ? 'rgba(201,168,76,0.12)' : 'rgba(166,131,38,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.gold }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 24, color: COLORS.gold, lineHeight: 28 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Quick +5 / +10 buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {[5, 10, 20].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setInputPages((p) => Math.min(604, p + n))}
              style={{ flex: 1, borderRadius: 8, borderWidth: 0.5, borderColor: COLORS.border, paddingVertical: 7, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary }}>+{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || inputPages <= 0}
          style={{
            borderRadius: 12, paddingVertical: 14, alignItems: 'center',
            backgroundColor: savedState ? COLORS.success : inputPages > 0 ? COLORS.gold : (isDark ? '#1A1A24' : '#F7F4EB'),
            borderWidth: inputPages > 0 ? 0 : 0.5, borderColor: COLORS.border,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: savedState ? '#fff' : inputPages > 0 ? '#000' : COLORS.textTertiary }}>
              {savedState ? '✓ Saved!' : `Save · ${inputPages} pages today`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Mizan Insight ── */}
      <View style={[CARD_STYLE, { padding: 16, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: COLORS.gold }]}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.gold, letterSpacing: 1.5, marginBottom: 10 }}>
          ✦ MIZAN INSIGHT
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 }}>
          {diff >= 0 ? (
            <>
              {"You're "}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary }}>{diff} pages ahead of pace </Text>
              {"this week — keep it up to finish before "}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary }}>{targetLabel}.</Text>
            </>
          ) : (
            <>
              {"You're "}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary }}>{Math.abs(diff)} pages behind pace </Text>
              {"this week. Read "}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.textPrimary }}>
                {Math.ceil(Math.abs(diff) / Math.max(1, 7 - daysIntoWeek))} extra pages/day
              </Text>
              {" to catch up."}
            </>
          )}
        </Text>
      </View>

      {/* ── Weekly Chart ── */}
      <View style={{ marginBottom: 14 }}>
        <WeeklyChart logs={logs} dailyGoal={dailyGoal} />
      </View>

      {/* ── Target Goal ── */}
      <View style={[CARD_STYLE, { padding: 16, marginBottom: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: COLORS.textPrimary }}>
            Target: {targetLabel}
          </Text>
          <View style={{
            backgroundColor: isOnTrack ? (isDark ? 'rgba(61,168,118,0.12)' : 'rgba(39,122,80,0.1)') : (isDark ? 'rgba(139,58,58,0.15)' : 'rgba(163,54,54,0.1)'),
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
            borderWidth: 1, borderColor: isOnTrack ? (isDark ? 'rgba(61,168,118,0.25)' : 'rgba(39,122,80,0.2)') : (isDark ? 'rgba(139,58,58,0.3)' : 'rgba(163,54,54,0.2)'),
          }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: isOnTrack ? COLORS.success : COLORS.danger }}>
              {isOnTrack ? 'On track ✓' : 'Behind pace'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          {[
            { value: pagesLeft, label: 'pages left' },
            { value: daysLeft, label: 'days left' },
            { value: pagesPerDay, label: 'pages/day needed' },
          ].map(({ value, label }) => (
            <View key={label}>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 34, color: COLORS.gold, lineHeight: 40 }}>{value}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 5, backgroundColor: isDark ? '#1C1C28' : 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 5, width: `${pct}%`, backgroundColor: COLORS.success, borderRadius: 3 }} />
        </View>
      </View>
    </>
  );
}

// ─── Surahs tab ───────────────────────────────────────────────────────────────
function SurahsTab({ data }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const { allSurahs, surahs, toggleSurah } = data;
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const completedNums = useMemo(
    () => new Set(surahs.filter((s) => s.completed).map((s) => s.surah_number)),
    [surahs]
  );

  const displayed = useMemo(() => {
    let list = allSurahs;
    if (filter === 'done') list = list.filter((s) => completedNums.has(s.number));
    if (filter === 'left') list = list.filter((s) => !completedNums.has(s.number));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.englishName?.toLowerCase().includes(q) ||
        s.name?.includes(search) ||
        String(s.number) === q
      );
    }
    return list;
  }, [allSurahs, filter, completedNums, search]);

  return (
    <>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.gold }}>{completedNums.size}</Text>
          {' / 114 surahs completed'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {['all', 'done', 'left'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                backgroundColor: filter === f ? (isDark ? '#1C1C28' : '#EAE6DF') : 'transparent',
                borderWidth: 0.5, borderColor: filter === f ? COLORS.border : (isDark ? 'rgba(201,168,76,0.1)' : 'rgba(0,0,0,0.05)'),
              }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: filter === f ? COLORS.textPrimary : COLORS.textTertiary }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 14 }]}>
        <Feather name="search" size={15} color={COLORS.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search surah name or number..."
          placeholderTextColor={COLORS.textTertiary}
          style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textPrimary }}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={14} color={COLORS.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {allSurahs.length === 0 ? (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.gold} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, marginTop: 12 }}>
            Loading surah list...
          </Text>
        </View>
      ) : displayed.length === 0 ? (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary }}>No surahs found.</Text>
        </View>
      ) : displayed.map((surah) => {
        const done = completedNums.has(surah.number);
        return (
          <View
            key={surah.number}
            style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8 }]}
          >
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, width: 28 }}>
              {surah.number}
            </Text>

            {/* Name — tapping opens reader */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push(`/quran/${surah.number}`)}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: COLORS.textPrimary }}>{surah.englishName}</Text>
              <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 13, color: COLORS.gold, marginTop: 2 }}>{surah.name}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 1 }}>
                {surah.numberOfAyahs} verses · tap to read
              </Text>
            </TouchableOpacity>

            {/* Mark complete toggle */}
            <TouchableOpacity
              onPress={() => toggleSurah(surah.number)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: done ? COLORS.success : 'transparent',
                borderWidth: done ? 0 : 1.5, borderColor: COLORS.textTertiary,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {done ? <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' }}>✓</Text> : null}
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </>
  );
}

// ─── Juz tab ──────────────────────────────────────────────────────────────────
function JuzTab({ data }) {
  const { COLORS, CARD_STYLE } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { surahs, toggleSurah } = data;

  // Exact equal-width cards: screen - 2×side padding - 2×gaps between 3 columns
  const SIDE_PAD = 16;
  const GAP = 10;
  const COLS = 3;
  const cardWidth = (screenWidth - SIDE_PAD * 2 - GAP * (COLS - 1)) / COLS;

  const completedJuz = useMemo(
    () => new Set(surahs.filter((s) => s.completed && s.surah_number > 200).map((s) => s.surah_number - 200)),
    [surahs]
  );

  // Build rows of 3
  const rows = useMemo(() => {
    const all = Array.from({ length: 30 }, (_, i) => i + 1);
    const result = [];
    for (let i = 0; i < all.length; i += COLS) result.push(all.slice(i, i + COLS));
    return result;
  }, []);

  return (
    <>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: COLORS.gold }}>{completedJuz.size}</Text>
          {' / 30 juz completed'}
        </Text>
      </View>
      <View style={{ gap: GAP }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: GAP }}>
            {row.map((juz) => {
              const done = completedJuz.has(juz);
              return (
                <TouchableOpacity
                  key={juz}
                  onPress={() => toggleSurah(juz + 200)}
                  style={[CARD_STYLE, {
                    width: cardWidth, paddingVertical: 18, alignItems: 'center',
                    borderColor: done ? COLORS.gold : COLORS.border,
                  }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: done ? COLORS.gold : COLORS.textSecondary }}>
                    {juz}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary, marginTop: 2 }}>Juz</Text>
                  {done ? <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 2 }}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </>
  );
}

// ─── Goal tab ─────────────────────────────────────────────────────────────────
function GoalTab({ settings, updateSettings }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const [goal, setGoal] = useState(String(settings?.daily_goal || 5));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const method = settings?.method || 'page';
  const unit = method === 'surah' ? 'surahs' : method === 'juz' ? 'juz' : 'pages';
  const methodLabel = { page: 'By Page', surah: 'By Surah', juz: 'By Juz (Para)' }[method];

  function pickMethod() {
    const opts = [
      { key: 'page', label: 'By Page  (most common)' },
      { key: 'surah', label: 'By Surah' },
      { key: 'juz', label: 'By Juz (Para)' },
    ];
    Alert.alert('Tracking Method', 'How do you want to track Quran reading?', [
      ...opts.map((o) => ({
        text: (method === o.key ? '✓ ' : '') + o.label,
        onPress: () => updateSettings({ method: o.key }),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function pickTargetDate() {
    const now = new Date();
    const add = (months) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() + months);
      return d.toISOString().split('T')[0];
    };
    const presets = [
      { label: 'Ramadan 2026 (Feb 18)', value: '2026-02-18' },
      { label: 'Ramadan 2027 (Mar 9)', value: '2027-03-09' },
      { label: '6 months from now', value: add(6) },
      { label: '1 year from now', value: add(12) },
      { label: 'No target', value: null },
    ];
    Alert.alert('Target Finish Date', 'When do you want to complete the Quran?', [
      ...presets.map((p) => ({
        text: (settings?.target_date === p.value ? '✓ ' : '') + p.label,
        onPress: () => updateSettings({ target_date: p.value }),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function save() {
    const val = parseInt(goal, 10);
    if (!val || val <= 0) {
      Alert.alert('Invalid', 'Please enter a number greater than 0.');
      return;
    }
    setSaving(true);
    await updateSettings({ daily_goal: val });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const targetDate = settings?.target_date
    ? new Date(settings.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not set';

  return (
    <View style={{ gap: 12 }}>
      {/* Tracking Method */}
      <TouchableOpacity
        style={[CARD_STYLE, { padding: 16, flexDirection: 'row', alignItems: 'center' }]}
        onPress={pickMethod}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1, marginBottom: 6 }}>
            TRACKING METHOD
          </Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: COLORS.textPrimary }}>{methodLabel}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
            Tap to change how you log progress
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={COLORS.textTertiary} />
      </TouchableOpacity>

      {/* Daily Goal */}
      <View style={[CARD_STYLE, { padding: 16 }]}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1, marginBottom: 16 }}>
          DAILY GOAL
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={save}
            style={{
              flex: 1, backgroundColor: isDark ? '#1A1A24' : '#F7F4EB', borderRadius: 10,
              padding: 14, color: COLORS.textPrimary, fontFamily: 'CormorantGaramond_600SemiBold',
              fontSize: 28, borderWidth: 0.5, borderColor: COLORS.border, textAlign: 'center',
            }}
          />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary }}>{unit} / day</Text>
        </View>
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={{
            borderRadius: 12, paddingVertical: 14, alignItems: 'center',
            backgroundColor: saved ? COLORS.success : COLORS.gold,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: saved ? '#fff' : '#000' }}>
              {saved ? '✓ Saved' : 'Save Goal'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Target Finish Date */}
      <TouchableOpacity
        style={[CARD_STYLE, { padding: 16, flexDirection: 'row', alignItems: 'center' }]}
        onPress={pickTargetDate}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1, marginBottom: 6 }}>
            TARGET FINISH DATE
          </Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: settings?.target_date ? COLORS.textPrimary : COLORS.textTertiary }}>
            {targetDate}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
            Used to calculate daily pages needed
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={COLORS.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
// Pre-warm the Quran JSON while the tab is loading, before the user taps a surah
preloadQuranData();

export default function QuranScreen() {
  const { COLORS, isDark } = useAppTheme();
  const quranData = useQuran();
  const { settings, loading, reload } = quranData;
  const [activeTab, setActiveTab] = useState('pages');
  const [refreshing, setRefreshing] = useState(false);

  // Sync default tab to the user's chosen tracking method
  const methodTabMap = { page: 'pages', surah: 'surahs', juz: 'juz' };
  useEffect(() => {
    if (settings?.method) {
      setTimeout(() => setActiveTab(methodTabMap[settings.method] || 'pages'), 0);
    }
  }, [settings?.method, methodTabMap]);

  // Reload when tab is focused
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const method = settings?.method || 'page';
  const methodLabel = { page: 'by page', surah: 'by surah', juz: 'by juz' }[method];
  const targetDate = targetDateFromSettings(settings);
  const targetLabel = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <BackgroundEffect />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 32, color: COLORS.textPrimary }}>
          Quran
        </Text>
        <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 20, color: COLORS.gold }}>القرآن الكريم</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
          {loading ? 'Loading...' : `Tracking ${methodLabel} · Finish by ${targetLabel}`}
        </Text>
      </View>

      {/* Tab bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: isDark ? '#0D0D14' : '#F7F4EB',
          borderRadius: 13, padding: 3,
          borderWidth: 0.5, borderColor: COLORS.border,
        }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 10,
                backgroundColor: activeTab === tab.key ? (isDark ? '#1A1A24' : '#EAE6DF') : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: activeTab === tab.key ? COLORS.textPrimary : COLORS.textTertiary }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        {loading && !quranData.logs.length ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, marginTop: 12 }}>
              Loading your Quran data...
            </Text>
          </View>
        ) : activeTab === 'pages' ? (
          <PagesTab data={quranData} />
        ) : activeTab === 'surahs' ? (
          <SurahsTab data={quranData} />
        ) : activeTab === 'juz' ? (
          <JuzTab data={quranData} />
        ) : (
          <GoalTab settings={settings} updateSettings={quranData.updateSettings} />
        )}
      </ScrollView>
    </View>
  );
}
