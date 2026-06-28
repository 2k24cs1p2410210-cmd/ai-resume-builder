import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SignInPage from './auth/sign-in'
import SignUpPage from './auth/sign-up'
import Home from './home'
import Dashboard from './dashboard'
import NewResume from './dashboard/resumes/new'
import ResumeEditor from './dashboard/resumes/edit'
import ResumeAnalyzer from './dashboard/resumes/analyze'
import ResumeExport from './dashboard/resumes/export'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    element: <App />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />
      },
      {
        path: '/dashboard/resumes/new',
        element: <NewResume />
      },
      {
        path: '/dashboard/resumes/:id/edit',
        element: <ResumeEditor />
      },
      {
        path: '/dashboard/resumes/:id/analyze',
        element: <ResumeAnalyzer />
      },
      {
        path: '/dashboard/resumes/:id/export',
        element: <ResumeExport />
      }
    ]
  },
  {
    path: '/auth/sign-in/*',
    element: <SignInPage />
  },
  {
    path: '/auth/sign-up/*',
    element: <SignUpPage />
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <RouterProvider router={router} />
    </ClerkProvider>
  </StrictMode>,
)
