async function run() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  
  const response = await fetch(`http://localhost:5000/api/resumes`, {
    headers: {
      'x-test-user-id': userId
    }
  });

  if (!response.ok) {
    console.error("API Error:", response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log("Resumes returned:", data.length);
  data.forEach((r, idx) => {
    console.log(`\n--- Resume [${idx + 1}] ---`);
    console.log("ID:", r.id);
    console.log("Title:", r.title);
    console.log("Sections Keys:", Object.keys(r.sections || {}));
    if (r.sections?.projects) {
      console.log("Projects Count:", r.sections.projects.length);
      console.log("Projects descriptions:");
      r.sections.projects.forEach((p, pIdx) => {
        console.log(`  Project [${pIdx}]: ${p.name}`);
        console.log(`    Tech: ${p.technologies}`);
        console.log(`    Desc: ${p.description}`);
      });
    }
    if (r.sections?.summary) {
      console.log("Summary:", r.sections.summary);
    }
    if (r.sections?.skills) {
      console.log("Skills:", r.sections.skills);
    }
  });
}

run().catch(console.error);
