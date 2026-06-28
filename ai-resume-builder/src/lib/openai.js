// OpenAI Integration Helper with local fallback and backend proxy routing

function getMockSummaries(jobTitle, customRequirement = '') {
  const title = jobTitle || 'Professional';
  const reqLower = customRequirement.toLowerCase();
  
  let summary1 = `Results-driven ${title} with a proven track record of designing and deploying scalable web systems. Specialized in optimization, performance gains, and team collaboration.`;
  let summary2 = `Dynamic ${title} offering 3+ years of expertise. Highly skilled in leveraging active methodologies and automated testing to shorten product cycles and boost customer engagement.`;
  let summary3 = `Motivated junior ${title} with strong data and engineering design skills. Eager to contribute to automation pipelines, reduce page latency, and accelerate releases.`;

  if (reqLower) {
    if (reqLower.includes('ai') || reqLower.includes('ml') || reqLower.includes('machine learning') || reqLower.includes('master')) {
      summary1 = `Results-driven AI/ML Engineer with a Master's degree in Artificial Intelligence. Expert in designing, optimizing, and deploying complex machine learning models, neural networks, and computer vision algorithms.`;
      summary2 = `Highly analytical AI Specialist holding advanced academic credentials in Machine Learning. Proven success in training deep learning models, natural language processing, and building predictive analytics pipelines.`;
      summary3 = `Graduate with a Master's in AI/ML, offering strong theoretical foundations in neural networks and statistical analysis. Passionate about applying machine learning techniques to solve real-world data challenges.`;
    } else if (reqLower.includes('react') || reqLower.includes('frontend') || reqLower.includes('front-end') || reqLower.includes('ui')) {
      summary1 = `Senior Frontend Engineer specializing in React and modern UI/UX design architectures. Proven record of developing responsive, high-performance web applications with atomic design patterns.`;
      summary2 = `React Developer with 3+ years of experience crafting interactive single-page applications. Highly skilled in state management, Tailwind CSS, and headless UI integrations.`;
      summary3 = `Creative UI Developer transitioning into Frontend Engineering. Strong proficiency in HTML, CSS, React, and modular styling, dedicated to building accessible user journeys.`;
    } else {
      summary1 = `Results-driven ${title} specializing in custom solutions. Adept at leveraging modern frameworks, collaborating with stakeholders, and optimizing operational workflows.`;
      summary2 = `Versatile ${title} with a strong background in software design and project coordination. Focused on delivering high-quality client deliverables and driving project lifecycle efficiency.`;
      summary3 = `Adaptable professional eager to apply advanced technical training and analytical skills. Committed to continuous learning and solving complex architecture challenges.`;
    }
  }

  return [summary1, summary2, summary3];
}

function getMockBullets(type, title) {
  const roleName = title || 'Professional';
  return [
    `• Spearheaded engineering design for ${roleName} core features, leading to a 25% decrease in overall latency.`,
    `• Collaborated with product owners to scope technical requirements, accelerating build schedules by 15%.`,
    `• Implemented automated validation tools to shorten the release cycle from weeks to hours.`
  ];
}

// Generate summaries using the Express backend server proxy
export async function generateSummaryWithAi(jobTitle, skills = [], experience = [], customRequirement = '') {
  try {
    const response = await fetch('http://localhost:5000/api/generate-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobTitle,
        yearsOfExperience: null,
        skills,
        experienceEntries: experience.map(exp => ({
          role: exp.role,
          company: exp.company,
          description: exp.description
        })),
        tone: 'professional',
        customRequirement: customRequirement.trim() || undefined
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Couldn't generate summaries. Try again.");
    }

    const result = await response.json();
    return result.summaries || [];
  } catch (error) {
    console.error("Gemini summary proxy error:", error.message);
    // Propagate rate-limiting or quota messages directly
    if (
      error.message.includes("generations for today") || 
      error.message.includes("quota exceeded") ||
      error.message.includes("denied access") ||
      error.message.includes("rate limit") ||
      error.message.includes("limit reached")
    ) {
      throw error; 
    }
    throw new Error("Couldn't generate summaries. Try again.");
  }
}

// Generate bullets using the Express backend server proxy
export async function generateBulletsWithAi(type, title, descriptionContext = '', customRequirement = '') {
  try {
    const response = await fetch('http://localhost:5000/api/generate-bullets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        title,
        descriptionContext,
        customRequirement: customRequirement.trim() || undefined
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Couldn't generate suggestions. Try again.");
    }

    const result = await response.json();
    return result.bullets || [];
  } catch (error) {
    console.error("Gemini bullet proxy error:", error.message);
    if (
      error.message.includes("generations for today") || 
      error.message.includes("quota exceeded") ||
      error.message.includes("denied access") ||
      error.message.includes("rate limit") ||
      error.message.includes("limit reached")
    ) {
      throw error; 
    }
    throw new Error("Couldn't generate suggestions. Try again.");
  }
}

// Generate a detailed project description using the Express backend server proxy
export async function generateProjectDescriptionWithAi(projectName, techStack = [], userNotes = '', role = null) {
  try {
    const response = await fetch('http://localhost:5000/api/generate-project-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectName,
        techStack,
        userNotes,
        role
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Couldn't generate a description. Try again.");
    }

    const result = await response.json();
    return result.description || "";
  } catch (error) {
    console.error("Gemini project description proxy error:", error.message);
    if (
      error.message.includes("generations for today") || 
      error.message.includes("quota exceeded") ||
      error.message.includes("denied access") ||
      error.message.includes("rate limit") ||
      error.message.includes("limit reached")
    ) {
      throw error; 
    }
    throw new Error("Couldn't generate a description. Try again.");
  }
}

// Analyze resume details using the Express backend server proxy
export async function analyzeResumeWithAi(resumeData, jobDescription = null) {
  try {
    const response = await fetch('http://localhost:5000/api/analyze-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact: resumeData.sections?.contact || {},
        summary: resumeData.sections?.summary || '',
        experience: resumeData.sections?.experience || [],
        education: resumeData.sections?.education || [],
        skills: resumeData.sections?.skills || [],
        projects: resumeData.sections?.projects || [],
        certifications: resumeData.sections?.certifications || [],
        jobDescription
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Couldn't analyze your resume. Try again.");
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini analyze resume proxy error:", error.message);
    if (
      error.message.includes("generations for today") || 
      error.message.includes("quota exceeded") ||
      error.message.includes("denied access") ||
      error.message.includes("rate limit") ||
      error.message.includes("limit reached")
    ) {
      throw error; 
    }
    throw new Error("Couldn't analyze your resume. Try again.");
  }
}

