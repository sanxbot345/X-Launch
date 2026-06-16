import { useState } from "react";
import { useStore } from "../store";
import { Github, Loader2, Menu, X, LayoutGrid, PlusCircle } from "lucide-react";
import { auth, githubAuthProvider } from "../lib/firebase";
import { signInWithPopup, signOut, GithubAuthProvider } from "firebase/auth";

export function Topbar() {
  const { user, authLoading, activeView, setUser, setActiveView } = useStore();
  const [loggingIn, setLoggingIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = async () => {
    try {
      setLoggingIn(true);
      const result = await signInWithPopup(auth, githubAuthProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;
      const firebaseUser = result.user;
      
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
           email: firebaseUser.email,
           githubToken
        })
      });
      
      if (res.ok) {
         setUser({
           id: firebaseUser.uid as any,
           login: firebaseUser.displayName || 'Unknown',
           name: firebaseUser.displayName || 'Unknown',
           avatar_url: firebaseUser.photoURL || 'https://github.com/ghost.png'
         });
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      await fetch('/api/auth/logout');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-black/50 backdrop-blur-sm z-20 sticky top-0">
        <div className="flex items-center gap-3 text-sm">
          <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white/60 hidden sm:inline">{user ? user.login : 'Personal'}</span>
          <span className="text-white/20 hidden sm:inline">/</span>
          <span className="font-medium text-white">{activeView === 'dashboard' ? 'Overview' : 'Deploy Project'}</span>
        </div>

        <div className="flex items-center gap-4">
          {authLoading || loggingIn ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <input type="text" placeholder="Search..." className="bg-black border border-white/20 rounded-full py-1.5 px-4 text-xs w-48 focus:outline-none focus:border-white transition-all text-white placeholder:text-white/40" />
              </div>
              <button onClick={handleLogout} className="bg-black border border-white/20 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-white/10 transition-colors hidden sm:block">Log out</button>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-md text-xs font-bold hover:bg-white/90 transition-colors">
              <Github className="w-4 h-4" />
              Continue with GitHub
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
             <div className="flex items-center gap-2">
               <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12 2L2 22H22L12 2Z" fill="black"/>
                 </svg>
               </div>
               <span className="font-bold text-white tracking-tight">XLaunch</span>
             </div>
             <button className="text-white/50 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
               <X className="w-6 h-6" />
             </button>
          </div>
          <div className="p-4 flex-1 space-y-2">
             <button 
               onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeView === 'dashboard' ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
             >
               <LayoutGrid className="w-5 h-5" /> Overview
             </button>
             <button 
               onClick={() => { setActiveView('new-project'); setMobileMenuOpen(false); }} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeView === 'new-project' ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
             >
               <PlusCircle className="w-5 h-5" /> Deploy Project
             </button>
          </div>
          {user && (
             <div className="p-4 border-t border-white/10">
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full bg-black border border-white/20 text-white px-4 py-3 rounded-xl text-sm font-bold">Log out</button>
             </div>
          )}
        </div>
      )}
    </>
  );
}
