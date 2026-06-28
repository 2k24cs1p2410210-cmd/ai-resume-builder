import { supabase } from '../server/db.js';

async function testFlow() {
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
  console.log("Flooding complete.");

  // Step 1: Create a test resume
  console.log("\n=== STEP 1: CREATING TEST RESUME ===");
  const createResponse = await fetch('http://localhost:5000/api/resumes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-user-id': userId
    },
    body: JSON.stringify({
      title: 'Test Flow Resume',
      templateId: 'minimalist',
      sections: {
        contact: { name: 'Flow Tester' },
        summary: 'Original Summary Text.',
        experience: [
          { id: 'exp1', role: 'Tester', company: 'Flow LLC', description: 'Original Bullet.' }
        ],
        skills: ['Testing'],
        projects: []
      }
    })
  });

  if (!createResponse.ok) {
    console.error("Create failed:", createResponse.status, await createResponse.text());
    return;
  }

  const created = await createResponse.json();
  const resumeId = created.id;
  console.log("Created Resume ID:", resumeId);

  // Step 2: Apply fix via POST /api/resumes/:id/apply-fix
  const testSummary = `Updated Summary at ${Date.now()}`;
  console.log(`\n=== STEP 2: APPLYING FIX: "${testSummary}" ===`);
  
  const applyResponse = await fetch(`http://localhost:5000/api/resumes/${resumeId}/apply-fix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-user-id': userId
    },
    body: JSON.stringify({
      fixType: 'rewrite_summary',
      fix: testSummary,
      targetLocation: { section: 'summary' }
    })
  });

  if (!applyResponse.ok) {
    console.error("Apply Fix API failed:", applyResponse.status, await applyResponse.text());
    return;
  }

  const applyResult = await applyResponse.json();
  console.log("Apply Fix API returned summary:", applyResult.sections?.summary);

  // Step 3: Fetch resume via GET /api/resumes/:id
  console.log("\n=== STEP 3: FETCHING RESUME VIA GET API ===");
  const getResponse = await fetch(`http://localhost:5000/api/resumes/${resumeId}?t=${Date.now()}`, {
    method: 'GET',
    headers: {
      'x-test-user-id': userId
    }
  });

  if (!getResponse.ok) {
    console.error("GET API failed:", getResponse.status, await getResponse.text());
    return;
  }

  const getResult = await getResponse.json();
  console.log("GET API returned summary:", getResult.sections?.summary);

  const success = getResult.sections?.summary === testSummary;
  console.log(`\nResult matches updated: ${success ? 'SUCCESS' : 'FAILURE'}`);

  // Cleanup
  console.log("\n=== CLEANUP ===");
  await supabase
    .from('resumes')
    .delete()
    .eq('id', resumeId);
  console.log("Deleted test resume.");
}

testFlow().catch(console.error);
