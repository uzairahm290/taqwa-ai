import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Share, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAppTheme } from './theme';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_AR = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

function CrescentIcon({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Path
        d="M55 15 C35 15, 20 28, 20 45 C20 62, 35 75, 55 75 C42 70, 34 59, 34 45 C34 31, 42 20, 55 15Z"
        fill={color}
        opacity={0.95}
      />
      <Circle cx={58} cy={28} r={5} fill="transparent" />
    </Svg>
  );
}

export default function DailyShareCard({ todayRecord, quranToday, quranGoal, quranMethod, habitsDone, totalHabits, hijri }) {
  const viewShotRef = useRef(null);
  const { isDark } = useAppTheme();

  const gold = '#C9A84C';
  const bg = '#0A0A0F';
  const card = '#111118';
  const border = 'rgba(201,168,76,0.25)';
  const textPrimary = '#F0EDE6';
  const textSecondary = '#9E9B94';
  const textTertiary = '#5C5A55';

  const prayedCount = todayRecord
    ? PRAYER_NAMES.filter((p) => todayRecord[p.toLowerCase()]).length
    : 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const hijriStr = hijri ? `${hijri.day} ${hijri.month?.en} ${hijri.year} AH` : '';

  const quranUnit = quranMethod === 'juz' ? 'juz' : quranMethod === 'surah' ? 'surahs' : 'pages';
  const quranPct = quranGoal > 0 ? Math.min(100, Math.round((quranToday / quranGoal) * 100)) : 0;
  const habitPct = totalHabits > 0 ? Math.min(100, Math.round((habitsDone / totalHabits) * 100)) : 0;

  async function handleShare() {
    try {
      const uri = await viewShotRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your daily progress' });
      } else {
        await Share.share({ url: uri, title: 'My Daily Taqwa Progress' });
      }
    } catch (_) {}
  }

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: textTertiary, letterSpacing: 1.2, marginBottom: 12 }}>
        DAILY STATUS
      </Text>

      {/* The card that gets captured */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: bg, borderRadius: 20, overflow: 'hidden' }}>
        <View style={{ backgroundColor: bg, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: border }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: textTertiary, letterSpacing: 0.8 }}>
                {dateStr.toUpperCase()}
              </Text>
              {hijriStr ? (
                <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 13, color: gold, marginTop: 2 }}>{hijriStr}</Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CrescentIcon color={gold} size={18} />
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 16, color: gold, letterSpacing: 1 }}>
                Taqwa AI
              </Text>
            </View>
          </View>

          {/* Prayer row */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: textTertiary, letterSpacing: 1.2, marginBottom: 12 }}>
              PRAYERS · {prayedCount}/5
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {PRAYER_NAMES.map((p) => {
                const prayed = !!todayRecord?.[p.toLowerCase()];
                return (
                  <View key={p} style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: prayed ? gold : card,
                      borderWidth: 1.5,
                      borderColor: prayed ? gold : border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {prayed ? (
                        <Text style={{ fontSize: 16 }}>✓</Text>
                      ) : (
                        <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 13, color: textTertiary }}>{PRAYER_AR[p]}</Text>
                      )}
                    </View>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: prayed ? gold : textTertiary }}>
                      {p}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Quran + Habits row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Quran */}
            <View style={{ flex: 1, backgroundColor: card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: border }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: textTertiary, letterSpacing: 1.2, marginBottom: 8 }}>
                QURAN
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 24, color: textPrimary }}>{quranToday}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: textTertiary }}>/ {quranGoal} {quranUnit}</Text>
              </View>
              <View style={{ height: 3, backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 2, marginTop: 10 }}>
                <View style={{ height: 3, width: `${quranPct}%`, backgroundColor: gold, borderRadius: 2 }} />
              </View>
            </View>

            {/* Habits */}
            <View style={{ flex: 1, backgroundColor: card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: border }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: textTertiary, letterSpacing: 1.2, marginBottom: 8 }}>
                HABITS
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 24, color: textPrimary }}>{habitsDone}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: textTertiary }}>/ {totalHabits} done</Text>
              </View>
              <View style={{ height: 3, backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 2, marginTop: 10 }}>
                <View style={{ height: 3, width: `${habitPct}%`, backgroundColor: gold, borderRadius: 2 }} />
              </View>
            </View>
          </View>

          {/* Footer tagline */}
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: textTertiary, textAlign: 'center', marginTop: 18, letterSpacing: 0.5 }}>
            Track your deen and your day · taqwaai.app
          </Text>
        </View>
      </ViewShot>

      {/* Share button — outside the captured area */}
      <TouchableOpacity
        onPress={handleShare}
        activeOpacity={0.8}
        style={{
          marginTop: 12,
          backgroundColor: 'rgba(201,168,76,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(201,168,76,0.3)',
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: gold }}>
          Share as Image
        </Text>
      </TouchableOpacity>
    </View>
  );
}
