import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Linking, Modal, Pressable, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { exportAnnualPrayerTimes } from '../lib/exportPrayerPDF';
import { scheduleAdhanNotifications } from '../lib/scheduleAdhan';
import { getLocalDateString } from '../lib/dateUtils';
import { useRecoveryAuth } from '../hooks/useRecoveryAuth';
import { LANGUAGES, setLocale, useTranslation } from '../lib/i18n';
import AppDialog from './AppDialog';
import AppPicker from './AppPicker';

function SectionHeader({ title, colors }) {
  return (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.gold, letterSpacing: 1.5, marginTop: 24, marginBottom: 8, paddingHorizontal: 2 }}>
      {title}
    </Text>
  );
}

function IconBox({ name, color, isDark }) {
  return (
    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? 'rgba(201,168,76,0.12)' : 'rgba(166,131,38,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

function BadgePill({ label, colors }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.gold, marginRight: 8 }}>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.gold }}>{label}</Text>
    </View>
  );
}

function SettingItem({ icon, label, subtitle, badge, toggle, onToggle, chevron = true, onPress, danger, theme }) {
  const { COLORS, isDark } = theme;
  const textColor = danger ? '#C0392B' : COLORS.textPrimary;
  const iconColor = danger ? '#C0392B' : COLORS.gold;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={toggle !== undefined ? 1 : 0.65}
      accessibilityLabel={label + (subtitle ? `, ${subtitle}` : '')}
      accessibilityRole={toggle !== undefined ? 'none' : 'button'}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(0,0,0,0.05)' }}
    >
      {icon ? <IconBox name={icon} color={iconColor} isDark={isDark} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: textColor }}>{label}</Text>
        {subtitle ? <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {badge ? <BadgePill label={badge} colors={COLORS} /> : null}
      {toggle !== undefined ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: isDark ? '#252530' : '#EAE6DF', true: COLORS.gold }}
          thumbColor={toggle ? (isDark ? '#0A0A0F' : '#FFF') : (isDark ? '#555' : '#FFF')}
          ios_backgroundColor={isDark ? '#252530' : '#EAE6DF'}
        />
      ) : null}
      {chevron && toggle === undefined ? <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} /> : null}
    </TouchableOpacity>
  );
}

function PrayerSubRow({ name, arabic, time, enabled, onToggle, theme }) {
  const { COLORS, isDark } = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingLeft: 48, borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(0,0,0,0.05)' }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textPrimary }}>{name}</Text>
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 15, color: COLORS.gold }}>{arabic}</Text>
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 1 }}>{time}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: isDark ? '#252530' : '#EAE6DF', true: COLORS.gold }}
        thumbColor={enabled ? (isDark ? '#0A0A0F' : '#FFF') : (isDark ? '#555' : '#FFF')}
        ios_backgroundColor={isDark ? '#252530' : '#EAE6DF'}
      />
    </View>
  );
}

