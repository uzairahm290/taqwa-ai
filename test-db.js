import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { error: logsError } = await supabase.from('quran_logs').select('*').limit(1);
  console.log('quran_logs error:', logsError);

  const { error: surahsError } = await supabase.from('quran_surahs').select('*').limit(1);
  console.log('quran_surahs error:', surahsError);

  const { error: settingsError } = await supabase.from('quran_settings').select('*').limit(1);
  console.log('quran_settings error:', settingsError);
}
test();
