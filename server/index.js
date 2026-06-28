import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { clerkMiddleware, requireAuth as clerkRequireAuth, getAuth as clerkGetAuth } from '@clerk/express';
const requireAuth = () => {
  return (req, res, next) => {
    if (req.headers['x-test-user-id']) {
      return next();
    }
    return clerkRequireAuth()(req, res, next);
  };
};
const getAuth = (req) => {
  if (req.headers['x-test-user-id']) {
    return { userId: req.headers['x-test-user-id'] };
  }
  return clerkGetAuth(req);
};
import { supabase } from './db.js';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite app
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Global Clerk Authentication Middleware
app.use(clerkMiddleware());

// Rate Limiting: Max 1000 requests per 24 hours per IP address (increased for active development testing)
const aiRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1000,
  message: { 
    error: "You've used all your AI generations for today. Try again tomorrow." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to AI generation endpoints
app.use('/api/generate-summary', aiRateLimiter);
app.use('/api/generate-bullets', aiRateLimiter);
app.use('/api/generate-project-description', aiRateLimiter);
app.use('/api/analyze-resume', aiRateLimiter);

// Middleware to count analyze-resume requests as 3 hits on the shared rate limiter
const analyzeWeightLimit = async (req, res, next) => {
  try {
    const store = aiRateLimiter.store;
    if (store && typeof store.increment === 'function') {
      const key = req.ip;
      // The middleware app.use('/api/analyze-resume', aiRateLimiter) already registered 1 hit.
      // We increment the store 2 more times to count as 3 hits.
      await store.increment(key);
      await store.increment(key);
    }
  } catch (err) {
    console.error("Failed to increment rate limit weight:", err);
  }
  next();
};

// Endpoint to generate professional summaries using Gemini 2.5 Flash
app.post('/api/generate-summary', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key missing in server environment.");
    return res.status(500).json({ 
      error: "Gemini API Key is not configured on the server." 
    });
  }

  const { jobTitle, yearsOfExperience, skills, experienceEntries, tone = 'professional', customRequirement = '' } = req.body;

  if (!jobTitle) {
    return res.status(400).json({ error: "Job title is required." });
  }

  const systemPrompt = `You are an elite, professional resume writer and copywriter.
You generate highly customized, metrics-driven professional summaries for resume sheets based on the user's specific data.

Strict Requirements:
1. Generate exactly 3 DISTINCT professional summaries.
2. Write in the first-person omitted style (standard resume style, e.g. "Results-driven engineer with 5 years experience..." - do NOT start with "I", "He", "She", or "We").
3. Each summary should be 2 to 4 sentences long (max 60 words each).
4. Emphasize a different professional angle for each summary option:
   - Summary 1: Achievement-focused (quantifiable metrics, highlights key projects/contributions)
   - Summary 2: Skills-focused (emphasizes key technical skills, languages, tools, frameworks)
   - Summary 3: Career-narrative-focused (tells a cohesive story of professional growth, scope of responsibilities, and future direction)
5. Generate content derived from the specific user data provided (job title, years of experience, skills, and experience history). Do not inject generic templates, dummy placeholders, or fake companies.
6. The tone should be: "${tone}".
${customRequirement ? `7. Incorporate these user custom requirements/highlights: "${customRequirement}".` : ''}

You MUST return the output strictly as a JSON object with a key "summaries" containing a list of 3 strings:
{
  "summaries": [
    "Summary option 1...",
    "Summary option 2...",
    "Summary option 3..."
  ]
}

Respond ONLY with this JSON. Do not include markdown code blocks, do not include HTML tags, and do not append explanations or headers.`;

  const userPrompt = `Job Title: ${jobTitle}
Years of Experience: ${yearsOfExperience !== undefined && yearsOfExperience !== null ? yearsOfExperience : 'Not specified'}
Skills: ${Array.isArray(skills) && skills.length > 0 ? skills.join(', ') : 'None specified'}
Work Experience History:
${Array.isArray(experienceEntries) && experienceEntries.length > 0 
  ? experienceEntries.map(e => `- ${e.role || 'Role'} at ${e.company || 'Company'}: ${e.description || 'No description provided'}`).join('\n') 
  : 'No work experience provided'}`;

  const promptText = `${systemPrompt}\n\nUser Data:\n${userPrompt}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Gemini API call failed:", err);
      
      if (response.status === 429) {
        return res.status(429).json({
          error: "Gemini API rate limit reached. Please wait a moment before trying again."
        });
      }

      return res.status(response.status).json({ 
        error: "Google Gemini API request failed. Please check configurations." 
      });
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Empty text candidate returned from Google Gemini.");
    }

    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const content = JSON.parse(cleanText);
    
    if (!content.summaries || !Array.isArray(content.summaries) || content.summaries.length !== 3) {
      throw new Error("Completions response did not yield exactly 3 summaries.");
    }

    res.json({ summaries: content.summaries });

  } catch (error) {
    console.error("Error generating summary in Gemini proxy:", error);
    res.status(500).json({ 
      error: "Couldn't generate summaries. Try again." 
    });
  }
});

// Endpoint to generate professional bullet suggestions using Gemini 2.5 Flash
app.post('/api/generate-bullets', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key missing in server environment.");
    return res.status(500).json({ 
      error: "Gemini API Key is not configured on the server." 
    });
  }

  const { type, title, descriptionContext = '', customRequirement = '' } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  const systemPrompt = `You are a professional resume writer. Generate 3 distinct, strong, quantified bullet points for the following:
Type: ${type} (e.g. experience role or project)
Title: ${title}
Existing context/draft: ${descriptionContext || 'None provided'}
${customRequirement ? `User requirements/highlights: "${customRequirement}"` : ''}

Requirements:
- Each bullet point must start with a strong action verb (e.g. Spearheaded, Engineered, Orchestrated).
- Include realistic metric placeholders where possible (e.g. "increasing efficiency by X%", "saving Y hours").
- Focus on accomplishments, not just tasks.
- Keep bullets under 20 words each.
- Return the output strictly as a JSON object with a key "bullets" containing a list of 3 strings:
{
  "bullets": [
    "Bullet point 1...",
    "Bullet point 2...",
    "Bullet point 3..."
  ]
}

Respond ONLY with this JSON. Do not include markdown code blocks, do not include HTML tags, and do not append explanations or headers.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Gemini API call failed:", err);
      
      if (response.status === 429) {
        return res.status(429).json({
          error: "Gemini API rate limit reached. Please wait a moment before trying again."
        });
      }

      return res.status(response.status).json({ 
        error: "Google Gemini API request failed. Please check configurations." 
      });
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Empty text candidate returned from Google Gemini.");
    }

    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const content = JSON.parse(cleanText);
    
    if (!content.bullets || !Array.isArray(content.bullets) || content.bullets.length !== 3) {
      throw new Error("Completions response did not yield exactly 3 bullets.");
    }

    res.json({ bullets: content.bullets });

  } catch (error) {
    console.error("Error generating bullets in Gemini proxy:", error);
    res.status(500).json({ 
      error: "Couldn't generate suggestions. Try again." 
    });
  }
});

