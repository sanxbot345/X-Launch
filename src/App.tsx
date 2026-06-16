import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./components/Dashboard";
import { DeployProject } from "./components/DeployProject";
import { useStore } from "./store";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function App() {
  const { authLoading, activeView, setUser, setAuthLoading } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email: firebaseUser.email })
          });
          if (res.ok) {
             setUser({
               id: firebaseUser.uid as any,
               login: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
               name: firebaseUser.displayName || 'Unknown',
               avatar_url: firebaseUser.photoURL || 'https://github.com/ghost.png'
             });
          }
        } catch (error) {
          console.error(error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setAuthLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <p className="text-white/50 font-medium animate-pulse">Initializing XLaunch Workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white font-sans selection:bg-white/20">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 md:p-8 lg:p-12 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {activeView === 'dashboard' && <Dashboard />}
              {activeView === 'new-project' && <DeployProject />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
