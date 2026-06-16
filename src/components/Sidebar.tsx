import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, PlusCircle, Github, ChevronDown, Check, Loader2 } from "lucide-react";
import { useStore } from "../store";
import { auth } from "../lib/firebase";

export function Sidebar() {
  const { user, activeView, setActiveView } = useStore();
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    if (!user || !repoDropdownOpen || repos.length > 0) return;
    const fetchRepos = async () => {
       setLoadingRepos(true);
       try {
           const token = await auth.currentUser?.getIdToken();
           const r = await fetch("/api/github/repos", {
              headers: { "Authorization": `Bearer ${token}` }
           });
           const data = await r.json();
           if (Array.isArray(data)) setRepos(data);
       } catch (e) {
           console.error(e);
       } finally {
           setLoadingRepos(false);
       }
    };
    fetchRepos();
  }, [user, repoDropdownOpen]);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
    { id: 'new-project', label: 'Deploy Project', icon: PlusCircle },
  ];

  return (
    <motion.aside 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: "circOut" }}
      className="w-64 border-r border-white/10 flex flex-col h-full bg-black hidden md:flex shrink-0 h-screen sticky top-0 left-0"
    >
      <div className="p-6 pb-2">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22H22L12 2Z" fill="black"/>
            </svg>
          </div>
          <span className="font-sans font-bold text-xl tracking-tight text-white">XLaunch</span>
        </div>

        {user && (
          <div className="relative mb-6 z-50">
            <button 
              onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Github className="w-4 h-4 text-white/70 shrink-0" />
                <span className="text-sm font-medium text-white truncate">Select Repository</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${repoDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {repoDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 w-full mt-2 bg-black border border-white/20 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col max-h-[300px]"
                >
                  {loadingRepos ? (
                    <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-white/50" /></div>
                  ) : repos.length === 0 ? (
                    <div className="p-4 text-center text-xs text-white/50">No repositories found.</div>
                  ) : (
                    <div className="overflow-y-auto max-h-[250px] w-full">
                      {repos.map(repo => (
                        <button 
                          key={repo.id}
                          onClick={() => {
                            setRepoDropdownOpen(false);
                            setActiveView('new-project' as any);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors flex items-center gap-2 border-b border-white/5 last:border-b-0"
                        >
                          <Github className="w-3 h-3 text-white/50 shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs text-white truncate font-medium">{repo.full_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-medium border ${
                  isActive 
                    ? "bg-white text-black border-white" 
                    : "bg-transparent border-transparent text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </motion.button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 bg-black rounded-lg border border-white/20">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-white/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shrink-0">
               <span className="text-xs font-bold">?</span>
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.login || 'Guest User'}</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
