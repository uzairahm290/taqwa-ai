import { getLocalDateString } from '../lib/dateUtils';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { generateInsight } from '../lib/geminiClient';
let hasAttemptedGenerationThisSession = false;

export function useGemini() {
  const [loading, setLoading] = useState(false);

  async function checkAndGenerateInsight() {
    if (hasAttemptedGenerationThisSession) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getLocalDateString();

      // Don't generate more than 1 per day
      const { data: existing } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      if (existing) return;

      hasAttemptedGenerationThisSession = true;

      // Fetch last 30 days of data
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(getLocalDateString(d));
      }

      const [{ data: prayers }, { data: habits }, { data: quran }] = await Promise.all([
        supabase.from('prayers').select('*').eq('user_id', user.id).in('date', days),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).in('date', days),
        supabase.from('quran_logs').select('*').eq('user_id', user.id).in('date', days),
      ]);

      const trigger = detectTrigger(prayers, habits, quran, days);
      if (!trigger) return;

      const last30Days = anonymizeForGemini(prayers, habits, quran, days);
      const message = await generateInsight(last30Days, trigger);

      await supabase.from('ai_insights').insert({
        user_id: user.id,
        date: today,
        message,
        trigger_type: trigger,
      });
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  function anonymizeForGemini(prayers, habits, quran, days) {
    const prayerSummary = days.map((d) => {
      const r = prayers?.find((p) => p.date === d);
      return {
        date: d,
        fajr: !!r?.fajr,
        dhuhr: !!r?.dhuhr,
        asr: !!r?.asr,
        maghrib: !!r?.maghrib,
        isha: !!r?.isha,
      };
    });

    const habitSummary = days.map((d) => ({
      date: d,
      completed: !!(habits?.find((h) => h.date === d && h.completed)),
    }));

    const quranSummary = days.map((d) => {
      const q = quran?.find((r) => r.date === d);
      return { date: d, pages: q?.value || 0 };
    });

    return { prayers: prayerSummary, habits: habitSummary, quran: quranSummary };
  }

  function detectTrigger(prayers, habits, quran, days) {
    const recentDays = days.slice(-7);

    // All 5 prayers complete 7 days in a row
    const allComplete = recentDays.every((d) => {
      const r = prayers?.find((p) => p.date === d);
      return r && r.fajr && r.dhuhr && r.asr && r.maghrib && r.isha;
    });
    if (allComplete) return 'all_prayers_7_days';

    // Same prayer missed 3+ days
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const missed = days.slice(-3).every((d) => {
        const r = prayers?.find((p) => p.date === d);
        return !r || !r[prayer];
      });
      if (missed) return `missed_${prayer}_3_days`;
    }

    // Habit not logged 3+ days
    if (days.slice(-3).every((d) => !habits?.find((h) => h.date === d && h.completed))) {
      return 'habit_missed_3_days';
    }

    // Quran goal falling behind
    if (days.slice(-3).every((d) => !quran?.find((q) => q.date === d && q.value > 0))) {
      return 'quran_behind_3_days';
    }

    return null;
  }

  async function loadTodayInsight() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const today = getLocalDateString();
    const { data } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('dismissed', false)
      .single();

    return data;
  }

  async function dismissInsight(id) {
    await supabase.from('ai_insights').update({ dismissed: true }).eq('id', id);
  }

  return { loading, checkAndGenerateInsight, loadTodayInsight, dismissInsight };
}
