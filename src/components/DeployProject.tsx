import { useEffect, useState, useRef } from "react";
import { useStore } from "../store";
import { Github, Loader2, Zap, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "../../components/ui/scroll-area";
import { auth } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

export function DeployProject() {
  const { user, setDeployments, setActiveView } = useStore();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [deploying, setDeploying] = useState(false);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    branch: "",
    buildCommand: "",
    startCommand: "",
  });

  const [envVars, setEnvVars] = useState([{ key: "", value: "" }]);

  useEffect(() => {
    if (!user) return;
    const fetchRepos = async () => {
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
           setLoading(false);
       }
    };
    fetchRepos();
  }, [user]);

  const handleSelectRepo = (repo: any) => {
    setSelectedRepo(repo);
    setRepoDropdownOpen(false);
    
    // Auto-detect framework / commands
    let buildCmd = "npm run build";
    let startCmd = "npm start";
    
    // Naive heuristic
    if (repo.language === "Python") {
      buildCmd = "pip install -r requirements.txt";
      startCmd = "python app.py";
    } else if (repo.language === "Go") {
      buildCmd = "go build -o main .";
      startCmd = "./main";
    }

    setForm({
      name: repo.name,
      branch: repo.default_branch,
      buildCommand: buildCmd,
      startCommand: startCmd,
    });
  };

  const addEnvVar = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const removeEnvVar = (index: number) => setEnvVars(envVars.filter((_, i) => i !== index));
  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const newVars = [...envVars];
    newVars[index][field] = val;
    setEnvVars(newVars);
  };

  const handleDeploy = async () => {
    if (!selectedRepo) {
      toast.error("Please select a repository first.");
      return;
    }
    
    setDeploying(true);
    toast.info("Starting deployment...");

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          repoUrl: selectedRepo.html_url || `https://github.com/${selectedRepo.full_name}`,
          repoName: selectedRepo.full_name,
          ...form,
          envVars: envVars.filter(e => e.key.trim() !== "")
        })
      });

      if (!res.ok) throw new Error("Deploy failed");
      toast.success("Deployment created successfully!");
      
      const depsRes = await fetch("/api/deployments", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (depsRes.ok) {
        setDeployments(await depsRes.json());
      }
      
      setTimeout(() => setActiveView('dashboard'), 1500);
    } catch (e) {
      toast.error("Deployment failed. Check API keys.");
    } finally {
      setDeploying(false);
    }
  };

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
         <h2 className="text-xl text-white">Sign in to deploy projects</h2>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto text-white pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">Configure Project</h1>
        <p className="text-white/50">Select a repository and configure deployment settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-1 md:col-span-8 space-y-6">
          <div className="bg-black border border-white/10 rounded-2xl p-6 relative">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-white/50" />
              Deployment Settings
            </h2>
            
            <div className="space-y-6">
              
              {/* Repository Dropdown */}
              <div className="relative z-10">
                 <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-2">Git Repository</label>
                 <button 
                   onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
                   className="w-full bg-black border border-white/20 hover:border-white/40 rounded-lg p-3 text-sm flex items-center justify-between transition-colors focus:outline-none"
                 >
                   <div className="flex items-center gap-2">
                     <Github className="w-4 h-4 text-white" />
                     <span className={selectedRepo ? "text-white" : "text-white/50"}>
                       {selectedRepo ? selectedRepo.full_name : "Select a repository..."}
                     </span>
                   </div>
                   <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${repoDropdownOpen ? "rotate-180" : ""}`} />
                 </button>
                 
                 <AnimatePresence>
                   {repoDropdownOpen && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       transition={{ duration: 0.2 }}
                       className="absolute top-full left-0 w-full mt-2 bg-black border border-white/20 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col max-h-[300px]"
                     >
                       {loading ? (
                          <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
                       ) : repos.length === 0 ? (
                          <div className="p-4 text-center text-white/50 text-sm">No repositories found.</div>
                       ) : (
                          <ScrollArea className="flex-1 h-[250px] overflow-y-auto w-full">
                            {repos.map(repo => (
                              <button 
                                key={repo.id}
                                onClick={() => handleSelectRepo(repo)}
                                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center justify-between border-b border-white/5 last:border-b-0"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded bg-white flex items-center justify-center shrink-0">
                                     <Github className="w-3 h-3 text-black" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm text-white font-medium">{repo.full_name}</span>
                                    <span className="text-[10px] text-white/40">{repo.language || 'Unknown'} &bull; Updated recently</span>
                                  </div>
                                </div>
                                {selectedRepo?.id === repo.id && <Check className="w-4 h-4 text-white" />}
                              </button>
                            ))}
                          </ScrollArea>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>

              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-2">Project Name</label>
                  <input disabled={!selectedRepo} type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm focus:border-white focus:ring-0 outline-none transition-colors disabled:opacity-50" />
                </div>
                <div className="sm:w-40">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-2">Framework</label>
                  <div className={`w-full bg-black border border-white/10 rounded-lg p-3 text-sm flex items-center justify-between ${!selectedRepo ? 'opacity-50' : ''}`}>
                    <span>{selectedRepo?.language || 'Other'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-2">Build Command</label>
                  <input disabled={!selectedRepo} type="text" value={form.buildCommand} onChange={e => setForm({...form, buildCommand: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm text-white/80 font-mono focus:border-white outline-none transition-colors disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-2">Start Command</label>
                  <input disabled={!selectedRepo} type="text" value={form.startCommand} onChange={e => setForm({...form, startCommand: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm text-white/80 font-mono focus:border-white outline-none transition-colors disabled:opacity-50" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-2">Environment Variables</label>
                <div className={`space-y-2 ${!selectedRepo ? 'opacity-50 pointer-events-none' : ''}`}>
                  {envVars.map((env, i) => (
                    <div key={i} className="flex gap-2">
                       <input type="text" placeholder="KEY" value={env.key} onChange={e => updateEnvVar(i, 'key', e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg p-2 text-xs font-mono focus:border-white outline-none" />
                       <input type="text" placeholder="VALUE" value={env.value} onChange={e => updateEnvVar(i, 'value', e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg p-2 text-xs focus:border-white outline-none" />
                       <button onClick={() => removeEnvVar(i)} className="px-3 py-2 border border-white/10 rounded-lg text-white/50 hover:text-white transition-colors">×</button>
                    </div>
                  ))}
                  <button onClick={addEnvVar} className="text-[10px] font-bold text-white hover:text-white/80 transition-colors">+ Add Variable</button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
              <button onClick={() => setActiveView('dashboard')} className="px-6 py-2 rounded-lg text-sm font-medium border border-white/10 text-white/80 hover:bg-white/10 transition-colors">Cancel</button>
              <button disabled={!selectedRepo || deploying} onClick={handleDeploy} className="px-6 py-2 rounded-lg text-sm font-bold bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:hover:bg-white transition-all flex items-center gap-2">
                 {deploying && <Loader2 className="w-4 h-4 animate-spin" />}
                 Deploy Now
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-span-1 md:col-span-4 space-y-6">
          <AnimatePresence mode="wait">
            {deploying && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-black border border-white/10 rounded-2xl p-6 flex flex-col h-[280px]"
                >
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Build Logs</h3>
                     <span className="flex items-center gap-2 px-2 py-1 bg-transparent text-green-500 text-[10px] font-bold rounded border border-green-500/30">
                       <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                       BUILDING
                     </span>
                   </div>
                   <div className="flex-1 bg-black border border-white/5 rounded-lg p-4 font-mono text-[11px] text-white/60 overflow-hidden relative">
                     <div className="mb-1">[{new Date().toLocaleTimeString()}] Starting build...</div>
                     <div className="mb-1 text-white">Loading container image for architecture</div>
                     <div className="mb-1">Cloning repository {form.name || 'project'}...</div>
                     <div className="mt-2 opacity-50 animate-pulse">_</div>
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                   </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