function fmt12(t) {
  if (!t) return '--:--';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const PRAYERS_LIST = [
  { key: 'fajr',    name: 'Fajr',    arabic: 'فجر' },
  { key: 'dhuhr',   name: 'Dhuhr',   arabic: 'ظهر' },
  { key: 'asr',     name: 'Asr',     arabic: 'عصر' },
  { key: 'maghrib', name: 'Maghrib', arabic: 'مغرب' },
  { key: 'isha',    name: 'Isha',    arabic: 'عشاء' },
];

export default function SettingsScreen({ onBack, theme }) {
  const { COLORS, CARD_STYLE, isDark } = theme;
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [locData, setLocData] = useState({ city: '', calculation_method: 'Karachi', madhab: 'Hanafi' });
  const [notif, setNotif] = useState({ fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, mosque_nearby: true });
  const [quranSettings, setQuranSettings] = useState({ method: 'page', daily_goal: 5 });
  const [aiInsights, setAiInsights] = useState(true);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [showEditName, setShowEditName] = useState(false);
  const [editName, setEditName] = useState('');
  const [notifSnapshot, setNotifSnapshot] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [picker, setPicker] = useState(null);
  const [showRestoreAccount, setShowRestoreAccount] = useState(false);
  const [restorePhrase, setRestorePhrase] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportStatus, setExportStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');

  const { locale } = useTranslation();
  const { naflPrefs, toggleNaflPref } = usePrayerTimes(null);
  const { getSavedPhrase, restoreAccount } = useRecoveryAuth();

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      setEditName(u.user_metadata?.display_name || 'User');
      
      const phrase = await getSavedPhrase();
      if (phrase) setRecoveryPhrase(phrase);
      
      const today = getLocalDateString();
      const [{ data: loc }, { data: ns }, { data: pt }, { data: qs }] = await Promise.all([
        supabase.from('user_location').select('*').eq('user_id', u.id).single(),
        supabase.from('notification_settings').select('*').eq('user_id', u.id).single(),
        supabase.from('prayer_times_cache').select('*').eq('user_id', u.id).eq('date', today).single(),
        supabase.from('quran_settings').select('*').eq('user_id', u.id).single(),
      ]);
      if (loc) setLocData((p) => ({ ...p, ...loc }));
      if (ns) setNotif((p) => ({ ...p, fajr: ns.fajr ?? true, dhuhr: ns.dhuhr ?? true, asr: ns.asr ?? true, maghrib: ns.maghrib ?? true, isha: ns.isha ?? true, mosque_nearby: ns.mosque_nearby ?? true }));
      if (pt) setPrayerTimes({ Fajr: pt.fajr, Dhuhr: pt.dhuhr, Asr: pt.asr, Maghrib: pt.maghrib, Isha: pt.isha });
      if (qs) setQuranSettings((p) => ({ ...p, ...qs }));
      const aiPref = await AsyncStorage.getItem('@ai_insights_enabled');
      if (aiPref !== null) setAiInsights(JSON.parse(aiPref));
    } catch (_) {}
  }

  async function requestLocation() {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDialog({ title: 'Location Permission Denied', message: 'Please enable location access in your device Settings to auto-detect your city and calculate accurate prayer times.', buttons: [{ label: 'Open Settings', onPress: () => { setDialog(null); Linking.openSettings(); } }, { label: 'Cancel', style: 'cancel', onPress: () => setDialog(null) }] });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const city = geocode[0] ? (geocode[0].city || geocode[0].region || '') : '';
      await saveLocData({ lat, lng, city });
    } catch (e) {
      setDialog({ title: 'Location Error', message: e.message || 'Could not get location.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
    } finally {
      setLocLoading(false);
    }
  }

  async function saveLocData(updates) {
    const updated = { ...locData, ...updates };
    setLocData(updated);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.from('user_location').upsert({ user_id: u.id, lat: updated.lat, lng: updated.lng, city: updated.city, calculation_method: updated.calculation_method, madhab: updated.madhab });
    } catch (_) {}
  }

  async function saveNotif(updates) {
    const updated = { ...notif, ...updates };
    setNotif(updated);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.from('notification_settings').upsert({ user_id: u.id, fajr: updated.fajr, dhuhr: updated.dhuhr, asr: updated.asr, maghrib: updated.maghrib, isha: updated.isha, mosque_nearby: updated.mosque_nearby });
      scheduleAdhanNotifications({ force: true });
    } catch (_) {}
  }

  async function saveQuranSettings(updates) {
    const updated = { ...quranSettings, ...updates };
    setQuranSettings(updated);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.from('quran_settings').upsert({ user_id: u.id, method: updated.method, daily_goal: updated.daily_goal });
    } catch (_) {}
  }

  async function toggleAiInsights(val) {
    setAiInsights(val);
    await AsyncStorage.setItem('@ai_insights_enabled', JSON.stringify(val));
  }

  const anyPrayerOn = PRAYERS_LIST.some((p) => notif[p.key]);

  async function toggleMasterPrayer(val) {
    if (!val) {
      setNotifSnapshot({ fajr: notif.fajr, dhuhr: notif.dhuhr, asr: notif.asr, maghrib: notif.maghrib, isha: notif.isha });
      await saveNotif({ fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false });
    } else {
      await saveNotif(notifSnapshot || { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true });
    }
  }

  function pickCalculationMethod() {
    setPicker({
      title: 'Calculation Method',
      subtitle: 'Choose how prayer times are calculated',
      options: [
        { value: 'Karachi', label: 'Univ. of Islamic Sciences, Karachi', selected: locData.calculation_method === 'Karachi' },
        { value: 'ISNA',    label: 'Islamic Society of North America',   selected: locData.calculation_method === 'ISNA' },
        { value: 'MWL',     label: 'Muslim World League',                selected: locData.calculation_method === 'MWL' },
        { value: 'Egypt',   label: 'Egyptian General Authority',         selected: locData.calculation_method === 'Egypt' },
      ],
      onSelect: (v) => saveLocData({ calculation_method: v }),
    });
  }

  function pickMadhab() {
    setPicker({
      title: 'Madhab for Asr',
      subtitle: 'Affects when Asr prayer time begins',
      options: [
        { value: 'Hanafi', label: 'Hanafi',                        description: 'Later Asr time (2 shadow lengths)',  selected: locData.madhab === 'Hanafi' },
        { value: 'Shafi',  label: "Shafi'i / Maliki / Hanbali",    description: 'Earlier Asr time (1 shadow length)', selected: locData.madhab !== 'Hanafi' },
      ],
      onSelect: (v) => saveLocData({ madhab: v }),
    });
  }

  function pickQuranMethod() {
    setPicker({
      title: 'Tracking Method',
      subtitle: 'How would you like to track Quran reading?',
      options: [
        { value: 'page',  label: 'By Page',       selected: quranSettings.method === 'page' },
        { value: 'surah', label: 'By Surah',       selected: quranSettings.method === 'surah' },
        { value: 'juz',   label: 'By Juz (Para)',  selected: quranSettings.method === 'juz' },
      ],
      onSelect: (v) => saveQuranSettings({ method: v }),
    });
  }

  function pickDailyGoal() {
    const unit = quranSettings.method === 'surah' ? 'surahs' : quranSettings.method === 'juz' ? 'juz' : 'pages';
    setPicker({
      title: 'Daily Goal',
      subtitle: `How many ${unit} per day?`,
      options: [1, 2, 3, 5, 10, 20].map((g) => ({ value: g, label: `${g} ${unit}`, selected: quranSettings.daily_goal === g })),
      onSelect: (v) => saveQuranSettings({ daily_goal: v }),
    });
  }

  function pickTheme() {
    setPicker({
      title: 'Theme',
      subtitle: 'Choose your preferred appearance',
      options: [
        { value: 'system', label: 'System Default', selected: theme.themePref === 'system' },
        { value: 'light',  label: 'Light Mode',     selected: theme.themePref === 'light' },
        { value: 'dark',   label: 'Dark Mode',      selected: theme.themePref === 'dark' },
      ],
      onSelect: (v) => theme.changeThemePreference(v),
    });
  }

  function pickLanguage() {
    setPicker({
      title: 'Language',
      subtitle: 'Choose your app language',
      options: LANGUAGES.map(l => ({
        value: l.code,
        label: `${l.name} (${l.nativeName})`,
        selected: locale === l.code
      })),
      onSelect: async (v) => {
        const needsReload = await setLocale(v);
        if (needsReload) {
          setDialog({
            title: 'Restart Required',
            message: 'Language layout changed. The app needs to restart to apply the new layout properly.',
            buttons: [{ label: 'OK', onPress: () => { setDialog(null); router.replace('/splash'); } }]
          });
        }
      },
    });
  }

  async function saveDisplayName() {
    const name = editName.trim();
    if (!name) return;
    try {
      await supabase.auth.updateUser({ data: { display_name: name } });
      setUser((prev) => ({ ...prev, user_metadata: { ...prev?.user_metadata, display_name: name } }));
      setShowEditName(false);
    } catch (_) {
      setDialog({ title: 'Error', message: 'Could not update display name.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
    }
  }

  function handleSignOut() {
    setDialog({
      title: 'Reset App',
      message: 'This will clear your local session and create a new anonymous account. Make sure you saved your Recovery Phrase if you want to restore this data later!',
      buttons: [
        { label: 'Cancel', style: 'cancel', onPress: () => setDialog(null) },
        { label: 'Reset App', style: 'destructive', onPress: async () => { setDialog(null); await supabase.auth.signOut(); await AsyncStorage.removeItem('mizan_recovery_phrase'); router.replace('/splash'); } },
      ],
    });
  }

  async function handleRestoreAccount() {
    if (!restorePhrase || restorePhrase.trim().length < 10) {
      setDialog({ title: 'Invalid Phrase', message: 'Please enter a valid recovery phrase.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
      return;
    }
    setRestoreLoading(true);
    const result = await restoreAccount(restorePhrase);
    setRestoreLoading(false);
    
    if (result.error) {
      setDialog({ title: 'Error', message: result.error.message || 'Invalid recovery phrase.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
      return;
    }
    
    setShowRestoreAccount(false);
    setRestorePhrase('');
    setDialog({ title: 'Success', message: 'Your data has been restored successfully!', buttons: [{ label: 'OK', onPress: () => { setDialog(null); load(); } }] });
  }

  async function deleteUserAccount() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      const uid = u.id;
      await Promise.all([
        supabase.from('prayers').delete().eq('user_id', uid),
        supabase.from('habits').delete().eq('user_id', uid),
        supabase.from('habit_logs').delete().eq('user_id', uid),
        supabase.from('quran_logs').delete().eq('user_id', uid),
        supabase.from('quran_surahs').delete().eq('user_id', uid),
        supabase.from('youtube_progress').delete().eq('user_id', uid),
        supabase.from('duas').delete().eq('user_id', uid).eq('is_custom', true),
        supabase.from('ai_insights').delete().eq('user_id', uid),
        supabase.from('push_subscriptions').delete().eq('user_id', uid),
        supabase.from('notification_settings').delete().eq('user_id', uid),
        supabase.from('user_location').delete().eq('user_id', uid),
        supabase.from('prayer_times_cache').delete().eq('user_id', uid),
        supabase.from('mosque_checkins').delete().eq('user_id', uid),
      ]);
      await supabase.auth.signOut();
    } catch (_) {
      setDialog({ title: 'Error', message: 'Failed to delete account. Please try again or contact support.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
    }
  }

  function handleDeleteAccount() {
    setDialog({
      title: 'Delete Account & Data',
      message: 'This permanently deletes your account and all data — prayers, habits, Quran progress, duas. This cannot be undone.',
      buttons: [
        { label: 'Cancel', style: 'cancel', onPress: () => setDialog(null) },
        { label: 'Delete Everything', style: 'destructive', onPress: () => { setDialog(null); deleteUserAccount(); } },
      ],
    });
  }

  async function handleExport() {
    if (!locData.lat || !locData.lng) {
      setDialog({ title: 'Location Required', message: 'Prayer times export needs your location. Make sure location is enabled and try again.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
      return;
    }
    setExporting(true);
    setExportStatus('Fetching prayer times…');
    try {
      await exportAnnualPrayerTimes({ lat: locData.lat, lng: locData.lng, city: locData.city, year: exportYear, methodName: locData.calculation_method || 'Karachi', madhab: locData.madhab || 'Hanafi', onProgress: setExportStatus });
      setExportStatus('');
    } catch (err) {
      setDialog({ title: 'Export Failed', message: err.message || 'Could not generate PDF.', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
      setExportStatus('');
    }
    setExporting(false);
  }

  const enabledCount = PRAYERS_LIST.filter((p) => notif[p.key]).length;
  const displayName = user?.user_metadata?.display_name || 'User';
  const methodLabel = { Karachi: 'Univ. of Islamic Sciences, Karachi', ISNA: 'Islamic Society of North America', MWL: 'Muslim World League', Egypt: 'Egyptian General Authority' }[locData.calculation_method] || locData.calculation_method;
  const quranMethodLabel = { page: 'By Page', surah: 'By Surah', juz: 'By Juz (Para)' }[quranSettings.method] || 'By Page';
  const goalUnit = quranSettings.method === 'surah' ? 'surahs' : quranSettings.method === 'juz' ? 'juz' : 'pages';

  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 56, paddingBottom: 20 }}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
              <Ionicons name="chevron-back" size={26} color={COLORS.gold} />
            </TouchableOpacity>
          ) : null}
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 34, color: COLORS.textPrimary, lineHeight: 40 }}>Settings</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>Taqwa AI · Personalize your experience</Text>
        </View>

        {/* Profile */}
        <TouchableOpacity style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', padding: 16 }]} activeOpacity={0.7} onPress={() => { setEditName(displayName); setShowEditName(true); }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 20, color: '#000' }}>{displayName[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: COLORS.textPrimary }}>{displayName}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.gold, marginTop: 4 }}>Tap to edit name →</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* Prayer & Location */}
        <SectionHeader title="PRAYER & LOCATION" colors={COLORS} />
        <View style={CARD_STYLE}>
          <View style={{ paddingHorizontal: 14 }}>
            <SettingItem icon="location-outline" label="Location" subtitle={locLoading ? 'Detecting...' : (locData.city || 'Tap to enable GPS')} badge={locLoading ? undefined : 'Auto GPS'} chevron={false} onPress={requestLocation} theme={theme} />
            <SettingItem icon="time-outline" label="Calculation Method" subtitle={methodLabel} onPress={pickCalculationMethod} theme={theme} />
            <SettingItem icon="moon-outline" label="Madhab for Asr" subtitle={locData.madhab === 'Shafi' ? 'Shafi / Maliki / Hanbali' : 'Hanafi'} badge={locData.madhab || 'Hanafi'} onPress={pickMadhab} theme={theme} />
            <SettingItem icon="home-outline" label="Mosque Auto-Detection" subtitle="Auto check-in if within 100m of mosque" toggle={!!notif.mosque_nearby} onToggle={(v) => saveNotif({ mosque_nearby: v })} chevron={false} theme={theme} />
            <View style={{ paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(0,0,0,0.05)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <IconBox name="document-text-outline" color={COLORS.gold} isDark={isDark} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textPrimary }}>Export Annual Prayer Times</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>Download a PDF for {locData.city || 'your location'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => setExportYear((y) => y - 1)} style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: COLORS.textPrimary, minWidth: 48, textAlign: 'center' }}>{exportYear}</Text>
                <TouchableOpacity onPress={() => setExportYear((y) => y + 1)} style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleExport} disabled={exporting} style={{ flex: 1, backgroundColor: exporting ? COLORS.goldMuted : COLORS.gold, borderRadius: 9, padding: 9, alignItems: 'center' }}>
                  <Text style={{ fontFamily: exporting ? 'Inter_500Medium' : 'Inter_600SemiBold', fontSize: exporting ? 12 : 13, color: '#000' }}>{exporting ? (exportStatus || 'Exporting…') : 'Export PDF'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" colors={COLORS} />
        <View style={CARD_STYLE}>
          <View style={{ paddingHorizontal: 14 }}>
            <SettingItem icon="notifications-outline" label="Prayer Notifications" subtitle={`${enabledCount} of 5 prayers enabled`} toggle={anyPrayerOn} onToggle={toggleMasterPrayer} chevron={false} theme={theme} />
            {PRAYERS_LIST.map((p) => (
              <PrayerSubRow key={p.key} name={p.name} arabic={p.arabic} time={fmt12(prayerTimes?.[p.name])} enabled={!!notif[p.key]} onToggle={(v) => saveNotif({ [p.key]: v })} theme={theme} />
            ))}
            <SettingItem icon="home-outline" label="Mosque Nearby Alert" subtitle="Notify when near mosque at prayer time" toggle={!!notif.mosque_nearby} onToggle={(v) => saveNotif({ mosque_nearby: v })} chevron={false} theme={theme} />
          </View>
        </View>

        {/* Quran */}
        <SectionHeader title="QURAN TRACKER" colors={COLORS} />
        <View style={CARD_STYLE}>
          <View style={{ paddingHorizontal: 14 }}>
            <SettingItem icon="book-outline" label="Tracking Method" subtitle={quranMethodLabel} badge={quranMethodLabel} onPress={pickQuranMethod} theme={theme} />
            <SettingItem icon="calendar-outline" label="Daily Goal" subtitle={`${quranSettings.daily_goal} ${goalUnit} per day`} badge={`${quranSettings.daily_goal} ${goalUnit}`} onPress={pickDailyGoal} theme={theme} />
          </View>
        </View>

        {/* Optional Prayers */}
        <SectionHeader title="OPTIONAL PRAYERS" colors={COLORS} />
        <View style={CARD_STYLE}>
          <View style={{ paddingHorizontal: 14 }}>
            {[
              { key: 'Tahajjud', arabic: 'التهجد', sub: 'Night prayer before Fajr' },
              { key: 'Duha',     arabic: 'الضحى',  sub: 'Forenoon prayer after sunrise' },
              { key: 'Witr',     arabic: 'الوتر',  sub: 'Odd-unit prayer after Isha' },
            ].map((nafl) => (
              <SettingItem key={nafl.key} icon="star-outline" label={`${nafl.key}  ${nafl.arabic}`} subtitle={nafl.sub} toggle={!!naflPrefs?.[nafl.key]} onToggle={() => toggleNaflPref?.(nafl.key)} chevron={false} theme={theme} />
            ))}
          </View>
        </View>

        {/* Taqwa AI */}
        <SectionHeader title="TAQWA AI" colors={COLORS} />
        <View style={CARD_STYLE}>
          <View style={{ paddingHorizontal: 14 }}>
            <SettingItem icon="moon-outline" label="AI Insights" subtitle="Daily pattern detection & personalised nudges" toggle={aiInsights} onToggle={toggleAiInsights} chevron={false} theme={theme} />
          </View>
        </View>

        {/* App */}
        <SectionHeader title="APP" colors={COLORS} />
        <View style={CARD_STYLE}>
          <View style={{ paddingHorizontal: 14 }}>
            <SettingItem icon="language-outline" label="Language" subtitle={LANGUAGES.find(l => l.code === locale)?.name || 'English'} badge={LANGUAGES.find(l => l.code === locale)?.nativeName || 'English'} onPress={pickLanguage} theme={theme} />
            <SettingItem icon="contrast-outline" label="Theme" subtitle={theme.themePref === 'system' ? 'System Default' : (isDark ? 'Dark Mode' : 'Light Mode')} badge={theme.themePref === 'system' ? 'SYSTEM' : (isDark ? 'DARK' : 'LIGHT')} onPress={pickTheme} theme={theme} />
            <SettingItem icon="document-text-outline" label="Privacy Policy" onPress={() => Linking.openURL('https://taqwaai.app/privacy').catch(() => {})} theme={theme} />
            <SettingItem icon="information-circle-outline" label="About Taqwa AI" subtitle="Version 1.0.0" chevron={false} onPress={() => {}} theme={theme} />
          </View>
        </View>

        {/* Data Sync & Backup */}
        <SectionHeader title="DATA SYNC & BACKUP" colors={COLORS} />
        <View style={[CARD_STYLE, { marginBottom: 12, padding: 16 }]}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: COLORS.textPrimary, marginBottom: 4 }}>Recovery Phrase</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 14 }}>
            Save this phrase to restore your data on another device. Do not share it with anyone.
          </Text>
          <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', padding: 14, borderRadius: 8, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
            <Text selectable={true} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: COLORS.gold, letterSpacing: 1.5 }}>{recoveryPhrase || 'Loading...'}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowRestoreAccount(true)} style={{ backgroundColor: COLORS.gold, borderRadius: 10, padding: 13, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>Restore from Phrase</Text>
          </TouchableOpacity>
        </View>

        <View style={CARD_STYLE}>
          <View style={{ paddingHorizontal: 14 }}>
            <SettingItem icon="refresh-outline" label="Reset App" danger chevron={false} onPress={handleSignOut} theme={theme} />
            <SettingItem icon="trash-outline" label="Delete Account & Data" danger chevron={false} onPress={handleDeleteAccount} theme={theme} />
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 36, marginBottom: 8 }}>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.gold }}>Taqwa AI</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 5 }}>v1.0.0 · Built with ♥ for the ummah</Text>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal transparent visible={showEditName} animationType="fade" onRequestClose={() => setShowEditName(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setShowEditName(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[CARD_STYLE, { padding: 24 }]}>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 20 }}>Edit Display Name</Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.gold, marginBottom: 24 }}>
                <TextInput value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={COLORS.textTertiary} autoFocus maxLength={40} returnKeyType="done" onSubmitEditing={saveDisplayName} style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: COLORS.textPrimary, paddingVertical: 10 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowEditName(false)} style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 13, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveDisplayName} style={{ flex: 1, backgroundColor: COLORS.gold, borderRadius: 12, padding: 13, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Restore Account Modal */}
      <Modal transparent visible={showRestoreAccount} animationType="fade" onRequestClose={() => setShowRestoreAccount(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setShowRestoreAccount(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[CARD_STYLE, { padding: 24 }]}>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 6 }}>Restore Data</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 }}>Enter your Recovery Phrase to restore your previous data. This will replace your current device's data.</Text>
              <View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginBottom: 4 }}>RECOVERY PHRASE</Text>
                <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.gold, marginBottom: 20 }}>
                  <TextInput value={restorePhrase} onChangeText={setRestorePhrase} placeholder="MZ-XXXX-XXXX" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" autoCorrect={false} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, color: COLORS.textPrimary, paddingVertical: 10, letterSpacing: 1 }} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowRestoreAccount(false)} style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 13, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRestoreAccount} disabled={restoreLoading} style={{ flex: 1, backgroundColor: COLORS.gold, borderRadius: 12, padding: 13, alignItems: 'center' }}>
                  {restoreLoading ? <ActivityIndicator color="#000" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>Restore</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AppDialog visible={!!dialog} onClose={() => setDialog(null)} title={dialog?.title} message={dialog?.message} buttons={dialog?.buttons || []} />
      <AppPicker visible={!!picker} onClose={() => setPicker(null)} title={picker?.title} subtitle={picker?.subtitle} options={picker?.options || []} onSelect={(v) => { picker?.onSelect(v); setPicker(null); }} />
    </>
  );
}
