import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { users, deployments, environmentVariables } from "./src/db/schema.ts";
import { eq, desc } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/auth/verify", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.body.email || req.user?.email || null;
      const githubToken = req.body.githubToken || null;
      
      if (!uid) {
        res.status(400).json({ error: "Missing uid" });
        return;
      }

      const user = await getOrCreateUser(uid, email, githubToken);
      res.json({ 
        success: true, 
        user: {
           id: user.id,
           uid: user.uid,
           email: user.email,
        } 
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
     res.json({ success: true });
  });

  app.get("/api/github/repos", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const userRec = await db.query.users.findFirst({
        where: eq(users.uid, uid)
      });
      
      const token = userRec?.githubToken;
      if (!token) {
        res.status(400).json({ error: "No GitHub token found for user. Please login again with GitHub." });
        return;
      }

      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
         throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repos = await response.json();
      res.json(repos);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch repositories" });
    }
  });

  app.post("/api/deployments", requireAuth, async (req: AuthRequest, res) => {
     try {
       const uid = req.user?.uid;
       if (!uid) {
         res.status(401).json({ error: "Unauthorized" });
         return;
       }

       const userRec = await db.query.users.findFirst({
         where: eq(users.uid, uid)
       });
       if (!userRec) {
         res.status(404).json({ error: "User not found" });
         return;
       }

       const { repoUrl, branch, name, repoName, buildCommand, startCommand, envVars } = req.body;
       
       if (!repoUrl || !name || typeof name !== 'string') {
         res.status(400).json({ error: "Invalid deployment data provided." });
         return;
       }
       
       let renderId = `srv_mock_${Date.now()}`;
       
       if (process.env.RENDER_API_KEY) {
         const renderResponse = await fetch("https://api.render.com/v1/services", {
           method: "POST",
           headers: {
             Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
             "Content-Type": "application/json",
           },
           body: JSON.stringify({
             type: "web_service",
             name,
             env: "docker",
             repo: repoUrl,
             branch,
             autoDeploy: "yes",
             serviceDetails: {
                envSpecificDetails: { buildCommand, startCommand },
                envVars: envVars.map((e: any) => ({ key: e.key, value: e.value }))
             }
           })
         });
         const data: any = await renderResponse.json();
         if (!renderResponse.ok) {
           res.status(renderResponse.status).json(data);
           return;
         }
         renderId = data.id;
       }
       
       // Save to Postgres
       const newDeployment = await db.insert(deployments).values({
         userId: userRec.id,
         serviceName: name,
         repoName: repoName || repoUrl,
         branch,
         status: "live", // mock status as live immediately or 'building' depending on logic
         buildCommand,
         startCommand
       }).returning();

       if (envVars && envVars.length > 0) {
         await db.insert(environmentVariables).values(envVars.map((e: any) => ({
            deploymentId: newDeployment[0].id,
            key: e.key,
            value: e.value
         })));
       }
       
       res.json(newDeployment[0]);
     } catch (e: any) {
       console.error(e);
       res.status(500).json({ error: "Failed to create deployment" });
     }
  });
  
  app.get("/api/deployments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
         res.status(401).json({ error: "Unauthorized" });
         return;
      }

      const userRec = await db.query.users.findFirst({
        where: eq(users.uid, uid)
      });
      if (!userRec) {
         res.status(404).json({ error: "User not found" });
         return;
      }

      const deps = await db.select().from(deployments).where(eq(deployments.userId, userRec.id)).orderBy(desc(deployments.createdAt));
      res.json(deps);
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch deployments" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
