import { getLocalDateString } from '../lib/dateUtils';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from './theme';
import { useQuran } from '../hooks/useQuran';

function CircularProgress({ value, max, size = 80 }) {
  const { COLORS, isDark } = useAppTheme();
  const color = COLORS.gold;
  const pct = max > 0 ? value / max : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * pct;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={isDark ? "#1C1C28" : "#EAE6DF"} strokeWidth={5} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={5} fill="none"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, color: COLORS.textPrimary }}>
        {value}
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textTertiary }}>/{max}</Text>
    </View>
  );
}

function PageMethod({ logs, settings, logPages }) {
  const { COLORS, CARD_STYLE } = useAppTheme();
  const [input, setInput] = useState('');
  const total = logs.reduce((s, l) => s + (l.value || 0), 0);
  const goal = settings?.daily_goal || 2;
  const todayLog = logs.find((l) => l.date === getLocalDateString());

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
        <CircularProgress value={total} max={604} size={100} />
        <View style={{ justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 24, color: COLORS.textPrimary }}>
            {total}/604 pages
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
            Goal: {goal} pages/day
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.gold, marginTop: 2 }}>
            Today: {todayLog?.value || 0} pages
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          keyboardType="number-pad"
          placeholder="Pages read today"
          placeholderTextColor={COLORS.textTertiary}
          style={[CARD_STYLE, { flex: 1, padding: 12, color: COLORS.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14 }]}
        />
        <TouchableOpacity
          onPress={() => { if (input) { logPages(parseInt(input, 10)); setInput(''); } }}
          style={{ backgroundColor: COLORS.gold, borderRadius: 10, padding: 12, alignItems: 'center', minWidth: 70 }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#000', fontSize: 13 }}>Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SurahMethod({ allSurahs, surahs, toggleSurah }) {
  const { COLORS, CARD_STYLE } = useAppTheme();
  const completed = surahs.filter((s) => s.completed).map((s) => s.surah_number);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <CircularProgress value={completed.length} max={114} />
        <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 20, color: COLORS.textPrimary }}>
          {completed.length}/114 Surahs
        </Text>
      </View>
      <FlashList
        data={allSurahs}
        estimatedItemSize={55}
        keyExtractor={(item) => String(item.number)}
        numColumns={2}
        renderItem={({ item }) => {
          const done = completed.includes(item.number);
          return (
            <TouchableOpacity
              onPress={() => toggleSurah(item.number)}
              style={[CARD_STYLE, { flex: 1, margin: 4, padding: 10, borderColor: done ? COLORS.gold : COLORS.border }]}
            >
              <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: COLORS.textTertiary }}>{item.number}</Text>
              <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 14, color: done ? COLORS.gold : COLORS.textPrimary, marginTop: 2 }}>
                {item.name}
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textSecondary }}>
                {item.englishName}
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textTertiary }}>
                {item.numberOfAyahs} ayahs
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function JuzMethod({ surahs, toggleSurah }) {
  const { COLORS, CARD_STYLE } = useAppTheme();
  const completedJuz = surahs.filter((s) => s.completed && s.surah_number > 200).map((s) => s.surah_number - 200);

  return (
    <View>
      <CircularProgress value={completedJuz.length} max={30} size={100} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
        {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
          const done = completedJuz.includes(juz);
          return (
            <TouchableOpacity
              key={juz}
              onPress={() => toggleSurah(juz + 200)}
              style={[CARD_STYLE, {
                width: '28%', margin: '2%', padding: 12, alignItems: 'center',
                borderColor: done ? COLORS.gold : COLORS.border,
              }]}
            >
              <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: done ? COLORS.gold : COLORS.textSecondary }}>{juz}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textTertiary }}>Juz</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function QuranTracker() {
  const { COLORS } = useAppTheme();
  const { settings, logs, surahs, allSurahs, loading, logPages, toggleSurah } = useQuran();

  if (loading) return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Text style={{ color: COLORS.textTertiary, fontFamily: 'Inter_400Regular' }}>Loading...</Text>
    </View>
  );

  const method = settings?.method || 'page';

  if (method === 'page' || method === 'goal') {
    return <PageMethod logs={logs} settings={settings} logPages={logPages} />;
  }
  if (method === 'surah') {
    return <SurahMethod allSurahs={allSurahs} surahs={surahs} toggleSurah={toggleSurah} />;
  }
  if (method === 'juz') {
    return <JuzMethod surahs={surahs} toggleSurah={toggleSurah} />;
  }

  return null;
}

export default React.memo(QuranTracker);
