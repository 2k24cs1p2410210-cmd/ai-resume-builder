import { supabase } from './db.js';

async function listAll() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  
  console.log("Setting RLS user session to:", userId);
  await supabase.rpc('set_config', {
    setting: 'app.current_user_id',
    value: userId
  });

  console.log("Fetching all resumes for the user from Supabase...");
  const { data, error } = await supabase
    .from('resumes')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Resumes found count:", data ? data.length : 0);
  if (data && data.length > 0) {
    data.forEach(r => {
      console.log(`- ID: ${r.id}, Title: ${r.title}, User ID: ${r.user_id}`);
    });
  }
}

listAll().catch(console.error);
