require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.rpc('get_schema_info', {}); 
  // If rpc doesn't work, we can just login with a dummy user or try to insert to get the exact error
  // Let's try inserting with a dummy token or we can just try to insert without auth to see the exact error:
  const { data: iData, error: iErr } = await supabase.from('duas').insert([{ arabic: 'test', user_id: '00000000-0000-0000-0000-000000000000' }]);
  console.log("INSERT ERROR:", iErr);
}
test();
