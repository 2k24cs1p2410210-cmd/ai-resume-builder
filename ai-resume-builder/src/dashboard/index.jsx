import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserButton, useUser, useAuth } from '@clerk/react'
import { FileText, MoreVertical, Edit2, Copy, Trash2, Plus, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getResumes, duplicateResume, deleteResume } from '@/lib/db'

function Dashboard() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()
  const [resumes, setResumes] = useState([])
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch resumes from Supabase via backend API
  const loadResumes = async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await getToken()
      const data = await getResumes(token)
      setResumes(data)
    } catch (err) {
      console.error("Failed to load resumes:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadResumes()
    }
  }, [user])

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null)
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  // Handlers
  const handleDuplicate = async (e, id) => {
    e.stopPropagation()
    try {
      const token = await getToken()
      await duplicateResume(id, token)
      await loadResumes()
    } catch (err) {
      console.error("Failed to duplicate resume:", err)
    }
    setActiveMenuId(null)
  }

  const handleDeleteClick = (e, id) => {
    e.stopPropagation()
    setDeleteConfirmId(id)
    setActiveMenuId(null)
  }

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        const token = await getToken()
        await deleteResume(deleteConfirmId, token)
        await loadResumes()
      } catch (err) {
        console.error("Failed to delete resume:", err)
      }
      setDeleteConfirmId(null)
    }
  }

  const getTemplateLabel = (templateId) => {
    switch (templateId) {
      case 'minimalist': return 'Minimalist'
      case 'modern': return 'Modern'
      case 'professional': return 'Professional'
      default: return 'Custom'
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="border-b border-border/40 py-4 px-6 sm:px-12 flex justify-between items-center bg-card">
        <span className="text-xl font-bold tracking-tight">ResuMatch AI</span>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 sm:py-16">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">My Resumes</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and optimize your resumes</p>
          </div>
          <Button asChild size="default" className="flex items-center gap-1.5">
            <Link to="/dashboard/resumes/new">
              <Plus className="w-4 h-4" /> New Resume
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading resumes...</p>
          </div>
        ) : resumes.length === 0 ? (
          /* Empty State */
          <div className="border border-dashed border-border rounded-xl p-16 text-center flex flex-col items-center justify-center bg-card">
            <div className="p-4 bg-muted rounded-full text-muted-foreground mb-4">
              <FileText className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-foreground">No Resumes Yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
              Create your first resume to start matching jobs and optimizing your ATS score with AI.
            </p>
            <Button asChild size="lg">
              <Link to="/dashboard/resumes/new">
                + Create Your First Resume
              </Link>
            </Button>
          </div>
        ) : (
          /* Resumes Grid ("The Shelf" Style Folio Tabs) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {resumes.map((resume) => {
              const formattedDate = new Date(resume.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })

              return (
                <div 
                  key={resume.id}
                  onClick={() => navigate(`/dashboard/resumes/${resume.id}/edit`)}
                  className="relative group border border-border/80 bg-card rounded-xl p-6 hover:border-foreground/40 transition-all cursor-pointer pt-12 shadow-sm flex flex-col justify-between min-h-[160px]"
                >
                  {/* Folio Manila Folder Tab */}
                  <div className="absolute top-0 left-6 -translate-y-1/2 bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-t-md">
                    {getTemplateLabel(resume.templateId)}
                  </div>

                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate max-w-[80%]">
                        {resume.title}
                      </h3>
                      
                      {/* Action Menu Trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === resume.id ? null : resume.id)
                          }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Dropdown Menu */}
                        {activeMenuId === resume.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10 py-1"
                          >
                            <button
                              onClick={() => navigate(`/dashboard/resumes/${resume.id}/edit`)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => navigate(`/dashboard/resumes/${resume.id}/analyze`)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Analyze
                            </button>
                            <button
                              onClick={(e) => handleDuplicate(e, resume.id)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            <div className="border-t border-border/50 my-1"></div>
                            <button
                              onClick={(e) => handleDeleteClick(e, resume.id)}
                              className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      Edited {formattedDate}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">ATS Score:</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/dashboard/resumes/${resume.id}/analyze`)
                      }}
                      className={`font-mono px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        resume.atsScore !== undefined && resume.atsScore !== null
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {resume.atsScore !== undefined && resume.atsScore !== null ? `${resume.atsScore}/100` : 'Not analyzed'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-foreground">Delete Resume?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. All resume content and saved sections will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard