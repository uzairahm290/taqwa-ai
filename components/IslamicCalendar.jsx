import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from './theme';
import { fetchHijriDate } from '../lib/aladhanClient';

const BASE_EVENTS = [
  { id: 'new_year', name: 'Islamic New Year', arabic: 'رأس السنة الهجرية', icon: 'calendar-outline', month: 1, day: 1 },
  { id: 'ashura', name: 'Ashura', arabic: 'عاشوراء', icon: 'shield-outline', month: 1, day: 10 },
  { id: 'mawlid', name: 'Mawlid al-Nabi', arabic: 'المولد النبوي', icon: 'time-outline', month: 3, day: 12 },
  { id: 'ramadan', name: 'Ramadan', arabic: 'رمضان', icon: 'moon-outline', month: 9, day: 1 },
  { id: 'qadr', name: 'Laylat al-Qadr', arabic: 'ليلة القدر', icon: 'moon-outline', month: 9, day: 27 },
  { id: 'fitr', name: 'Eid ul-Fitr', arabic: 'عيد الفطر', icon: 'time-outline', month: 10, day: 1 },
  { id: 'arafah', name: 'Day of Arafah', arabic: 'يوم عرفة', icon: 'star-outline', month: 12, day: 9 },
  { id: 'adha', name: 'Eid ul-Adha', arabic: 'عيد الأضحى', icon: 'moon-outline', month: 12, day: 10 },
];

const H_MONTHS = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhul-Hijjah"];
const G_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function generateGrid(hijri, events) {
  const todayG = new Date();
  const currentHDay = parseInt(hijri.day, 10);
  
  const firstG = new Date(todayG);
  firstG.setDate(todayG.getDate() - (currentHDay - 1));
  const startOffset = firstG.getDay(); 
  
  const daysInMonth = 30; 
  const grid = [];
  let row = [];
  
  for (let i = 0; i < startOffset; i++) {
    row.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const currentGDate = new Date(firstG);
    currentGDate.setDate(firstG.getDate() + (i - 1));
    
    const hasEvent = events.some(e => e.month === parseInt(hijri.month.number, 10) && e.day === i);
    
    row.push({
      hDay: i,
      gDay: currentGDate.getDate(),
      isToday: i === currentHDay,
      hasEvent
    });
    
    if (row.length === 7) {
      grid.push(row);
      row = [];
    }
  }
  
  if (row.length > 0) {
    while (row.length < 7) row.push(null);
    grid.push(row);
  }
  
  return grid;
}

function IslamicCalendar({ hijriDate }) {
  const { COLORS, CARD_STYLE, isDark } = useAppTheme();
  const [loading, setLoading] = useState(!hijriDate);
  const [hijri, setHijri] = useState(hijriDate || null);

  useEffect(() => {
    if (!hijriDate) {
      fetchHijriDate().then((d) => { setHijri(d); setLoading(false); }).catch(() => setLoading(false));
    }
  }, []);

  const allEvents = useMemo(() => {
    if (!hijri) return [];
    const currentHYear = parseInt(hijri.year, 10);
    const currentHMonth = parseInt(hijri.month.number, 10);
    const currentHDay = parseInt(hijri.day, 10);
    const currentAbsDays = currentHYear * 354 + (currentHMonth - 1) * 29.5 + currentHDay;

    let arr = [];
    for (let y = currentHYear; y <= currentHYear + 1; y++) {
      for (const e of BASE_EVENTS) {
        const evAbsDays = y * 354 + (e.month - 1) * 29.5 + e.day;
        const diff = Math.round(evAbsDays - currentAbsDays);
        if (diff < -300 || diff > 354) continue;
        
        const evGreg = new Date();
        evGreg.setDate(evGreg.getDate() + diff);
        const gDateString = `${G_MONTHS[evGreg.getMonth()]} ${evGreg.getDate()}, ${evGreg.getFullYear()}`;
        const evHDateString = `${e.day} ${H_MONTHS[e.month - 1]} ${y}`;

        arr.push({
          ...e,
          year: y,
          displayName: e.id === 'ramadan' ? `Ramadan ${y}` : e.name,
          daysLeft: diff,
          passed: diff < 0,
          fullDateString: `${evHDateString} · ${gDateString}`
        });
      }
    }
    return arr.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [hijri]);

  if (loading) return <ActivityIndicator color={COLORS.gold} style={{ marginVertical: 40 }} />;
  if (!hijri) return null;

  const currentHYear = parseInt(hijri.year, 10);
  const todayGreg = new Date();
  const nextEvent = allEvents.find(e => !e.passed);
  const grid = generateGrid(hijri, BASE_EVENTS);

  return (
    <View style={{ paddingBottom: 40 }}>
      {/* ── TODAY CARD ── */}
      <View style={[CARD_STYLE, { padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: COLORS.textTertiary, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>TODAY</Text>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 44, color: COLORS.gold, lineHeight: 48 }}>{hijri.day}</Text>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: COLORS.textPrimary }}>{hijri.month.en}</Text>
          <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: COLORS.gold, marginTop: 4 }}>{hijri.month.ar}</Text>
        </View>
        <View style={{ width: 1, height: '80%', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginHorizontal: 20 }} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 32, color: COLORS.textPrimary, lineHeight: 36 }}>{todayGreg.getDate()}</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textSecondary }}>{G_MONTHS[todayGreg.getMonth()]}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary, marginTop: 4 }}>{todayGreg.getFullYear()}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary }}>{todayGreg.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
        </View>
      </View>

      {/* ── CALENDAR GRID ── */}
      <View style={[CARD_STYLE, { padding: 16, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 20, color: COLORS.textPrimary }}>{hijri.month.en}</Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: COLORS.textSecondary }}>{hijri.year}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
          {DAYS.map((d, i) => <Text key={i} style={{ color: COLORS.textTertiary, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{d}</Text>)}
        </View>

        {grid.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
            {row.map((cell, ci) => {
              if (!cell) return <View key={ci} style={{ width: 44, height: 50 }} />;
              return (
                <View key={ci} style={{ 
                  width: 44, height: 50, borderRadius: 12, 
                  backgroundColor: cell.isToday ? COLORS.gold : 'transparent',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: cell.isToday ? '#000' : COLORS.textPrimary }}>
                    {cell.hDay}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: cell.isToday ? 'rgba(0,0,0,0.6)' : COLORS.textTertiary, marginTop: 2 }}>
                    {cell.gDay}
                  </Text>
                  {cell.hasEvent && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: cell.isToday ? (isDark ? '#000' : '#FFF') : COLORS.gold, position: 'absolute', bottom: 4 }} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* ── RAMADAN PREP ── */}
      <View style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 32 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(201,168,76,0.1)' : 'rgba(166,131,38,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
          <Ionicons name="moon-outline" size={20} color={COLORS.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: COLORS.textPrimary }}>Ramadan Prep Mode</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>Starts in ~8 months • Muharram 1448</Text>
        </View>
        <TouchableOpacity style={{ borderWidth: 1, borderColor: COLORS.gold, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: COLORS.gold, fontFamily: 'Inter_500Medium', fontSize: 11 }}>Activate early</Text>
        </TouchableOpacity>
      </View>

      {/* ── NEXT EVENT ── */}
      {nextEvent && (
        <>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>NEXT EVENT</Text>
          <View style={[CARD_STYLE, { padding: 20, marginBottom: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="moon-outline" size={12} color={COLORS.gold} />
                <Text style={{ color: COLORS.gold, fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1, marginLeft: 6 }}>COMING UP</Text>
              </View>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 26, color: COLORS.textPrimary }}>{nextEvent.displayName}</Text>
              <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: COLORS.gold, marginTop: 2 }}>{nextEvent.arabic}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 12 }}>{nextEvent.fullDateString}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', paddingLeft: 12 }}>
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 42, color: COLORS.gold }}>{nextEvent.daysLeft}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textTertiary }}>days away</Text>
            </View>
          </View>
        </>
      )}

      {/* ── ISLAMIC EVENTS ── */}
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: COLORS.textTertiary, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
        ISLAMIC EVENTS {currentHYear}–{currentHYear + 1}
      </Text>
      {allEvents.map((e, idx) => (
        <View key={`${e.id}-${e.year}-${idx}`} style={[CARD_STYLE, { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 }]}>
          <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(15,15,20,0.5)' : 'rgba(0,0,0,0.02)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <Ionicons name={e.icon} size={20} color={COLORS.textSecondary} />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: COLORS.textPrimary }}>{e.displayName}</Text>
            <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 12, color: COLORS.gold, marginTop: 2 }}>{e.arabic}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textTertiary, marginTop: 6 }}>{e.fullDateString}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            {e.passed ? (
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.textTertiary }}>Passed</Text>
            ) : (
              <>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 20, color: COLORS.gold }}>{e.daysLeft}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: COLORS.textTertiary }}>{e.daysLeft === 1 ? 'day away' : 'days away'}</Text>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

export default React.memo(IslamicCalendar);
