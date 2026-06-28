import { supabase } from './db.js';

async function run() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  
  console.log("Flooding connection pool with set_config RPC calls...");
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(
      supabase.rpc('set_config', {
        setting: 'app.current_user_id',
        value: userId
      })
    );
  }
  await Promise.all(promises);
  console.log("Flooding complete. Executing select query...");

  const { data: list, error: listError } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId);

  if (listError) {
    console.error("Select error:", listError);
    return;
  }

  console.log("Resumes found count:", list.length);
  list.forEach((r, idx) => {
    console.log(`\n========================================`);
    console.log(`Resume [${idx + 1}]:`);
    console.log(`ID: ${r.id}`);
    console.log(`Title: ${r.title}`);
    console.log(`Created At: ${r.created_at}`);
    console.log(`Updated At: ${r.updated_at}`);
    console.log(`Experience:`, JSON.stringify(r.content?.sections?.experience || r.content?.sections?.Experience, null, 2));
    console.log(`Education:`, JSON.stringify(r.content?.sections?.education || r.content?.sections?.Education, null, 2));
  });
}

run().catch(console.error);
