import { useState, useEffect } from 'react';
import { fetchHijriDate } from '../lib/aladhanClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ISLAMIC_EVENTS = [
  { month: 1, day: 1, name: 'Islamic New Year', icon: 'Moon01Icon' },
  { month: 1, day: 10, name: 'Ashura', icon: 'Moon01Icon' },
  { month: 3, day: 12, name: "Milad un-Nabi", icon: 'Moon01Icon' },
  { month: 7, day: 27, name: 'Lailat al-Miraj', icon: 'Moon01Icon' },
  { month: 8, day: 15, name: 'Mid-Shaban', icon: 'Moon01Icon' },
  { month: 9, day: 1, name: 'Ramadan Begins', icon: 'RamadhanMonthIcon' },
  { month: 9, day: 27, name: 'Laylat al-Qadr', icon: 'Quran01Icon' },
  { month: 10, day: 1, name: 'Eid al-Fitr', icon: 'Moon01Icon' },
  { month: 12, day: 9, name: 'Day of Arafah', icon: 'Moon01Icon' },
  { month: 12, day: 10, name: 'Eid al-Adha', icon: 'Moon01Icon' },
];

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah',
];

export function useUpcomingEvent() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cached = await AsyncStorage.getItem('@hijri_date');
        let hijri = cached ? JSON.parse(cached) : null;
        
        // Fetch new if not cached or cache is from a different day or old format without year
        const todayStr = new Date().toDateString();
        if (!hijri || hijri.gregorianDate !== todayStr || !hijri.year) {
          try {
            const data = await fetchHijriDate();
            if (data) {
              hijri = {
                month: data.month.number,
                day: parseInt(data.day, 10),
                year: parseInt(data.year, 10),
                gregorianDate: todayStr
              };
              await AsyncStorage.setItem('@hijri_date', JSON.stringify(hijri));
            }
          } catch (_e) {
            // Keep existing cache if offline
          }
        }
        
        if (hijri) {
          const currentScore = hijri.month * 30 + hijri.day;
          let nextEvent = null;
          let minDiff = Infinity;
          
          for (const ev of ISLAMIC_EVENTS) {
            let evScore = ev.month * 30 + ev.day;
            let diff = evScore - currentScore;
            let isNextYear = false;
            // If the event has passed this year, it's next year (approx 354 days per Islamic year)
            if (diff < 0) {
              diff += 354; 
              isNextYear = true;
            }
            
            if (diff >= 0 && diff < minDiff) {
              minDiff = diff;
              const eventYear = hijri.year ? (hijri.year + (isNextYear ? 1 : 0)) : null;
              const formattedDate = eventYear ? `${ev.day} ${HIJRI_MONTHS[ev.month - 1]} ${eventYear} AH` : `${ev.day} ${HIJRI_MONTHS[ev.month - 1]}`;
              nextEvent = { ...ev, daysRemaining: diff, formattedDate };
            }
          }
          setEvent(nextEvent);
        }
      } catch (e) {
        console.error('Failed to load upcoming event', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { event, loading };
}
