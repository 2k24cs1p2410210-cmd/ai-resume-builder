import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "@clerk/react";

function App() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin dark:border-zinc-800 dark:border-t-zinc-50" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to={'/auth/sign-in'} />;
  }

  return <Outlet />;
}

export default App;