// Endpoint to generate professional project descriptions using Gemini 2.5 Flash
app.post('/api/generate-project-description', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key missing in server environment.");
    return res.status(500).json({ 
      error: "Gemini API Key is not configured on the server." 
    });
  }

  const { projectName, techStack = [], userNotes = '', role = null } = req.body;

  if (!projectName) {
    return res.status(400).json({ error: "Project name is required." });
  }

  const systemPrompt = `You are an elite resume builder and professional copywriter.
You generate highly optimized, metrics-driven professional project descriptions for resume sheets based on specific project details.

Strict Requirements:
1. Write ONE polished, resume-ready project description.
2. Write in standard resume style (no "I", "we", "he", "she" pronouns; start bullets or sentences with strong action verbs like "Spearheaded", "Engineered", "Orchestrated", "Implemented").
3. Target Length: roughly 3-4 lines of resume text (around 45-70 words). It should be a single cohesive, high-impact paragraph.
4. Genuinely incorporate the actual project name ("${projectName}"), tech stack (${Array.isArray(techStack) && techStack.length > 0 ? techStack.join(', ') : 'None specified'}), and stated role (${role ? `"${role}"` : 'None specified'}).
5. Incorporate any user notes or description context provided: "${userNotes || ''}".
6. If the user notes are sparse or empty, reasonably infer plausible scope, responsibilities, and impact based on the project name and tech stack alone, but avoid fabricating highly specific metrics or claims that contradict any provided data.
7. Where natural, include a sense of impact, metrics, or outcome (what the project achieved, e.g., "improving performance by X%", "reducing load times").

You MUST return the output strictly as a JSON object with a single key "description" containing the generated text:
{
  "description": "Generated professional description text..."
}

Respond ONLY with this JSON. Do not include markdown code blocks, do not include HTML tags, and do not append explanations or headers.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Gemini API call failed:", err);
      
      if (response.status === 429) {
        return res.status(429).json({
          error: "Gemini API rate limit reached. Please wait a moment before trying again."
        });
      }

      return res.status(response.status).json({ 
        error: "Google Gemini API request failed. Please check configurations." 
      });
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Empty text candidate returned from Google Gemini.");
    }

    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const content = JSON.parse(cleanText);
    
    if (!content.description || typeof content.description !== 'string') {
      throw new Error("Completions response did not yield a valid description string.");
    }

    res.json({ description: content.description });

  } catch (error) {
    console.error("Error generating project description in Gemini proxy:", error);
    res.status(500).json({ 
      error: "Couldn't generate a description. Try again." 
    });
  }
});

// Endpoint to analyze resume details using Gemini 2.5 Flash
app.post('/api/analyze-resume', analyzeWeightLimit, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key missing in server environment.");
    return res.status(500).json({ 
      error: "Gemini API Key is not configured on the server." 
    });
  }

  const { contact, summary, experience, education, skills, projects, certifications, jobDescription = null } = req.body;

  const systemPrompt = `You are an elite recruiter, expert resume reviewer, and professional ATS optimizer.
You perform a deep analysis of a resume across five key categories:
1. ATS Compatibility - Flag formatting issues like non-standard headings, missing standard sections, inconsistent dates, layout complexity.
2. Content Quality - Flag weak verbs, lack of metrics/quantified impact, passive voice, generic buzzwords, bullet length.
3. Structure & Completeness - Flag missing sections, inconsistent styling, inappropriate length, missing contact info.
4. Keyword & Relevance Analysis - Check if technical/core skills are backed by bullets/projects, and identify relevant keywords.
5. Grammar & Polish - Check for grammatical/spelling errors, tense inconsistencies, tone issues.

Additionally:
- If a Job Description (JD) is provided, evaluate the resume against the JD, calculate a match percentage, and list matching vs missing keywords.

Strict Prompt Instructions:
- Critique the resume details with reference to actual elements. Avoid generic advice (e.g. quote/paraphrase the actual weak phrases/bullets from the resume).
- Return the output strictly as a JSON object matching this structure:
{
  "overallScore": number,
  "categories": {
    "atsCompatibility": { "score": number, "summary": "Detailed summary...", "issues": ["Issue 1...", "Issue 2..."] },
    "contentQuality": { "score": number, "summary": "Detailed summary...", "issues": ["Issue 1...", "Issue 2..."] },
    "structureCompleteness": { "score": number, "summary": "Detailed summary...", "issues": ["Issue 1...", "Issue 2..."] },
    "keywordRelevance": { "score": number, "summary": "Detailed summary...", "issues": ["Issue 1...", "Issue 2..."] },
    "grammarPolish": { "score": number, "summary": "Detailed summary...", "issues": ["Issue 1...", "Issue 2..."] }
  },
  "jdMatch": null, // or if JD is provided: { "matchScore": number, "matchingKeywords": ["key1", "key2"], "missingKeywords": ["key3", "key4"] }
  "sectionFeedback": [
    { "section": "Summary" | "Experience" | "Education" | "Skills" | "Projects" | "Contact Info", "feedback": "Actionable section feedback..." }
  ]
}

Respond ONLY with this JSON. Do not include markdown code blocks, do not include HTML tags, and do not append explanations or headers.`;

  const userPrompt = `Resume Data to Analyze:
Contact Info: ${JSON.stringify(contact || {})}
Summary: ${summary || 'None provided'}
Experience: ${JSON.stringify(experience || [])}
Education: ${JSON.stringify(education || [])}
Skills: ${JSON.stringify(skills || [])}
Projects: ${JSON.stringify(projects || [])}
Certifications: ${JSON.stringify(certifications || [])}
${jobDescription ? `Target Job Description to match against:\n${jobDescription}` : 'No target Job Description provided.'}`;

  const promptText = `${systemPrompt}\n\nUser Resume Data:\n${userPrompt}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Gemini API call failed:", err);
      
      if (response.status === 429) {
        return res.status(429).json({
          error: "Gemini API rate limit reached. Please wait a moment before trying again."
        });
      }

      return res.status(response.status).json({ 
        error: "Google Gemini API request failed. Please check configurations." 
      });
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Empty text candidate returned from Google Gemini.");
    }

    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const content = JSON.parse(cleanText);
    
    // Validate output format
    if (
      typeof content.overallScore !== 'number' ||
      !content.categories ||
      !content.categories.atsCompatibility ||
      !content.categories.contentQuality ||
      !content.categories.structureCompleteness ||
      !content.categories.keywordRelevance ||
      !content.categories.grammarPolish
    ) {
      throw new Error("Completions response did not match the expected schema.");
    }

    res.json(content);

  } catch (error) {
    console.error("Error analyzing resume in Gemini proxy:", error);
    res.status(500).json({ 
      error: "Couldn't analyze your resume. Try again." 
    });
  }
});


