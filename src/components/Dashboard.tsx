import { useEffect, useState } from "react";
import { useStore } from "../store";
import { Activity, GitBranch, Github, Loader2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "../lib/firebase";
import { motion } from "motion/react";

export function Dashboard() {
  const { user, deployments, setDeployments, setActiveView } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDeployments = async () => {
       try {
          const token = await auth.currentUser?.getIdToken();
          const r = await fetch("/api/deployments", {
             headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await r.json();
          if (Array.isArray(data)) {
            setDeployments(data);
          }
       } catch (e) {
          console.error(e);
       } finally {
          setLoading(false);
       }
    };
    fetchDeployments();
  }, [user]);

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4"
      >
        <Github className="w-12 h-12 text-white/50" />
        <h2 className="text-2xl font-semibold tracking-tight text-white">Welcome to XLaunch</h2>
        <p className="text-white/60 max-w-md">
          Sign in with GitHub to deploy and manage your web applications directly from your repositories.
        </p>
      </motion.div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-10 max-w-2xl">
        <div className="bg-black border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2 font-medium">Total Projects</p>
          <p className="text-4xl font-bold text-white">{deployments.length}</p>
        </div>
        <div className="bg-black border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2 font-medium">Active Deployments</p>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold text-white">{deployments.filter(d => d.status === 'live').length}</p>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-semibold tracking-tight text-white">Recent Deployments</h2>
           <button onClick={() => setActiveView('new-project')} className="bg-white text-black px-5 py-2 rounded-lg text-xs font-bold hover:bg-white/90 transition-colors flex items-center gap-2">
             New Project <ArrowRight className="w-4 h-4" />
           </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : deployments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 border border-white/10 rounded-2xl bg-black">
            <div className="text-center space-y-3">
              <h3 className="font-medium text-white text-lg">No deployments found</h3>
              <p className="text-sm text-white/50">You haven't deployed any projects yet. Time to launch.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deployments.map(dep => (
              <motion.div 
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                key={dep.id} 
                className="bg-black border border-white/10 p-6 rounded-2xl hover:border-white/30 transition-colors cursor-pointer flex flex-col group"
              >
                <div className="flex items-start justify-between mb-6">
                  <h3 className="font-semibold text-white tracking-tight text-lg group-hover:text-blue-400 transition-colors">{dep.serviceName}</h3>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${dep.status === 'live' ? 'bg-transparent text-green-500 border-green-500/30' : 'bg-transparent text-white/50 border-white/20'}`}>
                    {dep.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <Github className="w-4 h-4 text-white/50" />
                  <span className="text-xs text-white/60 font-mono truncate">{dep.repoName}</span>
                </div>
                <p className="text-[11px] text-white/40 mt-auto pt-4 border-t border-white/10">
                  Deployed {dep.createdAt ? formatDistanceToNow(new Date(dep.createdAt), { addSuffix: true }) : 'Recently'}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
