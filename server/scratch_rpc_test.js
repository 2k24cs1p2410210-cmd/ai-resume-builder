import { supabase } from './db.js';

async function run() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  
  console.log("Setting RLS user session to:", userId);
  const { data, error } = await supabase.rpc('set_config', {
    setting: 'app.current_user_id',
    value: userId
  });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Success. Returned data:", data);
  }
}

run().catch(console.error);