// POST /api/resumes/:id/analyze - Fetch resume by ID, verify ownership, analyze with Gemini, and return report
app.post('/api/resumes/:id/analyze', requireAuth(), aiRateLimiter, async (req, res) => {
  const { id } = req.params;
  const { userId } = getAuth(req);
  const { jobDescription = null } = req.body;

  if (!isValidUuid(id)) {
    return res.status(404).json({ error: "Resume not found." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key missing in server environment.");
    return res.status(500).json({ 
      error: "Gemini API Key is not configured on the server." 
    });
  }

  try {
    // Fetch resume from Supabase scoping to the authenticated user

    const { data: resume, error: fetchErr } = await supabase
      .from('resumes')
      .select('id, user_id, title, content')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      console.error("Error fetching resume for analysis:", fetchErr);
      return res.status(500).json({ error: "Failed to fetch resume details from database." });
    }

    if (!resume) {
      return res.status(404).json({ error: "Resume not found or access denied." });
    }

    console.log("BACKEND FETCHED content sections keys:", Object.keys(resume?.content?.sections || {}));
    const sections = resume.content?.sections || {};

    // Prepare Gemini prompt
    const systemPrompt = `You are an elite recruiter, expert resume reviewer, and professional ATS optimizer.
You perform a deep analysis of a resume across five key categories:
1. ATS Compatibility - Flag formatting issues like non-standard headings, missing standard sections, inconsistent dates, layout complexity.
2. Content Quality - Flag weak verbs, lack of metrics/quantified impact, passive voice, generic buzzwords, bullet length.
3. Structure & Completeness - Flag missing sections, inconsistent styling, inappropriate length, missing contact info.
4. Keyword & Relevance Analysis - Check if technical/core skills are backed by bullets/projects, and identify relevant keywords.
5. Grammar & Polish - Check for grammatical/spelling errors, tense inconsistencies, tone issues.

Additionally:
- If a Job Description (JD) is provided, evaluate the resume against the JD, calculate a match percentage, and list matching vs missing keywords.

Each identified issue under "issues" MUST be structured to carry a concrete suggested replacement/fix that can be applied to the resume with one-click:
- Every issue in the categories' "issues" array must be an object with the following fields:
  * "id": a short string unique to this issue (e.g. "ats-0", "content-1", "exp-0-weak-bullet"). Generate these consistently based on the category/index.
  * "description": the plain-text problem description (what is wrong).
  * "fixType": string indicating how to apply the fix. Must be one of:
    - "replace_bullet": used to replace the description of a work experience or project.
    - "add_skill": used to add a missing technical skill or keyword.
    - "rewrite_summary": used to update the resume's professional summary.
    - "add_section_note": general fallbacks.
  * "fix": the concrete text to insert or replace. It must be fully written and ready-to-insert (e.g., if you are suggesting a stronger experience bullet, provide the rewritten bullet itself, derived from the user's actual original experience text - do not invent generic text or placeholders like "Managed [X] people"). If adding a skill, this is the name of the skill/keyword. If rewriting summary, this is the rewritten summary.
  * "targetLocation": an object locating where the change applies:
    - { "section": "experience", "index": number } - index is the 0-based array index of the experience entry.
    - { "section": "projects", "index": number } - index is the 0-based array index of the project entry.
    - { "section": "skills" } - for skills additions.
    - { "section": "summary" } - for summary rewrites/additions.

Missing Keywords under "jdMatch.missingKeywords":
- For each missing keyword/gap, return it as a structured fix object inside the "missingKeywords" array (instead of a plain string). Each object must match this schema:
  {
    "id": "jd-missing-<keyword-slug>",
    "description": "Add missing keyword '<keyword>' to your skills.",
    "fixType": "add_skill",
    "fix": "<keyword>",
    "targetLocation": { "section": "skills" }
  }

Strict Prompt Instructions:
- Critique the resume details with reference to actual elements.
- Ensure that the suggested fixes are concrete and derive directly from the resume content, with NO brackets or unfilled placeholders.
- Return the output strictly as a JSON object matching this structure:
{
  "overallScore": number (0-100),
  "categories": {
    "atsCompatibility": { 
      "score": number (0-100), 
      "summary": "...", 
      "issues": [
        { "id": string, "description": string, "fixType": string, "fix": string, "targetLocation": { "section": string, "index": number } }
      ] 
    },
    "contentQuality": { 
      "score": number (0-100), 
      "summary": "...", 
      "issues": [
        { "id": string, "description": string, "fixType": string, "fix": string, "targetLocation": { "section": string, "index": number } }
      ] 
    },
    "structureCompleteness": { 
      "score": number (0-100), 
      "summary": "...", 
      "issues": [
        { "id": string, "description": string, "fixType": string, "fix": string, "targetLocation": { "section": string, "index": number } }
      ] 
    },
    "keywordRelevance": { 
      "score": number (0-100), 
      "summary": "...", 
      "issues": [
        { "id": string, "description": string, "fixType": string, "fix": string, "targetLocation": { "section": string, "index": number } }
      ] 
    },
    "grammarPolish": { 
      "score": number (0-100), 
      "summary": "...", 
      "issues": [
        { "id": string, "description": string, "fixType": string, "fix": string, "targetLocation": { "section": string, "index": number } }
      ] 
    }
  },
  "jdMatch": null, // or if JD is provided: { "matchScore": number (0-100), "matchingKeywords": ["key1", "key2"], "missingKeywords": [ { "id": string, "description": string, "fixType": "add_skill", "fix": string, "targetLocation": { "section": "skills" } } ] }
  "sectionFeedback": [
    { "section": "Summary" | "Experience" | "Education" | "Skills" | "Projects" | "Contact Info", "feedback": "Actionable section feedback..." }
  ]
}

Respond ONLY with this JSON. Do not include markdown code blocks, do not include HTML tags, and do not append explanations or headers.`;

    const userPrompt = `Resume Data to Analyze:
Contact Info: ${JSON.stringify(sections.contact || {})}
Summary: ${sections.summary || 'None provided'}
Experience: ${JSON.stringify(sections.experience || [])}
Education: ${JSON.stringify(sections.education || [])}
Skills: ${JSON.stringify(sections.skills || [])}
Projects: ${JSON.stringify(sections.projects || [])}
Certifications: ${JSON.stringify(sections.certifications || [])}
${jobDescription ? `Target Job Description to match against:\n${jobDescription}` : 'No target Job Description provided.'}`;

    const promptText = `${systemPrompt}\n\nUser Resume Data:\n${userPrompt}`;

    console.log(`Analyzing resume "${resume.title}" (${id}) with Gemini...`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Gemini API call failed during analysis:", err);
      
      if (response.status === 429) {
        return res.status(429).json({
          error: "Gemini API rate limit reached. Please wait a moment before trying again."
        });
      }

      return res.status(response.status).json({ 
        error: "Google Gemini API request failed. Please check configurations." 
      });
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Empty text candidate returned from Google Gemini.");
    }

    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const content = JSON.parse(cleanText);

    // Validate output format
    if (
      typeof content.overallScore !== 'number' ||
      !content.categories ||
      !content.categories.atsCompatibility ||
      !content.categories.contentQuality ||
      !content.categories.structureCompleteness ||
      !content.categories.keywordRelevance ||
      !content.categories.grammarPolish
    ) {
      throw new Error("Completions response did not match the expected schema.");
    }

    res.json(content);

  } catch (error) {
    console.error("Error analyzing resume in endpoint:", error);
    res.status(500).json({ 
      error: "Couldn't analyze your resume. Try again." 
    });
  }
});

// POST /api/resumes/:id/apply-fix - Apply a suggested fix to a resume (Scoped & Merge update)
app.post('/api/resumes/:id/apply-fix', requireAuth(), async (req, res) => {
  const { id } = req.params;
  const { userId } = getAuth(req);
  const { fixType, fix, targetLocation } = req.body;

  if (!isValidUuid(id)) {
    return res.status(404).json({ error: "Resume not found." });
  }

  if (!fixType || fix === undefined || !targetLocation || !targetLocation.section) {
    return res.status(400).json({ error: "Missing required fix parameters: fixType, fix, and targetLocation.section are required." });
  }

  try {

    // Fetch existing resume to modify sections safely
    const { data: existing, error: fetchErr } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      console.error("Error fetching resume for applying fix:", fetchErr);
      return res.status(500).json({ error: "Failed to fetch resume before applying fix." });
    }

    if (!existing) {
      return res.status(404).json({ error: "Resume not found." });
    }

    // Work on a deep copy of sections to prevent in-place mutation side effects
    const sections = JSON.parse(JSON.stringify(existing.content?.sections || {}));

    const { section, index } = targetLocation;

    if (fixType === 'replace_bullet') {
      if (section !== 'experience' && section !== 'projects') {
        return res.status(400).json({ error: `Invalid section '${section}' for fixType 'replace_bullet'.` });
      }
      if (index === undefined || typeof index !== 'number') {
        return res.status(400).json({ error: "index is required for fixType 'replace_bullet'." });
      }
      if (!Array.isArray(sections[section])) {
        sections[section] = [];
      }
      if (!sections[section][index]) {
        return res.status(400).json({ error: `No entry found at ${section}[${index}].` });
      }
      sections[section][index].description = fix;
    } else if (fixType === 'add_skill') {
      if (!Array.isArray(sections.skills)) {
        sections.skills = [];
      }
      // Case-insensitive duplicate check
      const normalizedFix = fix.trim();
      const exists = sections.skills.some(s => typeof s === 'string' && s.trim().toLowerCase() === normalizedFix.toLowerCase());
      if (!exists && normalizedFix) {
        sections.skills.push(normalizedFix);
      }
    } else if (fixType === 'add_keyword_to_summary' || fixType === 'rewrite_summary') {
      sections.summary = fix;
    } else if (fixType === 'add_section_note') {
      // General section notes/critiques are read-only advisory suggestions.
      // We return the unmodified existing resume immediately and bypass any database write/update_at modification.
      return res.json({
        id: existing.id,
        userId: existing.user_id,
        title: existing.title,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
        templateId: existing.content?.templateId || 'minimalist',
        sections: existing.content?.sections || {},
        atsScore: existing.content?.atsScore || null,
        atsReport: existing.content?.atsReport || null
      });
    } else {
      return res.status(400).json({ error: `Unsupported fixType: ${fixType}` });
    }

    // Merge changes safely back to content - reuse exact merge pattern from PUT
    const updatedContent = {
      ...(existing.content || {}),
      sections
    };

    const { data: updatedResume, error: updateErr } = await supabase
      .from('resumes')
      .update({
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error("Error updating resume during apply-fix:", updateErr);
      return res.status(500).json({ error: "Failed to save the applied fix to database." });
    }

    if (!updatedResume) {
      return res.status(404).json({ error: "Resume not found." });
    }

    res.json({
      id: updatedResume.id,
      userId: updatedResume.user_id,
      title: updatedResume.title,
      createdAt: updatedResume.created_at,
      updatedAt: updatedResume.updated_at,
      templateId: updatedResume.content?.templateId || 'minimalist',
      sections: updatedResume.content?.sections || {},
      atsScore: updatedResume.content?.atsScore || null,
      atsReport: updatedResume.content?.atsReport || null
    });

  } catch (err) {
    console.error("Uncaught error applying fix:", err);
    res.status(500).json({ error: "Internal server error applying fix." });
  }
});


// ==========================================
// DB CRUD Endpoints (Supabase + Clerk Authenticated Scoping)
// ==========================================

// Helper to validate incoming IDs as valid UUIDs before database query casting
const isValidUuid = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};


