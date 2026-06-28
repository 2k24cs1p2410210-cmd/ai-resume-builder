async function run() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  const resumeId = '67031608-bf1b-47ef-98ed-f8763d164245';
  
  let list = [];
  for (let i = 1; i <= 10; i++) {
    const response = await fetch(`http://localhost:5000/api/resumes`, {
      headers: {
        'x-test-user-id': userId
      }
    });

    if (response.ok) {
      list = await response.json();
      if (list.length > 0) {
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const data = list.find(r => r.id === resumeId);
  if (!data) {
    console.log("Resume not found! List count:", list.length);
    return;
  }

  console.log("Resume Title:", data.title);
  console.log("Resume Content.Sections:");
  console.log(JSON.stringify(data.sections, null, 2));
}

run().catch(console.error);
