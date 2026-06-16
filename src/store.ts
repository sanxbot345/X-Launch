import { create } from "zustand";

interface User {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
}

interface Deployment {
  id: number;
  serviceName: string;
  repoName: string;
  status: string;
  createdAt: string;
  url?: string;
}

interface AppState {
  user: User | null;
  authLoading: boolean;
  deployments: Deployment[];
  projectsCount: number;
  activeView: 'dashboard' | 'new-project';
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setDeployments: (deployments: Deployment[]) => void;
  setActiveView: (view: 'dashboard' | 'new-project') => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  authLoading: true,
  deployments: [],
  projectsCount: 0,
  activeView: 'dashboard',
  setUser: (user) => set({ user }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setDeployments: (deployments) => set({ deployments, projectsCount: deployments.length }),
  setActiveView: (view) => set({ activeView: view }),
}));
