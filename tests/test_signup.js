require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.auth.signUp({
    email: 'test_mizan_' + Date.now() + '@mizan.local',
    password: 'password123'
  });
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
