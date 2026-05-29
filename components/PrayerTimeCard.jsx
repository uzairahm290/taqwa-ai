import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from './theme';

function formatTimeLabel(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function getCountdown(targetDate) {
  const now = new Date();
  const diff = targetDate - now;
  if (diff <= 0) return { h: 0, m: 0 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { h, m };
}

function PrayerTimeCard({ nextPrayer, prayedCount = 0 }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const [countdown, setCountdown] = useState({ h: 0, m: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!nextPrayer) return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(nextPrayer.date));
      const total = 5 * 3600000;
      const remaining = nextPrayer.date - new Date();
      setProgress(Math.max(0, Math.min(1, 1 - remaining / total)));
    }, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer]);

  if (!nextPrayer) return null;

  const ARABIC = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

  return (
    <View style={[CARD_STYLE, { padding: 20, marginBottom: 24, borderRadius: 24, overflow: 'hidden' }]}>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glow" cx="100%" cy="0%" r="90%" fx="100%" fy="0%">
              <Stop offset="0%" stopColor={COLORS.gold} stopOpacity={isDark ? "0.2" : "0.15"} />
              <Stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      </View>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.gold, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        UP NEXT · {prayedCount}/5 PRAYED TODAY
      </Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
        <View>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 44, color: COLORS.textPrimary, lineHeight: 46 }}>
            {nextPrayer.name}
          </Text>
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 20, color: COLORS.gold, marginTop: 4 }}>
            {ARABIC[nextPrayer.name]}
          </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 32, color: COLORS.gold }}>{countdown.h}</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: COLORS.gold, marginRight: 6 }}>h</Text>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 32, color: COLORS.gold }}>{countdown.m}</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: COLORS.gold }}>m</Text>
          </View>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 2 }}>
            until {formatTimeLabel(nextPrayer.time)}
          </Text>
        </View>
      </View>

      <View style={{ height: 3, backgroundColor: isDark ? '#1C1C28' : '#EAE6DF', borderRadius: 2, marginTop: 24 }}>
        <View style={{ height: 3, width: `${progress * 100}%`, backgroundColor: COLORS.gold, borderRadius: 2 }} />
      </View>
    </View>
  );
}

export default React.memo(PrayerTimeCard);
