import { supabase } from './db.js';

const targetResumeId = '3c208a32-4934-4371-99f5-9245699f5c99';
const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';

async function queryDatabase() {
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

  const { data, error } = await supabase
    .from('resumes')
    .select('id, updated_at, content')
    .eq('id', targetResumeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function run() {
  console.log("=== EXPERIENCE ARRAY BEFORE APPLYING REPLACE_BULLET FIX ===");
  const before = await queryDatabase();
  console.log(JSON.stringify(before.content?.sections?.experience, null, 2));

  console.log("\n=== SENDING APPLY-FIX POST REQUEST ===");
  const response = await fetch(`http://localhost:5000/api/resumes/${targetResumeId}/apply-fix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-user-id': userId
    },
    body: JSON.stringify({
      fixType: 'replace_bullet',
      fix: "MOCK UPDATED EXPERT BULLET CONTENT - ONLY THIS FIELD SHOULD CHANGE!",
      targetLocation: { section: 'experience', index: 0 }
    })
  });

  console.log("API Response Status:", response.status);

  console.log("\n=== EXPERIENCE ARRAY AFTER APPLYING REPLACE_BULLET FIX ===");
  const after = await queryDatabase();
  console.log(JSON.stringify(after.content?.sections?.experience, null, 2));

  // Check that only the description field has changed
  const expBefore = before.content?.sections?.experience?.[0] || {};
  const expAfter = after.content?.sections?.experience?.[0] || {};

  const onlyDescChanged = (
    expBefore.id === expAfter.id &&
    expBefore.role === expAfter.role &&
    expBefore.company === expAfter.company &&
    expBefore.current === expAfter.current &&
    expBefore.endDate === expAfter.endDate &&
    expBefore.location === expAfter.location &&
    expBefore.startDate === expAfter.startDate &&
    expBefore.description !== expAfter.description &&
    expAfter.description === "MOCK UPDATED EXPERT BULLET CONTENT - ONLY THIS FIELD SHOULD CHANGE!"
  );

  console.log(`\nDid ONLY the specific experience bullet description change? ${onlyDescChanged ? 'YES (SUCCESS)' : 'NO (FAILURE)'}`);
}

run().catch(console.error);
