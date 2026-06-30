import { getLocalDateString } from '../../lib/dateUtils';
import { useState, useCallback } from 'react';
import { useTranslation } from '../../lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { PrayerRug01Icon, Quran01Icon, DuaIcon, YoutubeIcon, RamadhanMonthIcon, AllahIcon, Task01Icon, Kaaba01Icon, Moon01Icon } from '@hugeicons/core-free-icons';
import { supabase } from '../../lib/supabaseClient';
import { getHabits, getHabitLogs, toggleHabitLog, getQuranSettings, getQuranLog, getQuranSurahs } from '../../lib/localDb';
import { useAppTheme } from '../../components/theme';
import BackgroundEffect from '../../components/BackgroundEffect';
import PrayerTimeCard from '../../components/PrayerTimeCard';
import AIInsightCard from '../../components/AIInsightCard';
import HadithCard from '../../components/HadithCard';
import { useLocation } from '../../hooks/useLocation';
import { usePrayerTimes } from '../../hooks/usePrayerTimes';
import { useGemini } from '../../hooks/useGemini';
import { fetchHijriDate } from '../../lib/aladhanClient';
import { SEED_HADITHS } from '../../lib/seedHadiths';
import { useUpcomingEvent } from '../../hooks/useUpcomingEvent';
import DailyDuaCard from '../../components/DailyDuaCard';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}



const QUICK_ACTIONS = [
  { label: 'Log Prayer',   route: '/(tabs)/salah',            icon: 'PrayerRug01Icon', lib: 'huge', section: null },
  { label: 'Log Quran',    route: '/(tabs)/quran',            icon: 'Quran01Icon',     lib: 'huge', section: null },
  { label: 'Log Habit',    route: '/(tabs)/habits',           icon: 'Task01Icon',      lib: 'huge', section: null },
  { label: 'Duas',         route: '/(tabs)/more',             icon: 'DuaIcon',         lib: 'huge', section: 'Duas' },
  { label: 'Tasbih',       route: '/(tabs)/more',             icon: 'Kaaba01Icon',     lib: 'huge', section: 'Tasbih' },
  { label: 'Asma ul Husna',route: '/(tabs)/more',             icon: 'AllahIcon',       lib: 'huge', section: 'AsmaulHusna' },
  { label: 'Calendar',     route: '/(tabs)/more',             icon: 'calendar',        lib: 'feather', section: 'Calendar' },
  { label: 'Learning',     route: '/(tabs)/learning',         icon: 'YoutubeIcon',     lib: 'huge', section: null },
];

export default function DashboardScreen() {
  const { t, locale } = useTranslation();
  const isUrdu = locale === 'ur';
  const router = useRouter();
  const { location } = useLocation();
  const { event: upcomingEvent, loading: eventLoading } = useUpcomingEvent();
  const { times, nextPrayer, todayRecord, loading: pLoading, logPrayer } = usePrayerTimes(location);
  const { loadTodayInsight, dismissInsight, checkAndGenerateInsight } = useGemini();
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();

  const emptyBarColor = isDark ? '#1C1C28' : '#E6E2D8';
  const iconBgColor = isDark ? '#1A1A28' : '#EAE6DB';

  const [user, setUser] = useState(null);
  const [hijri, setHijri] = useState(null);
  const [insight, setInsight] = useState(null);
  const [dailyHadith, setDailyHadith] = useState(null);
  const [habits, setHabits] = useState([]);
  const [totalHabitsCount, setTotalHabitsCount] = useState(0);
  const [habitLogs, setHabitLogs] = useState([]);
  const [habitStreaks, setHabitStreaks] = useState({});
  const [playlists, setPlaylists] = useState([]);
  const [playlistProgress, setPlaylistProgress] = useState({});
  const [quranToday, setQuranToday] = useState(0);
  const [quranGoal, setQuranGoal] = useState(5);
  const [quranMethod, setQuranMethod] = useState('page');
  const [refreshing, setRefreshing] = useState(false);

  const today = getLocalDateString();

  async function loadAll() {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    await Promise.all([
      loadHijri(),
      loadInsight(),
      loadHadith(),
      loadHabits(),
      loadPlaylists(u?.id),
      loadQuranToday(),
    ]);
    if (u) checkAndGenerateInsight();
  }

  async function loadHijri() {
    try {
      const cachedStr = await AsyncStorage.getItem('@full_hijri_date');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        setHijri(cached.data);
      }
      const h = await fetchHijriDate();
      if (h) {
        setHijri(h);
        await AsyncStorage.setItem('@full_hijri_date', JSON.stringify({ gregorianDate: new Date().toDateString(), data: h }));
      }
    } catch (_) {}
  }

  async function loadInsight() {
    const i = await loadTodayInsight();
    setInsight(i);
  }

  async function loadHadith() {
    try {
      const idx = new Date().getDate() % SEED_HADITHS.length;
      setDailyHadith(SEED_HADITHS[idx]);
    } catch (_) {}
  }

  async function loadHabits() {
    const todayStr = getLocalDateString();
    const last30 = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      last30.push(getLocalDateString(d));
    }

    const [allHabits, todayLogs] = await Promise.all([
      getHabits(),
      getHabitLogs(todayStr),
    ]);

    const active = allHabits.filter(h => h.is_active);
    setTotalHabitsCount(active.length);
    const topHabits = active.slice(0, 3);
    setHabits(topHabits);
    setHabitLogs(todayLogs);

    const streaks = {};
    for (const habit of topHabits) {
      let streak = 0;
      for (const date of last30) {
        const dayLogs = await getHabitLogs(date);
        if (dayLogs.find(l => l.habit_id === habit.id && l.completed)) streak++;
        else break;
      }
      streaks[habit.id] = streak;
    }
    setHabitStreaks(streaks);
  }

  async function loadPlaylists(userId) {
    if (!userId) { setPlaylists([]); return; }
    const { data: pl } = await supabase.from('youtube_playlists').select('*').eq('user_id', userId).order('added_at', { ascending: false });
    if (!pl || !pl.length) {
      setPlaylists([]);
      return;
    }
    const { data: allProg } = await supabase.from('youtube_progress').select('playlist_id').eq('user_id', userId).eq('watched', true);
    
    const progMap = {};
    for (const p of allProg || []) {
      progMap[p.playlist_id] = (progMap[p.playlist_id] || 0) + 1;
    }
    
    let active = pl.find(p => (progMap[p.playlist_id] || 0) < p.total_videos) || pl[0];
    
    setPlaylists([active]);
    setPlaylistProgress({ [active.playlist_id]: progMap[active.playlist_id] || 0 });
  }

  async function loadQuranToday() {
    const todayStr = getLocalDateString();
    const [settings, logValue, surahMap] = await Promise.all([
      getQuranSettings(),
      getQuranLog(todayStr),
      getQuranSurahs(),
    ]);

    const surahRows = Object.entries(surahMap)
      .filter(([, completed]) => completed)
      .map(([num]) => ({ surah_number: parseInt(num, 10), completed: true }));

    const method = settings?.method || 'page';
    setQuranMethod(method);

    if (method === 'juz') {
      const completedJuz = (surahRows || []).filter((s) => s.surah_number > 200).length;
      setQuranToday(completedJuz);
      setQuranGoal(30);
    } else if (method === 'surah') {
      const completedSurahs = (surahRows || []).filter((s) => s.surah_number <= 114).length;
      setQuranToday(completedSurahs);
      setQuranGoal(114);
    } else {
      setQuranToday(logValue ?? 0);
      setQuranGoal(settings?.daily_goal || 5);
    }
  }

  async function toggleHabit(habitId) {
    const todayStr = getLocalDateString();
    const updated = await toggleHabitLog(habitId, todayStr);
    setHabitLogs(updated);
  }

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const prayedCount = todayRecord
    ? ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((p) => todayRecord[p]).length
    : 0;
  const habitsDone = habitLogs.filter((l) => l.completed).length;
  
  const firstPlaylist = playlists[0];
  const watchedVideos = firstPlaylist ? (playlistProgress[firstPlaylist.playlist_id] || 0) : 0;
  const playlistPct = firstPlaylist && firstPlaylist.total_videos > 0
    ? Math.round((watchedVideos / firstPlaylist.total_videos) * 100)
    : 0;
  const quranPct = quranGoal > 0 ? Math.min(100, Math.round((quranToday / quranGoal) * 100)) : 0;
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const isRamadan = hijri && parseInt(hijri.month?.number, 10) === 9;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <BackgroundEffect />
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : 'Amiri_400Regular', fontSize: 14, color: COLORS.gold }}>
              {isRamadan ? t('dashboard.ramadan_greeting') : t('dashboard.greeting')}
            </Text>
            <Text style={{ fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary, marginTop: 2 }}>
              {getGreeting()}, {displayName}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 4 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {hijri ? ` · ${hijri.day} ${hijri.month?.en} ${hijri.year}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: iconBgColor, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
          >
            <Feather name="bell" size={20} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {/* ── Next Prayer ── */}
        {!pLoading && <PrayerTimeCard nextPrayer={nextPrayer} prayedCount={prayedCount} />}

        {/* ── Today's Prayers Quick Log ── */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1.2 }}>{t('dashboard.todays_prayers').toUpperCase()}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>{t('dashboard.tap_to_log')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => {
              const prayed = !!todayRecord?.[prayer.toLowerCase()];
              const isNext = nextPrayer?.name === prayer && nextPrayer?.date?.getDate() === new Date().getDate();
              
              let isFuture = false;
              if (times && times[prayer]) {
                const [h, m] = times[prayer].split(':').map(Number);
                const prayerDate = new Date();
                prayerDate.setHours(h, m, 0, 0);
                isFuture = prayerDate > new Date();
              }
              
              const disabled = isFuture && !prayed;

              return (
                <TouchableOpacity
                  key={prayer}
                  onPress={() => logPrayer(prayer, !prayed, 'home')}
                  disabled={disabled}
                  style={{ alignItems: 'center', opacity: disabled && !isNext ? 0.4 : 1 }}
                >
                  <View style={{
                    width: 54, height: 54, borderRadius: 27,
                    backgroundColor: prayed ? COLORS.gold : 'transparent',
                    borderWidth: 1.5,
                    borderColor: prayed ? COLORS.gold : (isNext ? COLORS.gold : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')),
                    alignItems: 'center', justifyContent: 'center', marginBottom: 8
                  }}>
                    {prayed ? (
                      <Feather name="check" size={24} color="#1A1814" />
                    ) : (
                      <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: isNext ? COLORS.gold : COLORS.textTertiary }}>
                        {times?.[prayer] || '--:--'}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isNext ? COLORS.gold : COLORS.textSecondary }}>
                    {prayer}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <View style={[CARD_STYLE, { flex: 1, padding: 16, marginEnd: 6, borderRadius: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Feather name="book" size={14} color={COLORS.gold} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1.2, marginLeft: 8 }}>{t('nav.quran').toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 28, color: COLORS.textPrimary }}>{quranToday}</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textTertiary, marginLeft: 6 }}>
                {`/ ${quranGoal} ${quranMethod === 'juz' ? 'juz' : quranMethod === 'surah' ? 'surahs' : 'pages'}`}
              </Text>
            </View>
            <View style={{ height: 3, backgroundColor: emptyBarColor, borderRadius: 2, marginTop: 14 }}>
              <View style={{ height: 3, width: `${quranPct}%`, backgroundColor: COLORS.gold, borderRadius: 2 }} />
            </View>
          </View>

          <View style={[CARD_STYLE, { flex: 1, padding: 16, marginStart: 6, borderRadius: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Feather name="activity" size={14} color={COLORS.gold} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1.2, marginLeft: 8 }}>{t('nav.habits').toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 28, color: COLORS.textPrimary }}>{habitsDone}</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textTertiary, marginLeft: 6 }}>/ {totalHabitsCount} done</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 14 }}>
              {Array.from({ length: Math.max(5, totalHabitsCount) }).map((_, i) => (
                <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < habitsDone ? COLORS.gold : emptyBarColor }} />
              ))}
            </View>
          </View>
        </View>

        {/* ── Daily Dua ── */}
        <DailyDuaCard />

        {/* ── Upcoming Event ── */}
        {upcomingEvent && !eventLoading && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1.2, marginBottom: 12 }}>
              {t('dashboard.upcoming_event')}
            </Text>
            <View style={[CARD_STYLE, { padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: iconBgColor, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                {upcomingEvent.icon === 'RamadhanMonthIcon' ? (
                  <HugeiconsIcon icon={RamadhanMonthIcon} size={24} color={COLORS.gold} />
                ) : upcomingEvent.icon === 'Quran01Icon' ? (
                  <HugeiconsIcon icon={Quran01Icon} size={24} color={COLORS.gold} />
                ) : (
                  <HugeiconsIcon icon={Moon01Icon} size={24} color={COLORS.gold} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : 'CormorantGaramond_600SemiBold', fontSize: 18, color: COLORS.textPrimary }}>
                  {upcomingEvent.name}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textTertiary, marginTop: 4 }}>
                  {upcomingEvent.daysRemaining === 0 ? t('dashboard.today') : upcomingEvent.daysRemaining === 1 ? t('dashboard.tomorrow') : t('dashboard.expected_days').replace('{days}', upcomingEvent.daysRemaining)}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>
                  {upcomingEvent.formattedDate}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 28, color: COLORS.gold }}>
                  {upcomingEvent.daysRemaining}
                </Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>{t('dashboard.days_away')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1.2, marginBottom: 12 }}>
            {t('dashboard.quick_actions')}
          </Text>
          {[QUICK_ACTIONS.slice(0, 4), QUICK_ACTIONS.slice(4)].map((row, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', gap: 10, marginBottom: rowIdx === 0 ? 10 : 0 }}>
              {row.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => {
                    if (action.section) {
                      router.push({ pathname: action.route, params: { section: action.section } });
                    } else {
                      router.push(action.route);
                    }
                  }}
                  activeOpacity={0.7}
                  style={[CARD_STYLE, { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 8 }]}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: iconBgColor, alignItems: 'center', justifyContent: 'center' }}>
                    {action.lib === 'huge' ? (
                      action.icon === 'PrayerRug01Icon' ? <HugeiconsIcon icon={PrayerRug01Icon} size={18} color={COLORS.gold} /> :
                      action.icon === 'Quran01Icon' ? <HugeiconsIcon icon={Quran01Icon} size={18} color={COLORS.gold} /> :
                      action.icon === 'Task01Icon' ? <HugeiconsIcon icon={Task01Icon} size={18} color={COLORS.gold} /> :
                      action.icon === 'DuaIcon' ? <HugeiconsIcon icon={DuaIcon} size={18} color={COLORS.gold} /> :
                      action.icon === 'AllahIcon' ? <HugeiconsIcon icon={AllahIcon} size={18} color={COLORS.gold} /> :
                      action.icon === 'Kaaba01Icon' ? <HugeiconsIcon icon={Kaaba01Icon} size={18} color={COLORS.gold} /> :
                      <HugeiconsIcon icon={YoutubeIcon} size={18} color={COLORS.gold} />
                    ) : (
                      <Feather name={action.icon} size={16} color={COLORS.gold} />
                    )}
                  </View>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' }}>
                    {t('more.' + (action.label === 'Asma ul Husna' ? 'asmaul_husna' : action.label.toLowerCase().replace(/ /g, '_')))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* ── AI Insight ── */}
        <AIInsightCard insight={insight} onDismiss={async () => { await dismissInsight(insight.id); setInsight(null); }} />

        {/* ── Hadith of the Day ── */}
        {dailyHadith && (
          <View style={{ marginBottom: 16 }}>
            <HadithCard hadith={dailyHadith} />
          </View>
        )}



        {/* ── Today's Habits ── */}
        {habits.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 10 }}>
              {t('dashboard.todays_habits')}
            </Text>
            {habits.map((h) => {
              const log = habitLogs.find((l) => l.habit_id === h.id);
              const done = !!log?.completed;
              const streak = habitStreaks[h.id] || 0;
              return (
                <TouchableOpacity
                  key={h.id}
                  onPress={() => toggleHabit(h.id)}
                  activeOpacity={0.75}
                  accessibilityLabel={`${h.name} habit — ${habitLogs.find((l) => l.habit_id === h.id)?.completed ? 'done' : 'not done'}. Tap to toggle.`}
                  accessibilityRole="button"
                  style={[CARD_STYLE, { padding: 14, marginBottom: 8 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 8,
                      backgroundColor: done ? COLORS.gold : 'transparent',
                      borderWidth: 1.5, borderColor: done ? COLORS.gold : COLORS.border,
                      alignItems: 'center', justifyContent: 'center', marginRight: 12,
                    }}>
                      {done && <Text style={{ fontSize: 14 }}>{h.icon}</Text>}
                    </View>
                    <Text style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15, color: COLORS.textPrimary }}>
                      {h.name}
                    </Text>
                    <Text style={{ fontSize: 16, marginRight: 4 }}>🔥</Text>
                    <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: done ? COLORS.gold : COLORS.textSecondary }}>
                      {streak}
                    </Text>
                  </View>
                  <View style={{ height: 3, backgroundColor: emptyBarColor, borderRadius: 2, marginTop: 10 }}>
                    <View style={{ height: 3, width: `${Math.min(100, (streak / 30) * 100)}%`, backgroundColor: done ? COLORS.gold : COLORS.textTertiary, borderRadius: 2 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Learning ── */}
        {firstPlaylist && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 10 }}>
              Learning
            </Text>
            <View style={[CARD_STYLE, { padding: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <View style={{ width: 14, height: 14, borderWidth: 1.5, borderColor: COLORS.gold, borderRadius: 2 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textPrimary }} numberOfLines={1}>
                    {firstPlaylist.title}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>
                    {watchedVideos} of {firstPlaylist.total_videos} videos · {playlistPct}%
                  </Text>
                </View>
              </View>
              <View style={{ height: 3, backgroundColor: emptyBarColor, borderRadius: 2, marginTop: 10 }}>
                <View style={{ height: 3, width: `${playlistPct}%`, backgroundColor: COLORS.gold, borderRadius: 2 }} />
              </View>
            </View>
          </View>
        )}


      </View>
    </ScrollView>
    </View>
  );
}
