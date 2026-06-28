import { supabase } from './db.js';

async function inspect() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  const resumeId = '3c208a32-4934-4371-99f5-9245699f5c99';
  console.log("Setting RLS user session to:", userId);
  await supabase.rpc('set_config', {
    setting: 'app.current_user_id',
    value: userId
  });

  console.log("Fetching resume:", resumeId);
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', resumeId)
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  if (!data) {
    console.log("Resume not found!");
    return;
  }

  console.log("Resume Title:", data.title);
  console.log("Resume Content (pretty-printed):");
  console.log(JSON.stringify(data.content, null, 2));
}

inspect().catch(console.error);