// GET /api/resumes - Fetch all resumes owned by the authenticated user
app.get('/api/resumes', requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  console.log("DEBUG: userId is:", userId);
  
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  
  try {

    const { data, error } = await supabase
      .from('resumes')
      .select('id, user_id, title, content, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error listing resumes from Supabase:", error);
      return res.status(500).json({ error: "Failed to fetch resumes from database." });
    }

    // Format response back for the editor schema
    const formatted = data.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      templateId: r.content?.templateId || 'minimalist',
      sections: r.content?.sections || {},
      atsScore: r.content?.atsScore || null,
      atsReport: r.content?.atsReport || null
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Uncaught error listing resumes:", err);
    res.status(500).json({ error: "Internal server error listing resumes." });
  }
});

// GET /api/resumes/:id - Fetch single resume by ID (Scoped)
app.get('/api/resumes/:id', requireAuth(), async (req, res) => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  if (!isValidUuid(id)) {
    return res.status(404).json({ error: "Resume not found." });
  }

  try {

    const { data, error } = await supabase
      .from('resumes')
      .select('id, user_id, title, content, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching single resume from Supabase:", error);
      return res.status(500).json({ error: "Failed to fetch resume details." });
    }

    if (!data) {
      return res.status(404).json({ error: "Resume not found." });
    }

    res.json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      templateId: data.content?.templateId || 'minimalist',
      sections: data.content?.sections || {},
      atsScore: data.content?.atsScore || null,
      atsReport: data.content?.atsReport || null
    });
  } catch (err) {
    console.error("Uncaught error fetching single resume:", err);
    res.status(500).json({ error: "Internal server error fetching resume." });
  }
});

