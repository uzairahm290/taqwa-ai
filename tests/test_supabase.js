require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('duas').select('*').limit(1);
  console.log("SELECT DATA:", data);
  console.log("SELECT ERROR:", error);
}
test();
