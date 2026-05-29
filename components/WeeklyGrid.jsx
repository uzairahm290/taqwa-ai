import { getLocalDateString } from '../lib/dateUtils';
import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from './theme';

const PRAYER_LIST = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function WeeklyGrid({ weekData }) {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    days.push(getLocalDateString(d));
  }

  const dayLabels = days.map((d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { weekday: 'narrow' });
  });

  function getCellColor(prayerName, dateStr) {
    const record = weekData.find((r) => r.date === dateStr);
    const key = prayerName.toLowerCase();
    if (!record) {
      const d = new Date(dateStr);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return d > now ? '#1A1A24' : COLORS.danger;
    }
    if (!record[key]) return COLORS.danger;
    if (record[`${key}_location`] === 'mosque') return COLORS.gold;
    return COLORS.success;
  }

  return (
    <View>
      {/* Day headers */}
      <View style={{ flexDirection: 'row', marginLeft: 56 }}>
        {dayLabels.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary }}>{d}</Text>
          </View>
        ))}
      </View>

      {PRAYER_LIST.map((prayer) => (
        <View key={prayer} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ width: 52, fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textSecondary }}>
            {prayer}
          </Text>
          {days.map((dateStr, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 24,
                margin: 2,
                borderRadius: 4,
                backgroundColor: getCellColor(prayer, dateStr),
              }}
            />
          ))}
        </View>
      ))}

      <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
        {[
          { color: COLORS.gold, label: 'Mosque' },
          { color: COLORS.success, label: 'Home' },
          { color: COLORS.danger, label: 'Missed' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default React.memo(WeeklyGrid);