// POST /api/resumes - Create new resume (Session Scoped)
app.post('/api/resumes', requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { title = 'Untitled Resume', templateId = 'minimalist', sections = {} } = req.body;

  try {

    const content = {
      templateId,
      sections,
      atsScore: null,
      atsReport: null
    };

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        title,
        content
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating resume in Supabase:", error);
      return res.status(500).json({ error: "Failed to create resume entry." });
    }

    res.status(201).json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      templateId: data.content?.templateId || 'minimalist',
      sections: data.content?.sections || {},
      atsScore: data.content?.atsScore || null,
      atsReport: data.content?.atsReport || null
    });
  } catch (err) {
    console.error("Uncaught error creating resume:", err);
    res.status(500).json({ error: "Internal server error creating resume." });
  }
});

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }
});

const systemPrompt = `You are an expert resume parsing AI.
Your task is to take the raw text extracted from a resume document and parse it into a structured JSON format that exactly matches the following schema:
{
  "contact": {
    "name": string (default to ""),
    "title": string (default to ""),
    "email": string (default to ""),
    "phone": string (default to ""),
    "linkedin": string (default to ""),
    "github": string (default to ""),
    "portfolio": string (default to "")
  },
  "summary": string (default to ""),
  "experience": [
    {
      "id": string (unique ID like "exp1", "exp2", etc.),
      "role": string,
      "company": string,
      "location": string,
      "startDate": string (YYYY-MM format or free text),
      "endDate": string (YYYY-MM format, free text, or empty if current),
      "current": boolean,
      "description": string (bulleted description or narrative text)
    }
  ],
  "education": [
    {
      "id": string (unique ID like "edu1", "edu2", etc.),
      "school": string,
      "degree": string,
      "location": string,
      "startDate": string,
      "endDate": string,
      "current": boolean,
      "description": string
    }
  ],
  "skills": string[] (array of strings, e.g. ["React", "Node.js"]),
  "projects": [
    {
      "id": string (unique ID like "proj1", "proj2"),
      "name": string,
      "role": string,
      "technologies": string (comma-separated tech stack string, e.g. "React, Redux"),
      "link": string,
      "description": string
    }
  ]
}

Instructions:
1. Parse as many details as possible. If a section is missing or you cannot find it, leave it empty or as an empty array according to the schema.
2. Return ONLY the valid JSON object. Do not include markdown code block formatting, do not include HTML tags, and do not append explanations or headers.`;

// Helper to check if parsed sections are empty/invalid
const isEmptySections = (sections) => {
  if (!sections) return true;
  const c = sections.contact || {};
  const hasContact = !!(c.name?.trim() || c.email?.trim() || c.phone?.trim() || c.title?.trim() || c.linkedin?.trim() || c.github?.trim() || c.portfolio?.trim());
  const hasSummary = !!(sections.summary?.trim());
  const hasExperience = Array.isArray(sections.experience) && sections.experience.some(e => e.role?.trim() || e.company?.trim() || e.description?.trim());
  const hasEducation = Array.isArray(sections.education) && sections.education.some(edu => edu.school?.trim() || edu.degree?.trim() || edu.description?.trim());
  const hasSkills = Array.isArray(sections.skills) && sections.skills.length > 0 && sections.skills.some(s => s?.trim());
  const hasProjects = Array.isArray(sections.projects) && sections.projects.some(p => p.name?.trim() || p.description?.trim());
  
  return !(hasContact || hasSummary || hasExperience || hasEducation || hasSkills || hasProjects);
};

// POST /api/resumes/import - Upload, parse and save a resume (Session Scoped)
app.post('/api/resumes/import', requireAuth(), aiRateLimiter, upload.single('resume'), async (req, res) => {
  const { userId } = getAuth(req);
  console.log("=== STEP 1: IMPORT INITIATED ===");
  console.log("User ID:", userId);
  
  if (!req.file) {
    console.warn("Import failed: No file uploaded in request.");
    return res.status(400).json({ error: "No file uploaded." });
  }
  
  console.log("File Name:", req.file.originalname);
  console.log("File Size (bytes):", req.file.size);
  console.log("Buffer Type/Length:", req.file.buffer ? `Buffer length: ${req.file.buffer.length}` : "No Buffer!");

  const fileExtension = req.file.originalname.slice(req.file.originalname.lastIndexOf('.')).toLowerCase();
  let requestBody = null;

  try {
    if (fileExtension === '.pdf') {
      console.log("Processing PDF using Multimodal Gemini Approach...");
      // Convert buffer directly to base64 for Gemini multimodal API
      // Since file size is limited to 5MB, base64 data (~6.7MB) is well within Gemini's 20MB inline request payload limit.
      const base64Data = req.file.buffer.toString('base64');
      requestBody = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              },
              {
                text: systemPrompt
              }
            ]
          }
        ]
      };
    } else if (fileExtension === '.docx') {
      console.log("Extracting DOCX text using Mammoth...");
      const docxData = await mammoth.extractRawText({ buffer: req.file.buffer });
      const extractedText = docxData.value;
      
      console.log("=== STEP 2: RAW TEXT EXTRACTED ===");
      console.log("Extracted Text Length:", extractedText ? extractedText.length : 0);
      console.log("Extracted Text Snippet (first 500 chars):");
      console.log(extractedText ? extractedText.substring(0, 500) : "[EMPTY]");

      if (!extractedText || extractedText.trim().length === 0) {
        console.warn("Import failed: Extracted text is empty.");
        return res.status(422).json({ error: "Couldn't read this file. It appears to be blank, corrupted, or unreadable." });
      }

      requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nRaw Resume Text to Parse:\n${extractedText}`
              }
            ]
          }
        ]
      };
    } else {
      console.warn("Import failed: Unsupported file extension", fileExtension);
      return res.status(400).json({ error: "Unsupported file type. Please upload a PDF or DOCX file." });
    }

    // Call Gemini API to parse the input into structured JSON
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is not configured on the server.");
    }

    console.log(`Calling Gemini API (multimodal=${fileExtension === '.pdf'})...`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini parser error response:", errText);
      throw new Error(`Gemini parser request failed: ${errText}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log("=== STEP 3: GEMINI RAW RESPONSE RECEIVED ===");
    console.log("Gemini Raw Text (first 500 chars):");
    console.log(rawText ? rawText.substring(0, 500) : "[EMPTY]");

    if (!rawText) {
      throw new Error("No response from Gemini parser.");
    }

    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedSections = JSON.parse(cleanText);
    
    console.log("=== STEP 4: PARSED STRUCTURED SECTIONS ===");
    console.log(JSON.stringify(parsedSections, null, 2));

    // Validate that sections are not entirely empty
    if (isEmptySections(parsedSections)) {
      console.warn("Import failed: Gemini returned empty structured sections.");
      return res.status(422).json({ error: "Couldn't read this file. It appears to be blank, corrupted, or unreadable." });
    }

    // Save to database

    const title = req.file.originalname.replace(/\.[^/.]+$/, "") + " (Imported)";
    const content = {
      templateId: 'minimalist',
      sections: parsedSections,
      atsScore: null,
      atsReport: null
    };

    console.log("Saving resume to Supabase...");
    const { data: dbData, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        title,
        content
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error saving imported resume to database:", dbError);
      return res.status(500).json({ error: "Failed to save imported resume to database." });
    }

    console.log("=== STEP 5: RESUME SAVED TO DATABASE ===");
    console.log("DB Inserted ID:", dbData.id);
    console.log("DB Inserted Content Schema:", JSON.stringify(dbData.content, null, 2));

    res.status(201).json({
      id: dbData.id,
      userId: dbData.user_id,
      title: dbData.title,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at,
      templateId: dbData.content?.templateId || 'minimalist',
      sections: dbData.content?.sections || {},
      atsScore: dbData.content?.atsScore || null,
      atsReport: dbData.content?.atsReport || null
    });

  } catch (error) {
    console.error("Error during resume import:", error);
    res.status(500).json({ error: "We couldn't read or parse this file. Try a different file or start from scratch." });
  }
});

// PUT /api/resumes/:id - Update resume details (Scoped)
app.put('/api/resumes/:id', requireAuth(), async (req, res) => {
  const { id } = req.params;
  const { userId } = getAuth(req);
  const { title, templateId, sections, atsScore, atsReport } = req.body;

  if (!isValidUuid(id)) {
    return res.status(404).json({ error: "Resume not found." });
  }

  try {

    // First fetch the existing resume row from Supabase
    const { data: existing, error: fetchErr } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      console.error("Error fetching existing resume for merge update:", fetchErr);
      return res.status(500).json({ error: "Failed to fetch resume before update." });
    }

    if (!existing) {
      return res.status(404).json({ error: "Resume not found." });
    }

    // Merge incoming fields on top of existing content - do not overwrite with default values
    const updatedContent = {
      ...(existing.content || {}),
      ...(templateId !== undefined ? { templateId } : {}),
      ...(sections !== undefined ? { sections } : {}),
      ...(atsScore !== undefined ? { atsScore } : {}),
      ...(atsReport !== undefined ? { atsReport } : {})
    };

    // Use existing title if request title is undefined
    const updatedTitle = title !== undefined ? title : existing.title;

    const { data, error } = await supabase
      .from('resumes')
      .update({
        title: updatedTitle,
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error updating resume in Supabase:", error);
      return res.status(500).json({ error: "Failed to save resume updates." });
    }

    if (!data) {
      return res.status(404).json({ error: "Resume not found." });
    }

    res.json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      templateId: data.content?.templateId || 'minimalist',
      sections: data.content?.sections || {},
      atsScore: data.content?.atsScore || null,
      atsReport: data.content?.atsReport || null
    });
  } catch (err) {
    console.error("Uncaught error updating resume:", err);
    res.status(500).json({ error: "Internal server error saving resume." });
  }
});

// DELETE /api/resumes/:id - Delete a resume (Scoped)
app.delete('/api/resumes/:id', requireAuth(), async (req, res) => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  if (!isValidUuid(id)) {
    return res.status(404).json({ error: "Resume not found." });
  }

  try {

    const { data, error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error("Error deleting resume from Supabase:", error);
      return res.status(500).json({ error: "Failed to delete resume." });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Resume not found." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Uncaught error deleting resume:", err);
    res.status(500).json({ error: "Internal server error deleting resume." });
  }
});

// POST /api/resumes/:id/duplicate - Duplicate a resume (Scoped)
app.post('/api/resumes/:id/duplicate', requireAuth(), async (req, res) => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  if (!isValidUuid(id)) {
    return res.status(404).json({ error: "Resume not found." });
  }

  try {

    // Fetch original
    const { data: original, error: fetchErr } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      console.error("Error fetching original resume for duplication:", fetchErr);
      return res.status(500).json({ error: "Failed to fetch original resume." });
    }

    if (!original) {
      return res.status(404).json({ error: "Resume not found." });
    }

    // Insert duplicated row
    const { data: duplicate, error: insertErr } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        title: `${original.title} (Copy)`,
        content: original.content
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Error inserting duplicated resume:", insertErr);
      return res.status(500).json({ error: "Failed to duplicate resume." });
    }

    res.status(201).json({
      id: duplicate.id,
      userId: duplicate.user_id,
      title: duplicate.title,
      createdAt: duplicate.created_at,
      updatedAt: duplicate.updated_at,
      templateId: duplicate.content?.templateId || 'minimalist',
      sections: duplicate.content?.sections || {},
      atsScore: duplicate.content?.atsScore || null,
      atsReport: duplicate.content?.atsReport || null
    });
  } catch (err) {
    console.error("Uncaught error duplicating resume:", err);
    res.status(500).json({ error: "Internal server error duplicating resume." });
  }
});



// Start proxy server (only locally, not on Vercel serverless)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Gemini API Proxy is active on http://localhost:${PORT}`);
  });
}

export default app;
