import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, UploadCloud, Check, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createResume, importResume } from '@/lib/db'
import { useUser, useAuth } from '@clerk/react'

function NewResume() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()
  const [step, setStep] = useState(1) // 1 = choice, 2 = template selector, 3 = upload area
  const [uploadState, setUploadState] = useState('idle') // idle, uploading, parsing, success, error
  const [progress, setProgress] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // Step 2: Choose Template and create blank resume
  const handleSelectTemplate = async (templateId) => {
    setIsCreating(true)
    setError(null)
    try {
      const token = await getToken()
      const newResume = await createResume(templateId, {}, token)
      navigate(`/dashboard/resumes/${newResume.id}/edit`)
    } catch (err) {
      console.error("Failed to create resume:", err)
      setError("Couldn't create your resume. Try again.")
    } finally {
      setIsCreating(false)
    }
  }

  // Step 3: Trigger file selection
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Step 3: File selected -> Trigger real parser
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Simple validation
    const validTypes = ['.pdf', '.docx']
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!validTypes.includes(fileExtension)) {
      alert('Please upload a PDF or DOCX file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.')
      return
    }

    setUploadState('uploading')
    setProgress(20)

    let progressInterval;
    try {
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 75) {
            clearInterval(progressInterval)
            return 75
          }
          return prev + 10
        })
      }, 150)

      const token = await getToken()
      
      // Let it transition to parsing stage
      setUploadState('parsing')
      setProgress(80)

      const newResume = await importResume(file, token)

      clearInterval(progressInterval)
      setProgress(100)
      setUploadState('success')

      setTimeout(() => {
        navigate(`/dashboard/resumes/${newResume.id}/edit?imported=true`)
      }, 500)

    } catch (err) {
      clearInterval(progressInterval)
      console.error("Failed to import resume:", err)
      setUploadState('error')
      alert(err.message || "We couldn't read or parse this file. Try a different file or start from scratch.")
      setUploadState('idle')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 py-4 px-6 sm:px-12 flex items-center bg-card">
        <Button asChild variant="ghost" size="sm" className="mr-4 gap-1">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </Button>
        <span className="text-lg font-bold tracking-tight">Create New Resume</span>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 sm:py-16 flex flex-col justify-center">
        {step === 1 && (
          /* Step 1: Blank vs Upload Choice */
          <div>
            <h1 className="text-3xl font-extrabold text-center tracking-tight mb-2">How would you like to start?</h1>
            <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
              Choose to build a clean resume layout from scratch or upload your current resume for instant AI analysis.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {/* Option A: Start from Scratch */}
              <div 
                onClick={() => setStep(2)}
                className="border border-border/80 bg-card rounded-xl p-8 hover:border-foreground/40 hover:shadow-md transition-all cursor-pointer text-center group flex flex-col items-center justify-center min-h-[220px]"
              >
                <div className="p-4 bg-muted group-hover:bg-primary/5 group-hover:text-primary rounded-full mb-4 transition-colors">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">Start from scratch</h3>
                <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
                  Select an ATS-safe layout and enter your professional history step-by-step.
                </p>
              </div>

              {/* Option B: Upload Existing */}
              <div 
                onClick={() => setStep(3)}
                className="border border-border/80 bg-card rounded-xl p-8 hover:border-foreground/40 hover:shadow-md transition-all cursor-pointer text-center group flex flex-col items-center justify-center min-h-[220px]"
              >
                <div className="p-4 bg-muted group-hover:bg-primary/5 group-hover:text-primary rounded-full mb-4 transition-colors">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">Upload existing resume</h3>
                <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
                  Import your PDF/DOCX to pre-fill the editor and generate instant feedback.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          /* Step 2: Template Selector */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
            <button 
              onClick={() => { setStep(1); setError(null); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
              disabled={isCreating}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to choice
            </button>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Select a Template</h2>
            <p className="text-sm text-muted-foreground mb-8">
              All layouts are designed in single-column format to guarantee maximum ATS readability.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex items-center justify-between animate-in fade-in duration-200">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">Dismiss</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Minimalist */}
              <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col justify-between group">
                <div className="p-6 border-b border-border/40 bg-muted/30 flex items-center justify-center h-48">
                  <FileText className="w-16 h-16 text-muted-foreground/60 group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Minimalist</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Traditional academic layout. Maximum parser accuracy.
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleSelectTemplate('minimalist')}
                    className="w-full mt-4 text-xs h-7" 
                    size="sm"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Creating...
                      </>
                    ) : (
                      'Use this template'
                    )}
                  </Button>
                </div>
              </div>

              {/* Modern */}
              <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col justify-between group">
                <div className="p-6 border-b border-border/40 bg-muted/30 flex items-center justify-center h-48">
                  <FileText className="w-16 h-16 text-muted-foreground/60 group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Modern</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clean line separators with styled section headings.
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleSelectTemplate('modern')}
                    className="w-full mt-4 text-xs h-7" 
                    size="sm"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Creating...
                      </>
                    ) : (
                      'Use this template'
                    )}
                  </Button>
                </div>
              </div>

              {/* Professional */}
              <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col justify-between group">
                <div className="p-6 border-b border-border/40 bg-muted/30 flex items-center justify-center h-48">
                  <FileText className="w-16 h-16 text-muted-foreground/60 group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Professional</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bold font sizes and clear divider layouts for high-impact roles.
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleSelectTemplate('professional')}
                    className="w-full mt-4 text-xs h-7" 
                    size="sm"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Creating...
                      </>
                    ) : (
                      'Use this template'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          /* Step 3: Upload Area */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-xl mx-auto w-full">
            <button 
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to choice
            </button>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Upload Resume</h2>
            <p className="text-sm text-muted-foreground mb-8">
              We support PDF and DOCX files up to 5MB.
            </p>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx"
              className="hidden"
            />

            {uploadState === 'idle' && (
              <div 
                onClick={handleUploadClick}
                className="border-2 border-dashed border-border hover:border-foreground/30 bg-card rounded-xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
              >
                <div className="p-4 bg-muted rounded-full text-muted-foreground mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <span className="font-bold text-sm text-foreground">Click to select files</span>
                <span className="text-xs text-muted-foreground mt-1">or drag & drop here</span>
              </div>
            )}

            {uploadState === 'uploading' && (
              <div className="border border-border bg-card rounded-xl p-8 text-center shadow-sm">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <h4 className="font-bold text-sm text-foreground">Uploading resume...</h4>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-4 max-w-xs mx-auto">
                  <div 
                    className="bg-primary h-full transition-all duration-150" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadState === 'parsing' && (
              <div className="border border-border bg-card rounded-xl p-8 text-center shadow-sm animate-pulse">
                <Sparkles className="w-8 h-8 text-amber-500 animate-bounce mx-auto mb-4" />
                <h4 className="font-bold text-sm text-foreground">Parsing details...</h4>
                <p className="text-xs text-muted-foreground mt-2">
                  Our parser engine is extracting sections and keywords.
                </p>
              </div>
            )}

            {uploadState === 'success' && (
              <div className="border border-border bg-card rounded-xl p-8 text-center shadow-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Import Success!</h4>
                <p className="text-xs text-muted-foreground mt-2">
                  Redirecting to the builder...
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default NewResume
