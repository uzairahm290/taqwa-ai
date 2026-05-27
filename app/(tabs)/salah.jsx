import { getLocalDateString } from '../../lib/dateUtils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../../lib/i18n';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme, PRAYER_LIST, NAFL_LIST } from '../../components/theme';
import BackgroundEffect from '../../components/BackgroundEffect';
import WeeklyGrid from '../../components/WeeklyGrid';
import QiblaCompass from '../../components/QiblaCompass';
import MosqueCheckin from '../../components/MosqueCheckin';
import { useLocation } from '../../hooks/useLocation';
import { usePrayerTimes, useWeeklyPrayers } from '../../hooks/usePrayerTimes';
import { useMosque } from '../../hooks/useMosque';
import { supabase } from '../../lib/supabaseClient';

const TABS = ['Today', 'Weekly', 'Qibla', 'Mosques'];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getPrayerMeta = (COLORS) => ({
  Fajr: { ar: 'فجر', accent: COLORS.gold, icon: 'home' },
  Dhuhr: { ar: 'ظهر', accent: COLORS.success, icon: 'clock' },
  Asr: { ar: 'عصر', accent: COLORS.gold, icon: 'sun' },
  Maghrib: { ar: 'مغرب', accent: COLORS.danger, icon: 'x' },
  Isha: { ar: 'عشاء', accent: COLORS.textSecondary, icon: 'moon' },
  Tahajjud: { ar: 'التهجد', accent: COLORS.textTertiary, icon: 'moon' },
  Duha: { ar: 'الضحى', accent: COLORS.goldLight, icon: 'sun' },
  Witr: { ar: 'الوتر', accent: COLORS.textSecondary, icon: 'moon' },
});




function TabBar({ active, onSelect }) {
  const { COLORS, isDark } = useAppTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 18, backgroundColor: isDark ? 'rgba(18,18,28,0.94)' : 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: COLORS.border }}>
      {TABS.map((tabItem) => (
        <TouchableOpacity
          key={tabItem}
          onPress={() => onSelect(tabItem)}
          accessibilityLabel={`${tabItem} tab`}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === tabItem }}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: active === tabItem ? COLORS.gold : 'transparent',
          }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: active === tabItem ? '#1A1814' : COLORS.textTertiary }}>
            {t('salah.tabs.' + tabItem.toLowerCase())}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function formatTimeLabel(time) {
  if (!time) return '--:--';
  if (!time.includes(':')) return time; // Handle "Night", "Morning" etc.
  const [rawHours, rawMinutes] = time.split(':');
  const hours = Number(rawHours);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = ((hours + 11) % 12) + 1;
  return `${displayHours}:${rawMinutes} ${suffix}`;
}

