import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { 
  Play, ArrowRight, Sparkles, CheckCircle, HelpCircle, 
  ChevronDown, Film, FileText, Zap, Award, Sparkle, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function Home() {
  const { isLoaded, isSignedIn } = useUser()
  const [showVideoModal, setShowVideoModal] = useState(false)
  
  // Interactive Playground state
  const [selectedRole, setSelectedRole] = useState('developer')
  const [playgroundState, setPlaygroundState] = useState('idle') // idle, writing, complete
  
  // FAQ state
  const [openFaq, setOpenFaq] = useState(null)

  const roles = {
    developer: {
      title: 'Software Developer',
      weak: 'I worked on the website front end and fixed bugs.',
      strong: '• Migrated core product UI to React 19, boosting rendering speed by 40% and decreasing overall bundle size by 35%.\n• Collaborated with 5 cross-functional team members to implement an automated CI/CD pipeline, shortening delivery times by 10 days.'
    },
    sales: {
      title: 'Sales Associate',
      weak: 'I sold products to customers and met my targets.',
      strong: '• Exceeded quarterly sales targets by an average of 124% through proactive customer relationship management and structured outreach.\n• Streamlined in-store inventory tracking systems, reducing checkout time by 15%.'
    },
    manager: {
      title: 'Product Manager',
      weak: 'I was in charge of managing the engineering team and releases.',
      strong: '• Defined roadmap and led launch of new AI automation features, capturing $180k in additional annual recurring revenue (ARR).\n• Orchestrated agile sprint cycles for a 12-person team, increasing developer velocity metrics by 22%.'
    }
  }

  const handleAiBoost = () => {
    setPlaygroundState('writing')
    setTimeout(() => {
      setPlaygroundState('complete')
    }, 1200)
  }

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#1B2430] font-sans antialiased overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Decorative top grid/mesh gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[600px] opacity-60 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[80%] bg-gradient-to-br from-indigo-200/40 via-purple-200/20 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="border-b border-[#8A8478]/10 py-5 px-6 sm:px-12 flex justify-between items-center bg-[#FAF8F4]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {/* Custom SVG Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold shadow-sm">
            R
          </div>
          <span className="text-xl font-black tracking-tight text-[#1B2430]">ResuMatch <span className="text-indigo-600 font-medium">AI</span></span>
        </div>

        <div className="flex items-center gap-4">
          {isLoaded && !isSignedIn ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth/sign-in">Log in</Link>
              </Button>
              <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm border-0 font-bold px-4 py-2">
                <Link to="/auth/sign-up">Get Started</Link>
              </Button>
            </>
          ) : isLoaded && isSignedIn ? (
            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm border-0 font-bold px-4 py-2">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 z-10">
        <section className="pt-20 pb-16 px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
          
          {/* New App Tag */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100/60 rounded-full px-4 py-1 text-xs text-indigo-700 font-bold mb-8 hover:bg-indigo-100/40 transition-colors cursor-pointer shadow-xs">
            <span className="bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded text-[9px] tracking-wide">NEW</span>
            <span className="flex items-center gap-1">ResuMatch v1.0 AI Engine <ArrowRight className="w-3 h-3" /></span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#1B2430] leading-[1.05] max-w-3xl">
            Build Your Resume <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">With AI</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-[#8A8478] max-w-2xl font-normal leading-relaxed">
            Effortlessly Craft a Standout Resume with Our AI-Powered Builder
          </p>

          {/* Call-to-actions */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
            {!isLoaded ? (
              <Button disabled size="lg" className="w-full sm:w-auto">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Initializing...
              </Button>
            ) : isSignedIn ? (
              <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto h-12 px-8 flex items-center justify-center gap-2 text-base rounded-xl shadow-md border-0">
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto h-12 px-8 flex items-center justify-center gap-2 text-base rounded-xl shadow-md border-0">
                <Link to="/auth/sign-up">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            )}

            <Button 
              onClick={() => setShowVideoModal(true)}
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto h-12 px-8 border-[#8A8478]/30 hover:bg-[#8A8478]/5 text-[#1B2430] font-bold rounded-xl flex items-center justify-center gap-2 text-base"
            >
              <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" /> Watch video
            </Button>
          </div>

          {/* Featured In Logos */}
          <div className="mt-20 w-full">
            <span className="text-xs uppercase tracking-widest text-[#8A8478] font-bold block mb-8">
              FEATURED IN
            </span>
            <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-20 opacity-70">
              
              {/* Product Hunt */}
              <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-[#DA552F] flex items-center justify-center text-white font-black text-xs">P</div>
                <span className="font-bold text-sm text-[#1B2430] tracking-tight">Product Hunt</span>
              </div>

              {/* YouTube */}
              <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 transition-all cursor-pointer">
                <svg className="w-6 h-6 text-[#FF0000] fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.511a3.002 3.002 0 0 0-2.11 2.107C0 8.053 0 12 0 12s0 3.947.502 5.837a3.003 3.003 0 0 0 2.11 2.107c1.883.511 9.388.511 9.388.511s7.505 0 9.388-.511a3.002 3.002 0 0 0 2.11-2.107c.502-1.89.502-5.837.502-5.837s0-3.947-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="font-black text-sm tracking-tight text-[#1B2430]">YouTube</span>
              </div>

              {/* Reddit */}
              <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 transition-all cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-[#FF4500] flex items-center justify-center text-white text-xs font-bold font-sans">r/</div>
                <span className="font-extrabold text-sm tracking-tight text-[#1B2430]">reddit</span>
              </div>

            </div>
          </div>
        </section>

        {/* Live Interactive AI Playground (Cool functionality) */}
        <section className="bg-white border-t border-b border-[#8A8478]/10 py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 uppercase tracking-wider">
                Interactive Showcase
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight mt-4">
                Watch the AI Optimize in Real-Time
              </h2>
              <p className="text-sm text-[#8A8478] mt-2">
                Select a role and witness how easily ResuMatch AI converts weak descriptions into high-impact bullets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 border border-[#8A8478]/20 rounded-2xl overflow-hidden shadow-lg bg-[#FAF8F4]/30">
              
              {/* Role Select Sidebar */}
              <div className="p-6 border-r border-[#8A8478]/15 bg-white/60 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[#8A8478] uppercase tracking-wider block mb-2">
                  Select Demo Persona
                </span>
                {Object.keys(roles).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedRole(key)
                      setPlaygroundState('idle')
                    }}
                    className={`w-full text-left p-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${selectedRole === key ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-muted text-[#1B2430]'}`}
                  >
                    {roles[key].title}
                    {selectedRole === key && <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                  </button>
                ))}
              </div>

              {/* Dynamic Playground Console */}
              <div className="md:col-span-2 p-8 flex flex-col justify-between min-h-[300px] bg-white">
                <div>
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-[#8A8478] uppercase tracking-wider block">
                      Original Weak Phrase (What you write)
                    </span>
                    <p className="text-sm italic text-gray-500 mt-2 pl-3 border-l-2 border-red-400">
                      "{roles[selectedRole].weak}"
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[#8A8478]/10 pt-6">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-500" /> AI Boosted Phrase (Optimal for Recruiter & ATS)
                    </span>

                    {playgroundState === 'idle' && (
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        Click the button below to rewrite this bullet point...
                      </p>
                    )}

                    {playgroundState === 'writing' && (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-xs text-indigo-600 font-bold animate-pulse">
                          Generating active verbs and metrics metrics...
                        </span>
                      </div>
                    )}

                    {playgroundState === 'complete' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <pre className="text-xs font-sans text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl mt-3 leading-relaxed whitespace-pre-line text-left">
                          {roles[selectedRole].strong}
                        </pre>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-2.5">
                          <CheckCircle className="w-3.5 h-3.5" /> High impact keywords & metrics successfully injected.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 border-t border-[#8A8478]/10 pt-4 flex justify-end">
                  {playgroundState !== 'complete' ? (
                    <Button 
                      onClick={handleAiBoost}
                      disabled={playgroundState === 'writing'}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 h-9 rounded-lg"
                    >
                      <Zap className="w-4 h-4" /> Boost with AI
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setPlaygroundState('idle')}
                      variant="outline"
                      className="h-9 rounded-lg"
                    >
                      Reset Demo
                    </Button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How it Works?</h2>
            <p className="text-sm text-[#8A8478] mt-2">
              Optimize your job application readiness in 3 simple easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white border border-[#8A8478]/10 rounded-2xl p-8 hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg mb-6">
                1
              </div>
              <h3 className="font-bold text-base">Select Your Template</h3>
              <p className="text-xs text-[#8A8478] mt-3 leading-relaxed max-w-[220px]">
                Choose from our pre-formatted single-column templates engineered to pass ATS criteria.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-[#8A8478]/10 rounded-2xl p-8 hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg mb-6">
                2
              </div>
              <h3 className="font-bold text-base">Enhance with AI</h3>
              <p className="text-xs text-[#8A8478] mt-3 leading-relaxed max-w-[220px]">
                Input your role details and let AI suggest metrics-driven bullets and summaries in seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-[#8A8478]/10 rounded-2xl p-8 hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg mb-6">
                3
              </div>
              <h3 className="font-bold text-base">Analyze & Download</h3>
              <p className="text-xs text-[#8A8478] mt-3 leading-relaxed max-w-[220px]">
                Evaluate your resume score, match against job postings, and export a clean PDF.
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic FAQ Accordion */}
        <section className="bg-[#FAF8F4]/50 border-t border-[#8A8478]/10 py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-center tracking-tight mb-10">Frequently Asked Questions</h2>
            
            <div className="flex flex-col gap-4">
              {[
                {
                  q: 'Are the templates strictly ATS-safe?',
                  a: 'Yes. All our templates follow single-column formats and standard margins, ensuring parser engines can scan and index your details without layout corruption.'
                },
                {
                  q: 'How does the AI optimize my bullet points?',
                  a: 'It analyzes your inputted role title, identifies key performance keywords for that industry, and reformats passive statements into active, metric-driven achievements.'
                },
                {
                  q: 'Can I export to PDF?',
                  a: 'Yes. The exporter compiles a clean, vector-text layer PDF, ensuring the document text is searchable and selectable by automated screening software.'
                }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white border border-[#8A8478]/10 rounded-xl overflow-hidden shadow-xs">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-5 font-bold text-sm flex justify-between items-center hover:bg-muted/30 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="p-5 border-t border-[#8A8478]/10 text-xs text-[#8A8478] leading-relaxed bg-[#FAF8F4]/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Bottom Banner */}
        <section className="py-24 px-6 text-center max-w-4xl mx-auto">
          <div className="bg-gradient-to-tr from-indigo-900 to-indigo-950 text-white rounded-3xl p-10 sm:p-16 relative overflow-hidden shadow-xl">
            {/* Background elements */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-200 via-transparent to-transparent pointer-events-none" />
            
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight relative z-10">
              Ready to land more interviews?
            </h2>
            <p className="text-indigo-200 text-sm max-w-sm mx-auto mt-4 mb-8 relative z-10 leading-relaxed">
              Create your ATS-safe resume in minutes and stand out to hiring managers.
            </p>
            
            <div className="relative z-10 flex justify-center">
              {!isLoaded ? (
                <Button disabled size="lg">
                  Checking session...
                </Button>
              ) : isSignedIn ? (
                <Button asChild size="lg" className="bg-white hover:bg-zinc-100 text-indigo-950 font-bold px-8 shadow-md">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="bg-white hover:bg-zinc-100 text-indigo-950 font-bold px-8 shadow-md">
                  <Link to="/auth/sign-up">Get Started For Free</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#8A8478]/10 py-10 text-center text-xs text-[#8A8478] bg-[#FAF8F4] z-10">
        <div className="flex justify-center gap-6 mb-4">
          <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Support</a>
        </div>
        &copy; {new Date().getFullYear()} ResuMatch AI. All rights reserved.
      </footer>

      {/* Watch Video Modal (Interactive mockup) */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF8F4] border border-[#8A8478]/25 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="border-b border-[#8A8478]/10 px-5 py-3 flex justify-between items-center bg-white">
              <span className="font-bold text-xs text-[#8A8478] flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-indigo-600" /> Platform Walkthrough Preview
              </span>
              <button 
                onClick={() => setShowVideoModal(false)}
                className="text-xs text-[#8A8478] hover:text-[#1B2430] font-bold"
              >
                Close (Esc)
              </button>
            </div>
            
            {/* Visual Editor Demonstration Mockup */}
            <div className="p-8 bg-zinc-950 flex flex-col items-center justify-center text-center text-white aspect-video relative group">
              <div className="w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg z-10">
                <Play className="w-6 h-6 fill-white translate-x-0.5" />
              </div>
              <span className="text-xs text-zinc-400 mt-4 z-10 max-w-xs">
                Demo Playback simulation. Build templates and parse PDF/DOCX resumes instantly.
              </span>
              {/* background grid */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            </div>
            
            <div className="bg-white px-6 py-4 flex justify-between items-center">
              <span className="text-[11px] text-[#8A8478]">
                ResuMatch editor layout — real-time A4 page styled sheet preview canvas.
              </span>
              <Button 
                onClick={() => setShowVideoModal(false)} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-4"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Home
