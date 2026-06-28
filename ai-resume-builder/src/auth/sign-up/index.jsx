import React from 'react'
import { SignUp } from '@clerk/react'

function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
          ResuMatch AI
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Build and improve your resume with AI
        </p>
      </div>
      <SignUp 
        routing="path" 
        path="/auth/sign-up" 
        signInUrl="/auth/sign-in" 
        forceRedirectUrl="/dashboard"
      />
    </div>
  )
}

export default SignUpPage