function PrayerRow({ prayer, time, prayed, location, isNext, onPress, activeDateStr }) {
  const { COLORS, isDark } = useAppTheme();
  const { t } = useTranslation();
  const PRAYER_META = getPrayerMeta(COLORS);
  const meta = PRAYER_META[prayer];
  
  // Determine if prayer is in the future
  const isFuture = useMemo(() => {
    if (!time || !time.includes(':')) return false; // Nafl prayers or loading
    const [h, m] = time.split(':').map(Number);
    const prayerDate = new Date();
    if (activeDateStr) {
      const [y, mo, d] = activeDateStr.split('-').map(Number);
      prayerDate.setFullYear(y, mo - 1, d);
    }
    prayerDate.setHours(h, m, 0, 0);
    return prayerDate > new Date();
  }, [time, activeDateStr]);

  const disabled = isFuture && !prayed; // Disable if in future, unless somehow already logged
  
  const borderColor = isNext 
    ? COLORS.gold 
    : prayed 
      ? (isDark ? 'rgba(201, 168, 76, 0.2)' : 'rgba(201, 168, 76, 0.3)')
      : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)');
      
  const bgColor = prayed 
    ? (isDark ? 'rgba(201, 168, 76, 0.08)' : 'rgba(201, 168, 76, 0.05)')
    : (isNext ? (isDark ? 'rgba(28, 24, 17, 0.6)' : 'rgba(255, 250, 235, 0.6)') : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'));

  const btnBorderColor = prayed 
    ? COLORS.gold 
    : isNext 
      ? COLORS.gold 
      : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)');

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      accessibilityLabel={`${prayer} — ${prayed ? 'prayed' : 'not prayed'}. Tap to ${prayed ? 'unlog' : 'log'}.`}
      accessibilityRole="button"
      accessibilityState={{ checked: prayed, disabled }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: borderColor,
        backgroundColor: bgColor,
        marginBottom: 12,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary, marginRight: 10 }}>
            {prayer}
          </Text>
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 20, color: COLORS.gold }}>
            {meta.ar}
          </Text>
        </View>
        
        <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: isNext ? COLORS.gold : COLORS.textTertiary, marginTop: 4, letterSpacing: 0.5 }}>
          {prayed ? t('salah.prayed') : isNext ? `${t('salah.next')} · ${formatTimeLabel(time)}` : formatTimeLabel(time)}
        </Text>
      </View>

      <View style={{
        width: 48, height: 48, borderRadius: 24,
        borderWidth: prayed ? 0 : 1.5,
        borderColor: btnBorderColor,
        backgroundColor: prayed ? COLORS.gold : 'transparent',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {prayed ? (
          <Feather name="check" size={24} color="#1A1814" />
        ) : (
          <Feather name="plus" size={24} color={isNext ? COLORS.gold : (isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)')} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function useCountdown(nextPrayer) {
  const [remaining, setRemaining] = useState('');
  const tickRef = useRef(null);

  useEffect(() => {
    function tick() {
      if (!nextPrayer?.date) { setRemaining(''); return; }
      const diff = nextPrayer.date - Date.now();
      if (diff <= 0) { setRemaining('Now'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(
        h > 0
          ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
          : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      );
    }
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
  }, [nextPrayer?.date]);

  return remaining;
}

function NextPrayerCard({ nextPrayer, times, isDark, COLORS }) {
  const { t } = useTranslation();
  const PRAYER_META = getPrayerMeta(COLORS);
  const countdown = useCountdown(nextPrayer);

  if (!nextPrayer || !times) return null;
  const name = nextPrayer.name;
  const meta = PRAYER_META[name] || {};
  const timeStr = formatTimeLabel(times[name]);

  return (
    <View style={{
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(201,168,76,0.35)',
      backgroundColor: isDark ? 'rgba(20,18,12,0.95)' : 'rgba(255,252,240,0.95)',
      padding: 20,
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.textTertiary, letterSpacing: 1.2, marginBottom: 10 }}>
        NEXT PRAYER
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 36, color: COLORS.textPrimary, lineHeight: 40 }}>
              {name}
            </Text>
            <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 24, color: COLORS.gold }}>
              {meta.ar}
            </Text>
          </View>
          <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 20, color: COLORS.gold, marginTop: 4 }}>
            {timeStr}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary, marginBottom: 4 }}>
            IN
          </Text>
          <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, color: COLORS.textPrimary, letterSpacing: 1 }}>
            {countdown || '--:--'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TodayTab({ times, todayRecord, logPrayer, nextPrayer, nearbyMosque, weekData, onCheckinYes, onCheckinNo, prayerStreak, mosqueStreak, naflPrefs, activeDateStr, setActiveDateStr }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const { t } = useTranslation();
  if (!times) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.gold} />
        <Text style={{ color: COLORS.textTertiary, fontFamily: 'Inter_400Regular', marginTop: 12 }}>{t('salah.loading')}</Text>
      </View>
    );
  }

  const nextPrayerName = nextPrayer?.name || 'Asr';
  const nearbyName = nearbyMosque?.name || 'Masjid Al-Noor';
  const nearbyDistance = nearbyMosque?.distance ? `${Math.round(nearbyMosque.distance)} meters away` : '';
  const prayedCount = todayRecord ? ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((p) => todayRecord[p]).length : 0;

  const todayStrReal = getLocalDateString();
  const isToday = activeDateStr === todayStrReal;

  function handlePrevDay() {
    const d = new Date(activeDateStr);
    d.setDate(d.getDate() - 1);
    setActiveDateStr(getLocalDateString(d));
  }
  
  function handleNextDay() {
    const d = new Date(activeDateStr);
    d.setDate(d.getDate() + 1);
    if (getLocalDateString(d) <= todayStrReal) {
      setActiveDateStr(getLocalDateString(d));
    }
  }

  const displayDateObj = new Date(activeDateStr);
  let dateTitle = isToday ? t('salah.today') : displayDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const d1 = new Date(); d1.setDate(d1.getDate() - 1);
  if (activeDateStr === d1.toISOString().split('T')[0]) dateTitle = t('salah.yesterday');

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 }}>
        <TouchableOpacity onPress={handlePrevDay} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 20 }}>
          <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{t('salah.prev')}</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary }}>{dateTitle}</Text>
        <TouchableOpacity onPress={handleNextDay} disabled={isToday} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: isToday ? 'transparent' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), borderRadius: 20, opacity: isToday ? 0.3 : 1 }}>
          <Text style={{ color: COLORS.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{t('salah.next_arrow')}</Text>
        </TouchableOpacity>
      </View>

      {isToday && (
        <NextPrayerCard nextPrayer={nextPrayer} times={times} isDark={isDark} COLORS={COLORS} />
      )}

      {isToday && nearbyMosque && (
        <View style={[CARD_STYLE, { padding: 14, marginBottom: 14, borderRadius: 18, backgroundColor: isDark ? 'rgba(18,18,28,0.96)' : 'rgba(255,255,255,0.9)', borderColor: COLORS.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold, marginRight: 8 }} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, letterSpacing: 1, color: COLORS.gold }}>{t('salah.mosque_nearby')}</Text>
          </View>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary }}>{nearbyName}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
            {nearbyDistance ? `${nearbyDistance} · ` : ''}It’s time for {nextPrayerName}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <TouchableOpacity onPress={onCheckinYes} accessibilityLabel="Yes, I prayed at this mosque" accessibilityRole="button" style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gold, paddingVertical: 12, alignItems: 'center', backgroundColor: isDark ? 'rgba(31,28,19,0.92)' : 'rgba(201,168,76,0.1)' }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textPrimary }}>{t('salah.yes_prayed_here')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCheckinNo} accessibilityLabel="No thanks, dismiss mosque prompt" accessibilityRole="button" style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)', paddingVertical: 12, alignItems: 'center', backgroundColor: isDark ? 'rgba(18,18,28,0.92)' : 'rgba(255,255,255,0.9)' }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textPrimary }}>{t('salah.no_thanks')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}



      {PRAYER_LIST.map((prayer) => {
        const prayed = !!todayRecord?.[prayer.toLowerCase()];
        const location = todayRecord?.[`${prayer.toLowerCase()}_location`];
        return (
          <PrayerRow
            key={prayer}
            prayer={prayer}
            time={times[prayer]}
            prayed={prayed}
            location={location}
            isNext={isToday && prayer === nextPrayerName && nextPrayer?.date?.getDate() === new Date().getDate()}
            onPress={() => logPrayer(prayer, !prayed, prayed ? null : location || 'home')}
            activeDateStr={activeDateStr}
          />
        );
      })}

      {NAFL_LIST.filter(p => naflPrefs?.[p]).length > 0 && (
        <>
          <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 8, marginHorizontal: 16 }} />
          {NAFL_LIST.filter(p => naflPrefs?.[p]).map((prayer) => {
            const prayed = !!todayRecord?.[prayer.toLowerCase()];
            const location = todayRecord?.[`${prayer.toLowerCase()}_location`];
            // Provide arbitrary dummy times for Nufl for now, or --:--
            let timeStr = '--:--';
            if (prayer === 'Tahajjud') timeStr = 'Night';
            if (prayer === 'Duha') timeStr = 'Morning';
            if (prayer === 'Witr') timeStr = 'After Isha';

            return (
              <PrayerRow
                key={prayer}
                prayer={prayer}
                time={timeStr}
                prayed={prayed}
                location={location}
                isNext={false}
                onPress={() => logPrayer(prayer, !prayed, prayed ? null : location || 'home')}
                activeDateStr={activeDateStr}
              />
            );
          })}
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 12 }}>
        {[
          { value: prayerStreak, label: t('salah.day_streak') },
          { value: mosqueStreak, label: t('salah.mosque_streak') },
          { value: `${prayedCount}/5`, label: t('salah.today_label') },
        ].map((item) => (
          <View key={item.label} style={{ flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(18,18,28,0.92)' : 'rgba(255,255,255,0.8)', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 28, color: COLORS.gold }}>{item.value}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={[CARD_STYLE, { padding: 14, borderRadius: 18, backgroundColor: isDark ? 'rgba(18,18,28,0.96)' : 'rgba(255,255,255,0.9)', borderColor: COLORS.border }]}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, letterSpacing: 1, color: COLORS.goldMuted, marginBottom: 10 }}>{t('salah.this_week')}</Text>
        <View style={{ flexDirection: 'row', marginLeft: 56, marginBottom: 8 }}>
          {WEEKDAYS.map((label, index) => (
            <View key={`${label}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: index === 6 ? COLORS.gold : COLORS.textTertiary }}>{label}</Text>
            </View>
          ))}
        </View>
        <WeeklyGrid weekData={weekData} />
      </View>
    </ScrollView>
  );
}

function WeeklyTab({ weekData, loading, streak, mosqueCount }) {
  const { COLORS, CARD_STYLE } = useAppTheme();
  if (loading) return <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={[CARD_STYLE, { padding: 16, marginBottom: 16 }]}>
        <WeeklyGrid weekData={weekData} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[CARD_STYLE, { flex: 1, padding: 14 }]}>
          <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 28, color: COLORS.gold }}>{streak}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary }}>day streak</Text>
        </View>
        <View style={[CARD_STYLE, { flex: 2, padding: 14 }]}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 }}>
            You prayed <Text style={{ color: COLORS.gold, fontFamily: 'JetBrainsMono_400Regular' }}>{mosqueCount}</Text> of 35 prayers in the mosque{' '}
            <Text style={{ color: COLORS.gold }}>({Math.round((mosqueCount / 35) * 100)}%)</Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default function SalahScreen() {
  const { COLORS } = useAppTheme();
  const { t, locale } = useTranslation();
  const isUrdu = locale === 'ur';
  const [activeTab, setActiveTab] = useState('Today');
  const [activeDateStr, setActiveDateStr] = useState(() => getLocalDateString());
  const [mosqueStreak, setMosqueStreak] = useState(0);
  
  const { location } = useLocation();
  const { times, todayRecord, nextPrayer, logPrayer, methodName, naflPrefs } = usePrayerTimes(location, activeDateStr);
  const { weekData, loading: weeklyLoading } = useWeeklyPrayers();
  const { nearbyMosques, loadNearbyMosques, checkinMosque, getMosqueStreak } = useMosque();

  useEffect(() => {
    if (location?.lat && location?.lng) {
      loadNearbyMosques(location.lat, location.lng);
    }
  }, [location?.lat, location?.lng, loadNearbyMosques]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        getMosqueStreak(data.user.id).then(setMosqueStreak);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prayerStreak = useMemo(() => {
    if (!weekData || !weekData.length) return 0;
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      const rec = weekData.find((r) => r.date === dateStr);
      const complete = rec && ['fajr','dhuhr','asr','maghrib','isha'].every((p) => rec[p]);
      if (complete) s++; else break;
    }
    return s;
  }, [weekData]);

  const mosqueCount = useMemo(() => {
    let mc = 0;
    for (const rec of weekData || []) {
      for (const p of ['fajr','dhuhr','asr','maghrib','isha']) {
        if (rec[`${p}_location`] === 'mosque') mc++;
      }
    }
    return mc;
  }, [weekData]);

  const nearbyMosque = nearbyMosques?.[0];

  async function handleCheckin(mosque) {
    const now = new Date().getHours();
    let guessedPrayer = 'Dhuhr';
    if (now < 7) guessedPrayer = 'Fajr';
    else if (now < 13) guessedPrayer = 'Dhuhr';
    else if (now < 16) guessedPrayer = 'Asr';
    else if (now < 19) guessedPrayer = 'Maghrib';
    else guessedPrayer = 'Isha';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await checkinMosque({ prayerName: guessedPrayer, mosque, userId: user.id });
    
    // Refresh mosque streak after checkin
    getMosqueStreak(user.id).then(setMosqueStreak);
  }

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <BackgroundEffect />

      <View style={{ paddingHorizontal: 20, paddingTop: 58, paddingBottom: 12 }}>
        <Text style={{ fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : 'CormorantGaramond_600SemiBold', fontSize: 30, color: COLORS.textPrimary }}>
          {t('salah.title')}
        </Text>
        <Text style={{ fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : 'Amiri_400Regular', fontSize: 17, color: COLORS.gold, marginTop: 2 }}>
          الصلاة
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 6 }}>
          {todayStr} · {methodName || 'Karachi'} method
        </Text>
      </View>

      <TabBar active={activeTab} onSelect={setActiveTab} />

      {activeTab === 'Today' && (
        <TodayTab
          times={times}
          todayRecord={todayRecord}
          logPrayer={logPrayer}
          nextPrayer={nextPrayer}
          nearbyMosque={nearbyMosque}
          weekData={weekData}
          onCheckinYes={() => nearbyMosque && handleCheckin(nearbyMosque)}
          onCheckinNo={() => {}}
          prayerStreak={prayerStreak}
          mosqueStreak={mosqueStreak}
          naflPrefs={naflPrefs}
          activeDateStr={activeDateStr}
          setActiveDateStr={setActiveDateStr}
        />
      )}
      {activeTab === 'Weekly' && (
        <WeeklyTab 
          weekData={weekData} 
          loading={weeklyLoading} 
          streak={prayerStreak} 
          mosqueCount={mosqueCount} 
        />
      )}
      {activeTab === 'Qibla' && (
        <ScrollView>
          <QiblaCompass location={location} />
        </ScrollView>
      )}
      {activeTab === 'Mosques' && <MosqueCheckin location={location} />}
    </View>
  );
}

