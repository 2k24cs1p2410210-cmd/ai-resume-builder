const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const BASE_URL = `${BACKEND_URL}/api/resumes`;

// Helper to construct request headers including Clerk JWT Authorization token
function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Get all resumes owned by the authenticated user
export async function getResumes(token) {
  try {
    const response = await fetch(`${BASE_URL}?t=${Date.now()}`, {
      method: 'GET',
      headers: getHeaders(token)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to load resumes.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading resumes from API:", error);
    throw error;
  }
}

// Get a single resume by ID
export async function getResumeById(id, token) {
  try {
    const response = await fetch(`${BASE_URL}/${id}?t=${Date.now()}`, {
      method: 'GET',
      headers: getHeaders(token)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to load resume.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading resume by ID:", error);
    throw error;
  }
}

// Create a new resume with database persistence
export async function createResume(templateId, initialData = {}, token) {
  try {
    const response = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        title: initialData.title || 'Untitled Resume',
        templateId: templateId || 'minimalist',
        sections: initialData.sections || {}
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to create resume.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating resume:", error);
    throw error;
  }
}

// Save/update resume data
export async function saveResume(id, updatedFields, token) {
  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(updatedFields)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to save resume.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error saving resume:", error);
    throw error;
  }
}

// Duplicate a resume
export async function duplicateResume(id, token) {
  try {
    const response = await fetch(`${BASE_URL}/${id}/duplicate`, {
      method: 'POST',
      headers: getHeaders(token)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to duplicate resume.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error duplicating resume:", error);
    throw error;
  }
}

// Delete a resume
export async function deleteResume(id, token) {
  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to delete resume.");
    }
    return true;
  } catch (error) {
    console.error("Error deleting resume:", error);
    throw error;
  }
}

// Import/parse a resume from a PDF or DOCX file
export async function importResume(file, token) {
  try {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await fetch(`${BASE_URL}/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to parse and import resume.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error importing resume:", error);
    throw error;
  }
}

// Run resume analysis against the backend
export async function analyzeResume(id, jobDescription, token) {
  try {
    const response = await fetch(`${BASE_URL}/${id}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ jobDescription })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to analyze resume.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error invoking resume analysis:", error);
    throw error;
  }
}

// Apply a suggested fix to the resume
export async function applyResumeFix(id, fixObj, token) {
  try {
    const response = await fetch(`${BASE_URL}/${id}/apply-fix`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        fixType: fixObj.fixType,
        fix: fixObj.fix,
        targetLocation: fixObj.targetLocation
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to apply suggested fix.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error applying resume fix:", error);
    throw error;
  }
}

