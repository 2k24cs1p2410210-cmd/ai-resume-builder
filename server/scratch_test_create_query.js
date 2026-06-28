import { supabase } from './db.js';

async function run() {
  const userId = 'user_3FRbPOHtoE2I6I0CyUfeqRrKX1V';
  
  console.log("Setting RLS user session to:", userId);
  await supabase.rpc('set_config', {
    setting: 'app.current_user_id',
    value: userId
  });

  console.log("Creating a temporary test resume...");
  const { data: created, error: createError } = await supabase
    .from('resumes')
    .insert({
      user_id: userId,
      title: 'Scratch Test Resume',
      content: {
        templateId: 'minimalist',
        sections: { summary: 'Temporary summary' }
      }
    })
    .select()
    .single();

  if (createError) {
    console.error("Create error:", createError);
    return;
  }

  console.log("Created Resume ID:", created.id);

  console.log("Querying all resumes for the user...");
  const { data: list, error: listError } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId);

  if (listError) {
    console.error("Query error:", listError);
  } else {
    console.log("Resumes found count:", list.length);
    list.forEach(r => {
      console.log(`- ID: ${r.id}, Title: ${r.title}`);
    });
  }

  console.log("Cleaning up temporary resume...");
  await supabase
    .from('resumes')
    .delete()
    .eq('id', created.id);
  console.log("Cleanup done.");
}

run().catch(console.error);
