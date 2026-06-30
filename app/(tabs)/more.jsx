import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../components/theme';
import BackgroundEffect from '../../components/BackgroundEffect';
import IslamicCalendar from '../../components/IslamicCalendar';
import TasbihScreen from '../../components/TasbihScreen';
import AsmaulHusnaScreen from '../../components/AsmaulHusnaScreen';
import DuasScreen from '../../components/DuasScreen';
import SettingsScreen from '../../components/SettingsScreen';
import FeedbackScreen from '../../components/FeedbackScreen';

const MENU_ITEMS = [
  { key: 'Tasbih',      label: 'Tasbih',           sub: 'Digital dhikr counter with haptics',    arabic: 'التسبيح' },
  { key: 'Duas',        label: 'Duas',             sub: 'Morning, evening, after salah & more',  arabic: 'الأدعية' },
  { key: 'AsmaulHusna', label: 'Asma ul Husna',   sub: 'The 99 beautiful names of Allah',       arabic: 'أسماء الله' },
  { key: 'Calendar',    label: 'Islamic Calendar', sub: 'Hijri dates & upcoming events',         arabic: 'التقويم' },
  { key: 'Feedback',    label: 'Feedback',         sub: 'Rate the app & share your thoughts',    arabic: '' },
  { key: 'Settings',    label: 'Settings',         sub: 'Prayer method, notifications, account', arabic: '' },
];

export default function MoreScreen() {
  const theme = useAppTheme();
  const { COLORS, CARD_STYLE } = theme;
  const router = useRouter();
  const { section: sectionParam } = useLocalSearchParams();
  const [activeSection, setActiveSection] = useState(null);

  useFocusEffect(useCallback(() => {
    if (sectionParam) {
      setActiveSection(String(sectionParam));
      router.setParams({ section: '' });
    }
  }, [sectionParam]));

  function goBack() { setActiveSection(null); }

  if (activeSection === 'Duas') {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }}><BackgroundEffect /><DuasScreen onBack={goBack} theme={theme} /></View>;
  }
  if (activeSection === 'AsmaulHusna') {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }}><BackgroundEffect /><AsmaulHusnaScreen onBack={goBack} /></View>;
  }
  if (activeSection === 'Calendar') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <BackgroundEffect />
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4 }}>
          <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={COLORS.gold} />
            <Text style={{ color: COLORS.gold, fontFamily: 'Inter_500Medium', fontSize: 14 }}>Back</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <IslamicCalendar />
        </ScrollView>
      </View>
    );
  }
  if (activeSection === 'Settings') {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }}><BackgroundEffect /><SettingsScreen onBack={goBack} theme={theme} /></View>;
  }
  if (activeSection === 'Tasbih') {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }}><BackgroundEffect /><TasbihScreen onBack={goBack} /></View>;
  }
  if (activeSection === 'Feedback') {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }}><BackgroundEffect /><FeedbackScreen onBack={goBack} theme={theme} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <BackgroundEffect />
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 }}>
        <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: COLORS.textPrimary }}>More</Text>
        <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: COLORS.gold, marginTop: 2 }}>المزيد</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setActiveSection(item.key)}
            accessibilityLabel={item.label}
            accessibilityRole="button"
            style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 12 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 20, color: COLORS.textPrimary }}>{item.label}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 3 }}>{item.sub}</Text>
            </View>
            {item.arabic
              ? <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 20, color: COLORS.gold, marginLeft: 12 }}>{item.arabic}</Text>
              : <Text style={{ color: COLORS.textTertiary, fontSize: 18 }}>›</Text>
            }
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
