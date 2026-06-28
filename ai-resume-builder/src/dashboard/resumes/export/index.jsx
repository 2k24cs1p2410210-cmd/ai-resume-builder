import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileText, Link as LinkIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getResumeById } from '@/lib/db'
import { useAuth } from '@clerk/react'

export default function ResumeExport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
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
        setLoading(false)
      }
    }
    loadData()
  }, [id, navigate])

  if (loading || !resume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 dark:bg-zinc-950 text-foreground print:bg-white print:text-black">
      {/* Control Navigation Header (Hidden on Print) */}
      <header className="border-b border-border/40 py-4 px-6 sm:px-12 flex justify-between items-center bg-card shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm" className="rounded-lg">
            <Link to={`/dashboard/resumes/${id}/edit`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{resume.title}</h1>
            <p className="text-xs text-muted-foreground">Print & Export</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard/resumes/${id}/edit`}>Back to Editor</Link>
          </Button>
          <Button 
            onClick={handlePrint} 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>
      </header>

      {/* Sheet Preview Canvas */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start print:p-0 print:overflow-visible">
        <div 
          className="w-full max-w-[800px] bg-white text-zinc-900 shadow-xl border border-zinc-200/50 rounded p-10 font-sans flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:w-full"
          style={{ minHeight: '1000px' }}
        >
          <div>
            {/* Contact Details Header */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                {resume.sections.contact.name || 'Your Name'}
              </h2>
              <p className="text-sm font-semibold text-zinc-600 mt-1 uppercase tracking-wide">
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

            {/* Professional Summary */}
            {resume.sections.summary && (
              <div className="mb-6 text-left">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                  Professional Summary
                </h4>
                <p className="text-xs text-zinc-700 leading-relaxed text-justify">
                  {resume.sections.summary}
                </p>
              </div>
            )}

            {/* Experience Section */}
            {Array.isArray(resume.sections.experience) && resume.sections.experience.length > 0 && (
              <div className="mb-6 text-left">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
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
                        <p className="text-xs text-zinc-700 mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education Section */}
            {Array.isArray(resume.sections.education) && resume.sections.education.length > 0 && (
              <div className="mb-6 text-left">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
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
            {Array.isArray(resume.sections.projects) && resume.sections.projects.length > 0 && (
              <div className="mb-6 text-left">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
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
                        <p className="text-xs text-zinc-700 mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications Section */}
            {Array.isArray(resume.sections.certifications) && resume.sections.certifications.length > 0 && (
              <div className="mb-6 text-left">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                  Certifications
                </h4>
                <div className="flex flex-col gap-2">
                  {resume.sections.certifications.map((cert, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs">
                      <div>
                        <span className="font-bold text-zinc-900">{cert.name || 'Certification Name'}</span>
                        {cert.issuer && <span className="text-zinc-500"> ({cert.issuer})</span>}
                      </div>
                      {cert.date && <span className="text-zinc-500 shrink-0 font-medium">{cert.date}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Section */}
            {Array.isArray(resume.sections.skills) && resume.sections.skills.length > 0 && resume.sections.skills[0] !== '' && (
              <div className="text-left">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {resume.sections.skills.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] bg-zinc-100 text-zinc-800 font-medium px-2.5 py-0.5 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
