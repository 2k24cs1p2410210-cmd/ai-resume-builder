import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Gemini API key is missing.");
  process.exit(1);
}

const systemPrompt = `You are an expert resume parsing AI.
Your task is to take the PDF resume document provided and parse it into a structured JSON format that exactly matches the following schema:
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
1. Parse as many details as possible from the PDF. If a section is missing or you cannot find it, leave it empty or as an empty array according to the schema.
2. Return ONLY the valid JSON object. Do not include markdown code block formatting, do not include HTML tags, and do not append explanations or headers.`;

async function run() {
  try {
    const pdfPath = '../../resume-try.pdf';
    const base64Data = fs.readFileSync(pdfPath).toString('base64');
    
    console.log("PDF base64 length:", base64Data.length);
    console.log("Sending request to Gemini...");
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini Error:", err);
      return;
    }
    
    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("=== GEMINI RAW RESPONSE ===");
    console.log(rawText);
    console.log("===========================");
    
    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    console.log("=== PARSED SCHEMA ===");
    console.log(JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
