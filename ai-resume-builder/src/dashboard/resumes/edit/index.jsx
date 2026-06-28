import React, { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Check, Loader2, Sparkles, Plus, Trash2, 
  ChevronDown, ChevronUp, Briefcase, GraduationCap, 
  Wrench, FolderGit2, Eye, Edit3, Link as LinkIcon, AlertCircle, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getResumeById, saveResume } from '@/lib/db'
import { generateSummaryWithAi, generateBulletsWithAi, generateProjectDescriptionWithAi } from '@/lib/openai'
import { useAuth } from '@clerk/react'

function ResumeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getToken } = useAuth()
  const [resume, setResume] = useState(null)
  const [loadingResume, setLoadingResume] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  
  // View states
  const [activeTab, setActiveTab] = useState('edit') // 'edit' or 'preview' (for mobile)
  const [showImportBanner, setShowImportBanner] = useState(searchParams.get('imported') === 'true')
  const [saveStatus, setSaveStatus] = useState('Saved') // 'Saved', 'Saving...', 'Error'
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')

  // Section accordion state
  const [openSection, setOpenSection] = useState(searchParams.get('section') || 'contact') // contact, summary, experience, education, skills, projects

  // AI Bullet generation state
  const [generatingAiField, setGeneratingAiField] = useState(null) // e.g. { type: 'experience', index: 0 }
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiError, setAiError] = useState(null)
  const [customRequirement, setCustomRequirement] = useState('')
  const [showConfirmReplace, setShowConfirmReplace] = useState(false)
  const [pendingSummary, setPendingSummary] = useState(null)
  
  // Project Description AI states
  const [generatingProjectAiIndex, setGeneratingProjectAiIndex] = useState(null)
  const [projectAiSuggestion, setProjectAiSuggestion] = useState(null)
  const [projectAiError, setProjectAiError] = useState(null)
  const [projectAiLoading, setProjectAiLoading] = useState(false)
  const [showProjectConfirmReplace, setShowProjectConfirmReplace] = useState(false)
  const [pendingProjectDescription, setPendingProjectDescription] = useState(null)

  // Load resume data and check section deep-linking
  useEffect(() => {
    const loadData = async () => {
      setLoadingResume(true)
      try {
        const token = await getToken()
        const data = await getResumeById(id, token)
        if (!data) {
          navigate('/dashboard')
          return
        }
        
        // Sanitize sections to prevent TypeError rendering crashes on new/empty resumes
        const defaultSections = {
          contact: {
            name: '',
            title: '',
            email: '',
            phone: '',
            linkedin: '',
            github: '',
            portfolio: ''
          },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          projects: [],
          certifications: []
        };

        const sanitizedData = {
          ...data,
          sections: {
            ...defaultSections,
            ...data.sections,
            contact: {
              ...defaultSections.contact,
              ...(data.sections?.contact || {})
            },
            experience: Array.isArray(data.sections?.experience) ? data.sections.experience : defaultSections.experience,
            education: Array.isArray(data.sections?.education) ? data.sections.education : defaultSections.education,
            skills: Array.isArray(data.sections?.skills) ? data.sections.skills : defaultSections.skills,
            projects: Array.isArray(data.sections?.projects) ? data.sections.projects : defaultSections.projects,
            certifications: Array.isArray(data.sections?.certifications) ? data.sections.certifications : defaultSections.certifications
          }
        };

        setResume(sanitizedData)
        setTempTitle(sanitizedData.title)
      } catch (err) {
        console.error("Failed to load resume details:", err)
        navigate('/dashboard')
      } finally {
        setLoadingResume(false)
      }
    }
    loadData()
  }, [id, navigate])

  // Sync openSection with query param changes
  useEffect(() => {
    const sect = searchParams.get('section')
    if (sect) {
      setOpenSection(sect)
    }
  }, [searchParams])

  // Trigger db save
  const triggerSave = async (updatedResume) => {
    setSaveStatus('Saving...')
    try {
      const token = await getToken()
      const saved = await saveResume(id, updatedResume, token)
      if (saved) {
        setSaveStatus('Saved')
      } else {
        setSaveStatus('Error')
      }
    } catch (err) {
      console.error("Failed to save resume details:", err)
      setSaveStatus('Error')
    }
  }

  // Debounced save triggered when resume state changes and isDirty is true
  useEffect(() => {
    if (!isDirty || !resume) return;

    const timer = setTimeout(async () => {
      setIsDirty(false);
      await triggerSave(resume);
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(timer);
  }, [resume, isDirty]);

  if (!resume || loadingResume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Handle core field changes
  const handleContactChange = (field, value) => {
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        contact: {
          ...resume.sections.contact,
          [field]: value
        }
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const handleSummaryChange = (value) => {
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        summary: value
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  // Section List Add/Edit/Deletes
  const addExperience = () => {
    const newExp = {
      id: Math.random().toString(36).substring(2, 9),
      role: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ''
    }
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        experience: [...resume.sections.experience, newExp]
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const updateExperience = (index, field, value) => {
    const list = [...resume.sections.experience]
    list[index] = { ...list[index], [field]: value }
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        experience: list
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const removeExperience = (index) => {
    const list = resume.sections.experience.filter((_, idx) => idx !== index)
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        experience: list
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const addEducation = () => {
    const newEdu = {
      id: Math.random().toString(36).substring(2, 9),
      school: '',
      degree: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ''
    }
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        education: [...resume.sections.education, newEdu]
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const updateEducation = (index, field, value) => {
    const list = [...resume.sections.education]
    list[index] = { ...list[index], [field]: value }
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        education: list
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const removeEducation = (index) => {
    const list = resume.sections.education.filter((_, idx) => idx !== index)
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        education: list
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const handleSkillsChange = (value) => {
    // Comma separated string list mapped to array
    const skillList = value.split(',').map(s => s.trim())
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        skills: skillList
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const addProject = () => {
    const newProj = {
      id: Math.random().toString(36).substring(2, 9),
      name: '',
      role: '',
      technologies: '',
      link: '',
      description: ''
    }
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        projects: [...resume.sections.projects, newProj]
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const updateProject = (index, field, value) => {
    const list = [...resume.sections.projects]
    list[index] = { ...list[index], [field]: value }
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        projects: list
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  const removeProject = (index) => {
    const list = resume.sections.projects.filter((_, idx) => idx !== index)
    const updated = {
      ...resume,
      sections: {
        ...resume.sections,
        projects: list
      }
    }
    setResume(updated)
    setIsDirty(true)
  }

  // Rename Title
  const handleRenameSubmit = () => {
    setEditingTitle(false)
    if (!tempTitle.trim()) {
      setTempTitle(resume.title)
      return
    }
    const updated = { ...resume, title: tempTitle }
    setResume(updated)
    setIsDirty(true)
  }

  // AI Bullet generation using Google Gemini
  const handleGenerateAiBullets = async (type, index, contextTitle, requirement = '') => {
    setGeneratingAiField({ type, index })
    setAiSuggestions([])
    setAiError(null)

    try {
      const fieldData = type === 'experience' 
        ? resume.sections.experience[index] 
        : resume.sections.projects[index]
      const title = type === 'experience' ? fieldData.role : fieldData.name
      const context = fieldData.description

      const bullets = await generateBulletsWithAi(type, title || contextTitle || 'Professional', context, requirement)
      setAiSuggestions(bullets)
    } catch (err) {
      setAiError(err.message)
    }
  }

  // AI Summary generation using Google Gemini
  const handleGenerateAiSummary = async (jobTitle, requirement = '') => {
    setGeneratingAiField({ type: 'summary' })
    setAiSuggestions([])
    setAiError(null)

    try {
      const summaries = await generateSummaryWithAi(
        jobTitle || resume.sections.contact.title || 'Professional',
        resume.sections.skills || [],
        resume.sections.experience || [],
        requirement
      )
      setAiSuggestions(summaries)
    } catch (err) {
      setAiError(err.message)
    }
  }

  const applyAiBullet = (bullet) => {
    const { type, index } = generatingAiField
    if (type === 'experience') {
      const currentDesc = resume.sections.experience[index].description || ''
      const spacer = currentDesc ? '\n' : ''
      updateExperience(index, 'description', currentDesc + spacer + bullet)
      setGeneratingAiField(null)
    } else if (type === 'projects') {
      const currentDesc = resume.sections.projects[index].description || ''
      const spacer = currentDesc ? '\n' : ''
      updateProject(index, 'description', currentDesc + spacer + bullet)
      setGeneratingAiField(null)
    } else if (type === 'summary') {
      // Overwrite confirmation check
      if (resume.sections.summary && resume.sections.summary.trim()) {
        setPendingSummary(bullet)
        setShowConfirmReplace(true)
      } else {
        handleSummaryChange(bullet)
        setGeneratingAiField(null)
      }
    }
  }

  // AI Project Description generation using Google Gemini
  const handleGenerateProjectDescription = async (index) => {
    setGeneratingProjectAiIndex(index)
    setProjectAiLoading(true)
    setProjectAiSuggestion(null)
    setProjectAiError(null)

    try {
      const project = resume.sections.projects[index]
      const projectName = project.name || ''
      const techStack = project.technologies ? project.technologies.split(',').map(s => s.trim()) : []
      const userNotes = project.description || ''
      const role = project.role || null

      if (!projectName.trim()) {
        throw new Error("Project Name is required to generate a description.")
      }

      const description = await generateProjectDescriptionWithAi(projectName, techStack, userNotes, role)
      setProjectAiSuggestion(description)
    } catch (err) {
      setProjectAiError(err.message)
    } finally {
      setProjectAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border/40 py-3 px-4 sm:px-8 flex justify-between items-center bg-card sticky top-0 z-20">
        <div className="flex items-center gap-4 max-w-[50%]">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>

          {/* Inline editable title */}
          {editingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              autoFocus
              className="text-lg font-bold bg-muted border border-border rounded px-2 py-0.5 outline-none max-w-full"
            />
          ) : (
            <div 
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1.5 cursor-pointer group hover:bg-muted/50 rounded px-2 py-0.5"
            >
              <h1 className="text-lg font-bold tracking-tight truncate max-w-[200px] sm:max-w-xs">
                {resume.title}
              </h1>
              <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
          )}
          
          {/* Save Status */}
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 bg-muted px-2 py-1 rounded">
            {saveStatus === 'Saving...' && <Loader2 className="w-3 h-3 animate-spin" />}
            {saveStatus === 'Saved' && <Check className="w-3 h-3 text-emerald-500" />}
            {saveStatus}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Actions */}
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard/resumes/${id}/analyze`}>Analyze</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/dashboard/resumes/${id}/export`}>Export</Link>
          </Button>
        </div>
      </header>

      {/* Success import banner */}
      {showImportBanner && (
        <div className="bg-emerald-50 border-b border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 px-6 py-2 flex justify-between items-center text-xs text-emerald-800 dark:text-emerald-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            We've imported your resume sections. Review and edit the details below.
          </span>
          <button 
            onClick={() => setShowImportBanner(false)}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile Tab Toggle Toggle */}
      <div className="flex sm:hidden border-b border-border bg-card">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 flex justify-center items-center gap-1.5 ${activeTab === 'edit' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}
        >
          <Edit3 className="w-4 h-4" /> Edit Content
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 flex justify-center items-center gap-1.5 ${activeTab === 'preview' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}
        >
          <Eye className="w-4 h-4" /> View Preview
        </button>
      </div>

      {/* Workspace Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor Form Accordion */}
        <aside className={`w-full sm:w-[45%] md:w-[40%] bg-card border-r border-border/40 overflow-y-auto p-6 flex flex-col gap-6 ${activeTab === 'edit' ? 'flex' : 'hidden sm:flex'}`}>
          
          {/* Section 1: Contact Details */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
            <button
              onClick={() => setOpenSection(openSection === 'contact' ? '' : 'contact')}
              className="w-full flex justify-between items-center p-4 font-bold text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" /> Contact Information
              </span>
              {openSection === 'contact' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {openSection === 'contact' && (
              <div className="p-4 border-t border-border/40 flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Full Name</label>
                  <input
                    type="text"
                    value={resume.sections.contact.name || ''}
                    onChange={(e) => handleContactChange('name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-sm transition-colors bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Professional Title</label>
                  <input
                    type="text"
                    value={resume.sections.contact.title || ''}
                    onChange={(e) => handleContactChange('title', e.target.value)}
                    placeholder="Senior Frontend Developer"
                    className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-sm transition-colors bg-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Email</label>
                    <input
                      type="email"
                      value={resume.sections.contact.email || ''}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      placeholder="email@example.com"
                      className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-sm transition-colors bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Phone</label>
                    <input
                      type="text"
                      value={resume.sections.contact.phone || ''}
                      onChange={(e) => handleContactChange('phone', e.target.value)}
                      placeholder="+1 555-1234"
                      className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-sm transition-colors bg-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">LinkedIn</label>
                    <input
                      type="text"
                      value={resume.sections.contact.linkedin || ''}
                      onChange={(e) => handleContactChange('linkedin', e.target.value)}
                      placeholder="linkedin.com/..."
                      className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-xs transition-colors bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">GitHub</label>
                    <input
                      type="text"
                      value={resume.sections.contact.github || ''}
                      onChange={(e) => handleContactChange('github', e.target.value)}
                      placeholder="github.com/..."
                      className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-xs transition-colors bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Portfolio</label>
                    <input
                      type="text"
                      value={resume.sections.contact.portfolio || ''}
                      onChange={(e) => handleContactChange('portfolio', e.target.value)}
                      placeholder="johndoe.com"
                      className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-xs transition-colors bg-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Summary */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
            <button
              onClick={() => setOpenSection(openSection === 'summary' ? '' : 'summary')}
              className="w-full flex justify-between items-center p-4 font-bold text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" /> Summary
              </span>
              {openSection === 'summary' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {openSection === 'summary' && (
              <div className="p-4 border-t border-border/40 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Professional summary</label>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setCustomRequirement('');
                      handleGenerateAiSummary(resume.sections.contact.title, '');
                    }}
                    className="flex items-center gap-1 h-6 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-800"
                  >
                    <Sparkles className="w-3 h-3" /> Generate with AI
                  </Button>
                </div>
                <textarea
                  value={resume.sections.summary || ''}
                  onChange={(e) => handleSummaryChange(e.target.value)}
                  placeholder="Describe your career goals, highlights, and primary key expertise..."
                  rows={4}
                  className="w-full mt-1 border border-border focus:border-foreground rounded p-2 outline-none text-sm bg-transparent"
                />
              </div>
            )}
          </div>

          {/* Section 3: Work Experience */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
            <button
              onClick={() => setOpenSection(openSection === 'experience' ? '' : 'experience')}
              className="w-full flex justify-between items-center p-4 font-bold text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" /> Work Experience
              </span>
              {openSection === 'experience' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {openSection === 'experience' && (
              <div className="p-4 border-t border-border/40 flex flex-col gap-4">
                {resume.sections.experience.map((exp, idx) => (
                  <div key={exp.id} className="border border-border/50 rounded-lg p-3 relative bg-card/10">
                    <button
                      onClick={() => removeExperience(idx)}
                      className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3 mb-2 pr-6">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Role / Job Title</label>
                        <input
                          type="text"
                          value={exp.role || ''}
                          onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                          placeholder="Software Engineer"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Company</label>
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                          placeholder="Acme Corp"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Location</label>
                        <input
                          type="text"
                          value={exp.location || ''}
                          onChange={(e) => updateExperience(idx, 'location', e.target.value)}
                          placeholder="New York, NY"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</label>
                        <input
                          type="text"
                          value={exp.startDate || ''}
                          onChange={(e) => updateExperience(idx, 'startDate', e.target.value)}
                          placeholder="YYYY-MM"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">End Date</label>
                        <input
                          type="text"
                          disabled={exp.current}
                          value={exp.current ? '' : (exp.endDate || '')}
                          onChange={(e) => updateExperience(idx, 'endDate', e.target.value)}
                          placeholder={exp.current ? 'Present' : 'YYYY-MM'}
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs disabled:opacity-50 bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      <input
                        type="checkbox"
                        id={`exp-current-${exp.id}`}
                        checked={exp.current || false}
                        onChange={(e) => updateExperience(idx, 'current', e.target.checked)}
                        className="rounded border-border"
                      />
                      <label htmlFor={`exp-current-${exp.id}`} className="text-xs text-muted-foreground">
                        Currently working here
                      </label>
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Description & Bullet Points</label>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setCustomRequirement('')
                            handleGenerateAiBullets('experience', idx, exp.role, '')
                          }}
                          className="flex items-center gap-1 h-6 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-800"
                        >
                          <Sparkles className="w-3 h-3" /> Suggest with AI
                        </Button>
                      </div>
                      <textarea
                        value={exp.description || ''}
                        onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                        placeholder="• Implemented X using Y resulting in Z..."
                        rows={3}
                        className="w-full border border-border focus:border-foreground rounded p-1.5 outline-none text-xs bg-transparent"
                      />
                    </div>
                  </div>
                ))}

                <Button 
                  onClick={addExperience} 
                  variant="outline" 
                  size="sm"
                  className="w-full border-dashed"
                >
                  + Add Work Experience
                </Button>
              </div>
            )}
          </div>

          {/* Section 4: Education */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
            <button
              onClick={() => setOpenSection(openSection === 'education' ? '' : 'education')}
              className="w-full flex justify-between items-center p-4 font-bold text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground" /> Education
              </span>
              {openSection === 'education' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {openSection === 'education' && (
              <div className="p-4 border-t border-border/40 flex flex-col gap-4">
                {resume.sections.education.map((edu, idx) => (
                  <div key={edu.id} className="border border-border/50 rounded-lg p-3 relative bg-card/10">
                    <button
                      onClick={() => removeEducation(idx)}
                      className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="grid grid-cols-2 gap-3 mb-2 pr-6">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">School / University</label>
                        <input
                          type="text"
                          value={edu.school || ''}
                          onChange={(e) => updateEducation(idx, 'school', e.target.value)}
                          placeholder="State University"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Degree / Course</label>
                        <input
                          type="text"
                          value={edu.degree || ''}
                          onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                          placeholder="B.S. in Computer Science"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Location</label>
                        <input
                          type="text"
                          value={edu.location || ''}
                          onChange={(e) => updateEducation(idx, 'location', e.target.value)}
                          placeholder="Boston, MA"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</label>
                        <input
                          type="text"
                          value={edu.startDate || ''}
                          onChange={(e) => updateEducation(idx, 'startDate', e.target.value)}
                          placeholder="YYYY-MM"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">End Date</label>
                        <input
                          type="text"
                          value={edu.endDate || ''}
                          onChange={(e) => updateEducation(idx, 'endDate', e.target.value)}
                          placeholder="YYYY-MM"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button 
                  onClick={addEducation} 
                  variant="outline" 
                  size="sm"
                  className="w-full border-dashed"
                >
                  + Add Education
                </Button>
              </div>
            )}
          </div>

          {/* Section 5: Skills */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
            <button
              onClick={() => setOpenSection(openSection === 'skills' ? '' : 'skills')}
              className="w-full flex justify-between items-center p-4 font-bold text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground" /> Skills
              </span>
              {openSection === 'skills' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {openSection === 'skills' && (
              <div className="p-4 border-t border-border/40 flex flex-col gap-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">List Skills (Comma Separated)</label>
                <input
                  type="text"
                  defaultValue={resume.sections.skills.join(', ') || ''}
                  onBlur={(e) => handleSkillsChange(e.target.value)}
                  placeholder="React, TypeScript, Node.js, GraphQL, AWS"
                  className="w-full mt-1 border-b border-border/80 focus:border-foreground py-1 outline-none text-sm transition-colors bg-transparent"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Hit Tab or click outside after typing to trigger auto-save tags.
                </p>
              </div>
            )}
          </div>

          {/* Section 6: Projects */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
            <button
              onClick={() => setOpenSection(openSection === 'projects' ? '' : 'projects')}
              className="w-full flex justify-between items-center p-4 font-bold text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-muted-foreground" /> Projects
              </span>
              {openSection === 'projects' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {openSection === 'projects' && (
              <div className="p-4 border-t border-border/40 flex flex-col gap-4">
                {resume.sections.projects.map((proj, idx) => (
                  <div key={proj.id} className="border border-border/50 rounded-lg p-3 relative bg-card/10">
                    <button
                      onClick={() => removeProject(idx)}
                      className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="grid grid-cols-2 gap-3 mb-2 pr-6">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Project Name</label>
                        <input
                          type="text"
                          value={proj.name || ''}
                          onChange={(e) => updateProject(idx, 'name', e.target.value)}
                          placeholder="AI Telemetry Tool"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Role</label>
                        <input
                          type="text"
                          value={proj.role || ''}
                          onChange={(e) => updateProject(idx, 'role', e.target.value)}
                          placeholder="Lead Developer"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Technologies</label>
                        <input
                          type="text"
                          value={proj.technologies || ''}
                          onChange={(e) => updateProject(idx, 'technologies', e.target.value)}
                          placeholder="React, Firebase"
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Link</label>
                        <input
                          type="text"
                          value={proj.link || ''}
                          onChange={(e) => updateProject(idx, 'link', e.target.value)}
                          placeholder="github.com/..."
                          className="w-full mt-0.5 border-b border-border/85 focus:border-foreground py-0.5 outline-none text-xs bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Project Details</label>
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={generatingProjectAiIndex === idx && projectAiLoading}
                          onClick={() => handleGenerateProjectDescription(idx)}
                          className="flex items-center gap-1 h-6 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-800"
                        >
                          {generatingProjectAiIndex === idx && projectAiLoading ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Suggest with AI
                            </>
                          )}
                        </Button>
                      </div>
                      <textarea
                        value={proj.description || ''}
                        onChange={(e) => updateProject(idx, 'description', e.target.value)}
                        placeholder="Describe what you built and achieved..."
                        rows={2}
                        className="w-full border border-border focus:border-foreground rounded p-1.5 outline-none text-xs bg-transparent"
                      />

                      {/* AI Generated Project Description Preview Card */}
                      {generatingProjectAiIndex === idx && (
                        <div className="mt-3 border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider">AI Suggested Description</span>
                          </div>

                          {projectAiLoading ? (
                            <div className="py-4 flex flex-col items-center justify-center">
                              <Loader2 className="w-5 h-5 text-amber-500 animate-spin mb-1" />
                              <span className="text-[11px] text-muted-foreground">Analyzing project details...</span>
                            </div>
                          ) : projectAiError ? (
                            <div className="text-left py-2">
                              <p className="text-xs text-destructive font-semibold mb-1">
                                {projectAiError.includes("generations for today") ? "Rate Limit Reached" : "Generation Error"}
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{projectAiError}</p>
                              <div className="flex gap-2">
                                <Button
                                  size="xs"
                                  onClick={() => handleGenerateProjectDescription(idx)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                                >
                                  Retry
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setGeneratingProjectAiIndex(null)
                                    setProjectAiSuggestion(null)
                                    setProjectAiError(null)
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-left">
                              <p className="text-xs text-foreground leading-relaxed mb-4 select-text whitespace-pre-wrap">
                                {projectAiSuggestion}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  size="xs"
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                                  onClick={() => {
                                    if (proj.description && proj.description.trim()) {
                                      setPendingProjectDescription({ index: idx, description: projectAiSuggestion })
                                      setShowProjectConfirmReplace(true)
                                    } else {
                                      updateProject(idx, 'description', projectAiSuggestion)
                                      setGeneratingProjectAiIndex(null)
                                      setProjectAiSuggestion(null)
                                    }
                                  }}
                                >
                                  Use this
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleGenerateProjectDescription(idx)}
                                  className="flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3" /> Regenerate
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => {
                                    setGeneratingProjectAiIndex(null)
                                    setProjectAiSuggestion(null)
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  Discard
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <Button 
                  onClick={addProject} 
                  variant="outline" 
                  size="sm"
                  className="w-full border-dashed"
                >
                  + Add Project
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Live Sheet Preview Canvas */}
        <section className={`flex-1 bg-stone-100 dark:bg-zinc-900/60 overflow-y-auto p-4 sm:p-8 flex justify-center items-start ${activeTab === 'preview' ? 'flex' : 'hidden sm:flex'}`}>
          <div 
            className="w-full max-w-[800px] aspect-[1/1.414] bg-white text-zinc-900 shadow-xl border border-zinc-200/50 rounded p-10 font-sans flex flex-col justify-between"
            style={{ minHeight: '900px' }}
          >
            {/* Template Rendering Core */}
            <div>
              {/* Header Details */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                  {resume.sections.contact.name || 'Your Name'}
                </h2>
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-500 mt-1 uppercase tracking-wide">
                  {resume.sections.contact.title || 'Professional Title'}
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mt-3 border-t border-b border-zinc-100 py-1.5">
                  {resume.sections.contact.email && <span>{resume.sections.contact.email}</span>}
                  {resume.sections.contact.phone && <span>{resume.sections.contact.phone}</span>}
                  {resume.sections.contact.linkedin && <span>{resume.sections.contact.linkedin}</span>}
                  {resume.sections.contact.github && <span>{resume.sections.contact.github}</span>}
                  {resume.sections.contact.portfolio && <span>{resume.sections.contact.portfolio}</span>}
                </div>
              </div>

              {/* Summary Section */}
              {resume.sections.summary && (
                <div className="mb-6">
                  <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                    Professional Summary
                  </h4>
                  <p className="text-xs text-zinc-700 leading-relaxed text-justify">
                    {resume.sections.summary}
                  </p>
                </div>
              )}

              {/* Experience Section */}
              {resume.sections.experience.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                    Work Experience
                  </h4>
                  <div className="flex flex-col gap-4">
                    {resume.sections.experience.map((exp) => (
                      <div key={exp.id}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-xs text-zinc-900">{exp.role || 'Role Title'}</span>
                            <span className="text-xs text-zinc-500"> at {exp.company || 'Company'}</span>
                          </div>
                          <span className="text-xs text-zinc-500 shrink-0 font-medium">
                            {exp.startDate || 'Start'} – {exp.current ? 'Present' : (exp.endDate || 'End')}
                          </span>
                        </div>
                        {exp.location && <p className="text-[10px] text-zinc-400 mt-0.5">{exp.location}</p>}
                        {exp.description && (
                          <pre className="text-xs text-zinc-700 mt-2 font-sans whitespace-pre-line leading-relaxed">
                            {exp.description}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Section */}
              {resume.sections.education.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                    Education
                  </h4>
                  <div className="flex flex-col gap-3">
                    {resume.sections.education.map((edu) => (
                      <div key={edu.id} className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-zinc-900">{edu.degree || 'Degree'}</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{edu.school || 'School/University'}, {edu.location}</p>
                        </div>
                        <span className="text-xs text-zinc-500 shrink-0 font-medium">
                          {edu.startDate || 'Start'} – {edu.endDate || 'End'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Section */}
              {resume.sections.projects.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                    Projects
                  </h4>
                  <div className="flex flex-col gap-4">
                    {resume.sections.projects.map((proj) => (
                      <div key={proj.id}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-xs text-zinc-900">{proj.name || 'Project Name'}</span>
                            {proj.role && <span className="text-xs text-zinc-500"> ({proj.role})</span>}
                          </div>
                          {proj.link && (
                            <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                              <LinkIcon className="w-3 h-3" /> {proj.link}
                            </span>
                          )}
                        </div>
                        {proj.technologies && (
                          <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                            Tech: {proj.technologies}
                          </p>
                        )}
                        {proj.description && (
                          <pre className="text-xs text-zinc-700 mt-1.5 font-sans whitespace-pre-line leading-relaxed">
                            {proj.description}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Section */}
              {resume.sections.skills.length > 0 && resume.sections.skills[0] !== '' && (
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resume.sections.skills.map((skill, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] bg-zinc-100 text-zinc-800 font-medium px-2 py-0.5 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* AI Suggestions Modal */}
      {generatingAiField && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-foreground">
                {generatingAiField.type === 'summary' ? 'AI Summary Suggestions' : 'AI Bullet Suggestions'}
              </h3>
            </div>
            
            {/* Custom Prompt Input Box for Professional Summary & Bullet Suggestions */}
            {(generatingAiField.type === 'summary' || generatingAiField.type === 'experience' || generatingAiField.type === 'projects') && (
              <div className="flex flex-col gap-2 mb-4 bg-muted/40 p-3 rounded-lg border border-border/50 text-left">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Add custom requirements or highlights (Optional)
                </label>
                <textarea
                  value={customRequirement}
                  onChange={(e) => setCustomRequirement(e.target.value)}
                  placeholder={generatingAiField.type === 'summary' 
                    ? "e.g. Focus on my React experience and transitioning from design to software engineering"
                    : "e.g. Highlight cloud deployments, containerization, or backend database query optimizations"}
                  rows={2}
                  className="w-full border border-border focus:border-foreground rounded p-1.5 outline-none text-xs bg-background text-foreground"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (generatingAiField.type === 'summary') {
                      handleGenerateAiSummary(resume.sections.contact.title, customRequirement);
                    } else {
                      const fieldData = generatingAiField.type === 'experience' 
                        ? resume.sections.experience[generatingAiField.index] 
                        : resume.sections.projects[generatingAiField.index];
                      const title = generatingAiField.type === 'experience' ? fieldData.role : fieldData.name;
                      handleGenerateAiBullets(generatingAiField.type, generatingAiField.index, title, customRequirement);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 h-8 mt-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <Sparkles className="w-3 h-3 animate-pulse" /> {generatingAiField.type === 'summary' ? 'Generate Custom Summary' : 'Generate Custom Suggestions'}
                </Button>
              </div>
            )}
            
            {aiError ? (
              <div className="py-4 text-center">
                <p className="text-sm text-destructive font-semibold mb-2">
                  {aiError.includes("generations for today") ? "Rate Limit Reached" : "Generation Error"}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed mb-4">
                  {aiError}
                </p>
                <Button
                  size="xs"
                  onClick={() => {
                    if (generatingAiField.type === 'summary') {
                      handleGenerateAiSummary(resume.sections.contact.title, customRequirement);
                    } else {
                      const fieldData = generatingAiField.type === 'experience' 
                        ? resume.sections.experience[generatingAiField.index] 
                        : resume.sections.projects[generatingAiField.index];
                      const title = generatingAiField.type === 'experience' ? fieldData.role : fieldData.name;
                      handleGenerateAiBullets(generatingAiField.type, generatingAiField.index, title, customRequirement);
                    }
                  }}
                  className="mx-auto"
                >
                  Retry Generation
                </Button>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                <p className="text-xs text-muted-foreground">Consulting Gemini model...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground mb-1 text-left">
                  {generatingAiField.type === 'summary' 
                    ? 'Click a summary below to overwrite your professional summary:' 
                    : 'Click a suggestion below to copy it into your description area:'}
                </p>
                {aiSuggestions.map((suggestion, idx) => (
                  <div 
                    key={idx}
                    onClick={() => applyAiBullet(suggestion)}
                    className="border border-border/80 hover:border-amber-500/50 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 p-3 rounded-lg text-xs cursor-pointer transition-all leading-relaxed text-left text-foreground bg-card shadow-xs"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-between items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={aiSuggestions.length === 0 && !aiError}
                onClick={() => {
                  if (generatingAiField.type === 'summary') {
                    handleGenerateAiSummary(resume.sections.contact.title, customRequirement);
                  } else {
                    const fieldData = generatingAiField.type === 'experience' 
                      ? resume.sections.experience[generatingAiField.index] 
                      : resume.sections.projects[generatingAiField.index];
                    const title = generatingAiField.type === 'experience' ? fieldData.role : fieldData.name;
                    handleGenerateAiBullets(generatingAiField.type, generatingAiField.index, title, customRequirement);
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate More
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setGeneratingAiField(null)}
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Summary Overwrite */}
      {showConfirmReplace && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-2 text-amber-500 mb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-md font-bold text-foreground">Replace Summary?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              This will overwrite your existing professional summary. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowConfirmReplace(false)
                  setPendingSummary(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={() => {
                  handleSummaryChange(pendingSummary)
                  setShowConfirmReplace(false)
                  setPendingSummary(null)
                  setGeneratingAiField(null)
                }}
              >
                Replace
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Project Description Overwrite */}
      {showProjectConfirmReplace && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-2 text-amber-500 mb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-md font-bold text-foreground">Replace Project Description?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              This will overwrite your existing project details description. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowProjectConfirmReplace(false)
                  setPendingProjectDescription(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={() => {
                  updateProject(pendingProjectDescription.index, 'description', pendingProjectDescription.description)
                  setShowProjectConfirmReplace(false)
                  setPendingProjectDescription(null)
                  setGeneratingProjectAiIndex(null)
                  setProjectAiSuggestion(null)
                }}
              >
                Replace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeEditor
