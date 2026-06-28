async function run() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  const resumeId = '3c208a32-4934-4371-99f5-9245699f5c99';
  
  let list = [];
  for (let i = 1; i <= 10; i++) {
    console.log(`[Attempt ${i}] Fetching resumes...`);
    const response = await fetch(`http://localhost:5000/api/resumes`, {
      headers: {
        'x-test-user-id': userId
      }
    });

    if (response.ok) {
      list = await response.json();
      if (list.length > 0) {
        console.log(`Success on attempt ${i}! Resumes count:`, list.length);
        break;
      }
    }
    // Wait 500ms before retrying
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const data = list.find(r => r.id === resumeId);
  if (!data) {
    console.error("Resume not found in the list! List count:", list.length);
    return;
  }

  console.log("ATS Report Categories & Issues:");
  const report = data.atsReport;
  if (!report) {
    console.log("No ATS report found on the resume!");
    return;
  }
  
  Object.entries(report.categories).forEach(([key, value]) => {
    console.log(`\nCategory: ${key} (Score: ${value.score})`);
    if (Array.isArray(value.issues)) {
      value.issues.forEach((issue, idx) => {
        console.log(`  Issue [${idx}]:`);
        console.log(`    ID: ${issue.id}`);
        console.log(`    Desc: ${issue.description}`);
        console.log(`    FixType: ${issue.fixType}`);
        console.log(`    Fix: ${issue.fix}`);
        console.log(`    Target: ${JSON.stringify(issue.targetLocation)}`);
      });
    }
  });
}

run().catch(console.error);
