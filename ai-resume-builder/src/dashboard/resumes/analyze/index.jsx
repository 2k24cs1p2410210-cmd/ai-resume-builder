import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Loader2, Sparkles, 
  ChevronDown, ChevronUp, RefreshCw, Star, Info, ListTodo,
  Search, AlertTriangle, ArrowRight, Check, X, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getResumeById, saveResume, analyzeResume, applyResumeFix } from '@/lib/db'
import { useAuth } from '@clerk/react'

// --- Custom styled sub-components for rich premium aesthetics ---
function Card({ children, className = '' }) {
  return (
    <div className={`border border-border/80 bg-card rounded-xl p-5 shadow-xs transition-all ${className}`}>
      {children}
    </div>
  )
}

function Badge({ children, variant = 'default', className = '' }) {
  let styles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors'
  if (variant === 'success') {
    styles += ' bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
  } else if (variant === 'destructive') {
    styles += ' bg-destructive/10 text-destructive border border-destructive/20'
  } else if (variant === 'warning') {
    styles += ' bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
  } else if (variant === 'outline') {
    styles += ' border border-border text-muted-foreground bg-transparent'
  } else {
    styles += ' bg-secondary text-secondary-foreground'
  }
  return (
    <span className={`${styles} ${className}`}>
      {children}
    </span>
  )
}

function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-muted rounded ${className}`} />
  )
}

function ScoreDial({ score, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  let strokeColor = 'stroke-amber-500'
  let textColor = 'text-amber-600 dark:text-amber-400'
  if (score >= 80) {
    strokeColor = 'stroke-emerald-500'
    textColor = 'text-emerald-600 dark:text-emerald-400'
  } else if (score < 50) {
    strokeColor = 'stroke-destructive'
    textColor = 'text-destructive animate-pulse'
  }

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border/40 fill-transparent"
          strokeWidth={strokeWidth}
        />
        {/* Foreground Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`fill-transparent transition-all duration-700 ease-out ${strokeColor}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-4xl font-extrabold tracking-tighter ${textColor}`}>{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">ATS Score</span>
      </div>
    </div>
  )
}

// Config mappings for standard categories
const categoryMeta = {
  atsCompatibility: {
    title: 'ATS Compatibility',
    icon: Info,
    colorClasses: {
      scoreBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
      theme: 'indigo'
    }
  },
  contentQuality: {
    title: 'Content Quality',
    icon: Star,
    colorClasses: {
      scoreBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
      theme: 'rose'
    }
  },
  structureCompleteness: {
    title: 'Structure & Completeness',
    icon: ListTodo,
    colorClasses: {
      scoreBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
      theme: 'sky'
    }
  },
  keywordRelevance: {
    title: 'Keyword & Relevance',
    icon: Search,
    colorClasses: {
      scoreBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      theme: 'amber'
    }
  },
  grammarPolish: {
    title: 'Grammar & Polish',
    icon: CheckCircle2,
    colorClasses: {
      scoreBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      theme: 'emerald'
    }
  }
}

// Helper to map feedback section keys to editor sections
const mapSectionToParam = (sectionName) => {
  if (!sectionName) return 'contact'
  const lower = sectionName.toLowerCase()
  if (lower.includes('contact') || lower.includes('links') || lower.includes('info')) return 'contact'
  if (lower.includes('summary')) return 'summary'
  if (lower.includes('experience') || lower.includes('work') || lower.includes('history')) return 'experience'
  if (lower.includes('education') || lower.includes('academic')) return 'education'
  if (lower.includes('skill')) return 'skills'
  if (lower.includes('project')) return 'projects'
  return 'contact'
}

export default function ResumeAnalyzer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [resume, setResume] = useState(null)
  const [loadingResume, setLoadingResume] = useState(true)
  
  // Form and loading states
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [applyingMap, setApplyingMap] = useState({})
  const [appliedIssues, setAppliedIssues] = useState(new Set())
  const [applyErrorMap, setApplyErrorMap] = useState({})

  const handleApplyFix = async (fixObj) => {
    const issueId = fixObj.id;
    if (!issueId) return;

    setApplyingMap(prev => ({ ...prev, [issueId]: true }));
    setApplyErrorMap(prev => ({ ...prev, [issueId]: null }));

    try {
      const token = await getToken();
      const updatedResume = await applyResumeFix(id, fixObj, token);
      if (updatedResume) {
        setResume(updatedResume);
        setAppliedIssues(prev => {
          const next = new Set(prev);
          next.add(issueId);
          return next;
        });
      } else {
        throw new Error("Failed to apply suggested fix.");
      }
    } catch (err) {
      console.error("Failed to apply fix:", err);
      setApplyErrorMap(prev => ({ ...prev, [issueId]: err.message || "Couldn't apply this fix. Try again." }));
    } finally {
      setApplyingMap(prev => ({ ...prev, [issueId]: false }));
    }
  };

  // Fetch resume data
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
        setResume(data)
      } catch (err) {
        console.error("Failed to load resume details:", err)
        navigate('/dashboard')
      } finally {
        setLoadingResume(false)
      }
    }
    loadData()
  }, [id, navigate])

  if (!resume || loadingResume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Pre-run Content completeness validation
  const hasExperience = Array.isArray(resume.sections?.experience) && resume.sections.experience.length > 0
  const hasProjects = Array.isArray(resume.sections?.projects) && resume.sections.projects.length > 0
  const hasSkills = Array.isArray(resume.sections?.skills) && resume.sections.skills.length > 0 && resume.sections.skills[0] !== ''
  const isTooEmpty = (!hasExperience && !hasProjects) || !hasSkills

  const handleAnalyze = async () => {
    if (isTooEmpty) return

    setLoading(true)
    setError(null)
    
    try {
      const token = await getToken()
      const result = await analyzeResume(id, jobDescription.trim() || null, token)
      
      // Save report in resume object
      const updated = await saveResume(id, {
        atsScore: result.overallScore,
        atsReport: result
      }, token)
      
      if (updated) {
        setResume(updated)
      } else {
        throw new Error("Failed to save analysis report to database.")
      }

    } catch (err) {
      console.error("Analysis execution error:", err)
      setError(err.message || "Couldn't analyze your resume. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const toggleCategoryExpand = (catKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catKey]: !prev[catKey]
    }))
  }

  // Active analysis report stored on the resume
  const report = resume.atsReport || null

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Header Navigation */}
      <header className="border-b border-border/40 py-4 px-6 sm:px-12 flex justify-between items-center bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm" className="rounded-lg">
            <Link to={`/dashboard/resumes/${id}/edit`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{resume.title}</h1>
            <p className="text-xs text-muted-foreground">Resume Analyzer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard/resumes/${id}/edit`}>Editor</Link>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 sm:py-12 flex flex-col gap-8">
        
        {/* Warning Empty State Check */}
        {isTooEmpty ? (
          <div className="border border-dashed border-destructive/40 bg-destructive/5 rounded-xl p-8 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="p-3 bg-destructive/10 rounded-full text-destructive mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Incomplete Resume Content</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 mb-6">
              Add at least your Experience (or Projects) and Skills sections before analyzing.
            </p>
            <Button asChild>
              <Link to={`/dashboard/resumes/${id}/edit`}>
                Go to Resume Editor <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Control Form Card (Runs Analysis) */}
            {!report && !loading && (
              <Card className="max-w-2xl mx-auto w-full border-dashed">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-md font-bold">Configure Resume Scan</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Run a complete analysis using Gemini. It evaluates ATS readability, content impact, styling mistakes, and matching. You can optionally paste a target Job Description to get precise match scoring.
                </p>

                <div className="flex flex-col gap-2 mb-6">
                  <label htmlFor="jd-input" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Paste a job description to also check your match (optional)
                  </label>
                  <textarea
                    id="jd-input"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste job posting text here (responsibilities, skills, qualifications)..."
                    rows={5}
                    className="w-full border border-border focus:border-foreground rounded-lg p-3 outline-none text-xs bg-background text-foreground transition-all"
                  />
                </div>

                <Button 
                  onClick={handleAnalyze} 
                  className="w-full flex items-center justify-center gap-1.5 h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" /> Analyze Resume
                </Button>
              </Card>
            )}

            {/* Loading / Scanning skeleton state */}
            {loading && (
              <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
                {/* Score Dial Hero loading */}
                <div className="border border-border/80 bg-card rounded-xl p-8 flex flex-col items-center justify-center shadow-xs">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                  <h3 className="text-sm font-bold text-foreground animate-pulse">Analyzing Resume with Gemini...</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center leading-relaxed">
                    This heavier scan evaluates ATS compliance, checks language verb quality, structures keyword matrices, and counts 3 daily quota tokens.
                  </p>
                  <div className="mt-8 flex gap-4 w-full max-w-md justify-center">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-28" />
                  </div>
                </div>

                {/* Skeletons for grid content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-44 w-full" />
                </div>
              </div>
            )}

            {/* Error States */}
            {error && !loading && (
              <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-6 text-center max-w-md mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
                <h3 className="font-bold text-sm text-foreground">
                  {error.includes("used all your AI generations") || error.includes("quota")
                    ? "Quota Exceeded"
                    : "Analysis Error"}
                </h3>
                <p className="text-xs text-muted-foreground mt-2 mb-5 leading-relaxed">
                  {error}
                </p>
                <div className="flex justify-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setError(null)
                      setJobDescription('')
                    }}
                  >
                    Clear
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleAnalyze}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Retry Scan
                  </Button>
                </div>
              </div>
            )}

            {/* Active Analysis Dashboard */}
            {report && !loading && !error && (
              <div className="flex flex-col gap-8 w-full animate-in fade-in duration-200">
                
                {/* Hero Overall Summary Card */}
                <div className="border border-border/80 bg-card rounded-xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-10 items-center shadow-sm">
                  <div className="shrink-0">
                    <ScoreDial score={report.overallScore} size={130} strokeWidth={11} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-black tracking-tight">Your Resume Optimization Report</h2>
                    <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                      Gemini scanned your details. The resume scored <strong className="text-foreground">{report.overallScore}/100</strong>. Read the breakdown below to check details, address warning indicators, and compare against industry target terms.
                    </p>
                    
                    {/* Inline JD Match Badge */}
                    {report.jdMatch && (
                      <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                        <span className="text-muted-foreground">Job Match Alignment:</span>
                        <Badge variant={report.jdMatch.matchScore >= 75 ? 'success' : report.jdMatch.matchScore >= 50 ? 'warning' : 'destructive'}>
                          {report.jdMatch.matchScore}% Match
                        </Badge>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                      <Button 
                        onClick={handleAnalyze} 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
                      </Button>
                      <Button asChild size="sm">
                        <Link to={`/dashboard/resumes/${id}/edit`}>
                          Edit Resume
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Optional Configuration Area (Collapse/Expand Form to run again) */}
                <details className="group border border-border/60 bg-muted/20 rounded-xl p-4 transition-all">
                  <summary className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none outline-none">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Re-run Scan with Job Description
                    </span>
                    <ChevronDown className="w-4 h-4 transform group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste target job posting here to measure match alignment..."
                      rows={4}
                      className="w-full border border-border focus:border-foreground rounded-lg p-2.5 outline-none text-xs bg-background text-foreground transition-all"
                    />
                    <Button 
                      onClick={handleAnalyze} 
                      size="sm"
                      className="self-end bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Run Match Analysis
                    </Button>
                  </div>
                </details>

                {/* Grid Category Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(report.categories).map(([key, data]) => {
                    const meta = categoryMeta[key] || { title: key, icon: Info, colorClasses: { scoreBg: 'bg-muted text-foreground', theme: 'zinc' } }
                    const IconComp = meta.icon
                    const isExpanded = !!expandedCategories[key]
                    
                    return (
                      <Card key={key} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          {/* Title block */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg bg-secondary text-muted-foreground`}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <h3 className="font-bold text-sm tracking-tight text-foreground">{meta.title}</h3>
                            </span>
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${meta.colorClasses.scoreBg}`}>
                              {data.score}/100
                            </span>
                          </div>

                          {/* Category Summary */}
                          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                            {data.summary}
                          </p>
                        </div>

                        {/* Collapsible Action issues list */}
                        <div className="border-t border-border/40 pt-3 mt-2">
                          <button
                            onClick={() => toggleCategoryExpand(key)}
                            className="w-full flex justify-between items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer"
                          >
                            <span>Issues / Action Flags ({data.issues?.length || 0})</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 animate-in fade-in duration-100">
                              <div className="text-[10px] bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5 text-indigo-600 dark:text-indigo-400 font-medium">
                                Click Apply Fix to add a suggestion directly to your resume — you can review and edit it afterward in the editor.
                              </div>
                              {Array.isArray(data.issues) && data.issues.length > 0 ? (
                                data.issues.map((issue, idx) => {
                                  const isObj = typeof issue === 'object' && issue !== null;
                                  const id = isObj ? issue.id : `issue-${idx}`;
                                  const description = isObj ? issue.description : issue;
                                  const hasFix = isObj && issue.fix && issue.fixType !== 'add_section_note';
                                  const isApplied = appliedIssues.has(id);
                                  const isApplying = !!applyingMap[id];
                                  const errorMsg = applyErrorMap[id];

                                  return (
                                    <div key={id} className="flex flex-col gap-2 bg-muted/40 p-3 rounded-lg border border-border/50 transition-all">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 text-xs">
                                          {isApplied ? (
                                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                          ) : (
                                            <X className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                          )}
                                          <p className={`text-muted-foreground leading-normal ${isApplied ? 'line-through text-muted-foreground/60' : ''}`}>
                                            {description}
                                          </p>
                                        </div>

                                        {hasFix && (
                                          <Button
                                            size="sm"
                                            variant={isApplied ? "ghost" : "outline"}
                                            onClick={() => handleApplyFix(issue)}
                                            disabled={isApplied || isApplying}
                                            className={`shrink-0 text-[10px] font-bold h-7 px-2.5 ${
                                              isApplied 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-default border-none' 
                                                : 'border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5'
                                            }`}
                                          >
                                            {isApplying ? (
                                              <>
                                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                Applying
                                              </>
                                            ) : isApplied ? (
                                              <>
                                                <Check className="w-3 h-3 mr-1" />
                                                Applied
                                              </>
                                            ) : (
                                              'Apply Fix'
                                            )}
                                          </Button>
                                        )}
                                      </div>

                                      {hasFix && !isApplied && (
                                        <div className="ml-5 bg-background/50 border border-border/40 rounded p-2 text-[11px] font-mono text-muted-foreground leading-relaxed select-all">
                                          <span className="font-sans font-semibold text-[10px] text-foreground block mb-0.5 uppercase tracking-wide">
                                            Suggested Fix:
                                          </span>
                                          {issue.fix}
                                        </div>
                                      )}

                                      {errorMsg && (
                                        <p className="ml-5 text-[10px] text-destructive font-medium">
                                          {errorMsg}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="flex items-center gap-2 text-xs bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 p-2.5 rounded-lg border border-emerald-500/10">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <p className="font-medium">No warnings found. Looks good!</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>

                {/* Optional Job Description Match Card details */}
                {report.jdMatch && (
                  <Card className="bg-muted/15 border-indigo-500/20">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                          <Search className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground">Job Description Match Analysis</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">Keyword density comparison against target role requirements</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Match Score:</span>
                        <span className={`font-mono text-sm font-black px-2.5 py-0.5 rounded-md ${
                          report.jdMatch.matchScore >= 75
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : report.jdMatch.matchScore >= 50
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {report.jdMatch.matchScore}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Matching Keywords */}
                      <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Matching Keywords ({report.jdMatch.matchingKeywords?.length || 0})
                        </h4>
                        {Array.isArray(report.jdMatch.matchingKeywords) && report.jdMatch.matchingKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {report.jdMatch.matchingKeywords.map((kw, i) => (
                              <Badge key={i} variant="success">{kw}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No matching keywords detected.</p>
                        )}
                      </div>

                      {/* Missing Keywords */}
                      <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                          <AlertTriangle className="w-3.5 h-3.5" /> Missing / Gap Keywords ({report.jdMatch.missingKeywords?.length || 0})
                        </h4>
                        {Array.isArray(report.jdMatch.missingKeywords) && report.jdMatch.missingKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {report.jdMatch.missingKeywords.map((kw, i) => {
                              const isObj = typeof kw === 'object' && kw !== null;
                              const keyword = isObj ? (kw.fix || kw.description) : kw;
                              const id = isObj ? kw.id : `missing-kw-${i}`;
                              const isApplied = appliedIssues.has(id);
                              const isApplying = !!applyingMap[id];

                              if (isObj) {
                                return (
                                  <div key={id} className="inline-flex items-center gap-1">
                                    <Badge 
                                      variant={isApplied ? "success" : "outline"} 
                                      className={`flex items-center gap-1.5 py-1 px-2.5 transition-colors ${
                                        isApplied ? '' : 'border-amber-500/20 text-amber-700 dark:text-amber-400 bg-amber-500/5'
                                      }`}
                                    >
                                      <span>{keyword}</span>
                                      <button
                                        onClick={() => handleApplyFix(kw)}
                                        disabled={isApplied || isApplying}
                                        className={`rounded-full p-0.5 focus:outline-none transition-all flex items-center justify-center ${
                                          isApplied ? 'cursor-default text-emerald-600' : 'cursor-pointer hover:bg-muted text-amber-600 hover:text-amber-800'
                                        }`}
                                        title={isApplied ? "Added to skills" : "Add to skills"}
                                      >
                                        {isApplying ? (
                                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                        ) : isApplied ? (
                                          <Check className="w-3 h-3" />
                                        ) : (
                                          <Plus className="w-3 h-3" />
                                        )}
                                      </button>
                                    </Badge>
                                  </div>
                                );
                              }

                              return (
                                <Badge key={i} variant="outline">{keyword}</Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">All critical keywords satisfied!</p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Section-by-Section Detailed Feedback */}
                {Array.isArray(report.sectionFeedback) && report.sectionFeedback.length > 0 && (
                  <Card className="bg-card">
                    <div className="flex items-center gap-2 mb-6">
                      <ListTodo className="w-5 h-5 text-indigo-500" />
                      <div>
                        <h3 className="font-extrabold text-sm text-foreground">Section-Specific Critique</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Line-level adjustments to implement directly in the editor</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {report.sectionFeedback.map((fb, idx) => {
                        const sectKey = mapSectionToParam(fb.section)
                        return (
                          <div 
                            key={idx} 
                            className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/10 transition-colors"
                          >
                            <div className="flex-1 text-left">
                              <span className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground text-[10px] font-extrabold uppercase px-2 py-0.5 tracking-wider mb-2">
                                {fb.section || 'General'}
                              </span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {fb.feedback}
                              </p>
                            </div>
                            <Button 
                              asChild 
                              variant="outline" 
                              size="sm" 
                              className="shrink-0 text-xs w-full sm:w-auto mt-2 sm:mt-0 font-bold border-indigo-500/10 text-indigo-600 hover:bg-indigo-500/5 dark:text-indigo-400"
                            >
                              <Link to={`/dashboard/resumes/${id}/edit?section=${sectKey}`}>
                                Go to section <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
