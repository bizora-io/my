import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "./middleware/auth.js";

const router = express.Router();

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

function projectsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("projects");
}

function tasksCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("projectTasks");
}

// GET /api/projects
router.get("/", requirePermission("reports.view", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { status } = req.query;

    let query: FirebaseFirestore.Query = projectsCol(businessId);
    if (status && typeof status === "string") query = query.where("status", "==", status);

    const [projectsSnap, tasksSnap] = await Promise.all([
      query.get(),
      tasksCol(businessId).get(),
    ]);

    const taskCounts: Record<string, { total: number; done: number }> = {};
    tasksSnap.docs.forEach((d) => {
      const t = d.data();
      const pId = t.projectId;
      if (pId) {
        if (!taskCounts[pId]) taskCounts[pId] = { total: 0, done: 0 };
        taskCounts[pId].total += 1;
        if (t.status === "DONE") taskCounts[pId].done += 1;
      }
    });

    const projects = projectsSnap.docs.map((d) => {
      const data = d.data();
      const counts = taskCounts[d.id] || { total: 0, done: 0 };
      const calculatedProgress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : (data.progress || 0);

      return {
        id: d.id,
        ...data,
        taskCount: counts.total,
        completedTaskCount: counts.done,
        progress: calculatedProgress,
      };
    });

    projects.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json(projects);
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/projects/tasks/overdue
router.get("/tasks/overdue", requirePermission("reports.view", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const snap = await tasksCol(businessId).where("status", "!=", "DONE").get();

    const now = new Date().toISOString().slice(0, 10);
    const overdue = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .filter((t) => t.dueDate && t.dueDate < now);

    res.json(overdue);
  } catch (error) {
    console.error("List overdue tasks error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/projects/tasks
router.get("/tasks", requirePermission("reports.view", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { projectId, status, assigneeId } = req.query;

    let query: FirebaseFirestore.Query = tasksCol(businessId);
    if (projectId && typeof projectId === "string") query = query.where("projectId", "==", projectId);
    if (status && typeof status === "string") query = query.where("status", "==", status);
    if (assigneeId && typeof assigneeId === "string") query = query.where("assigneeId", "==", assigneeId);

    const snap = await query.get();
    const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tasks.sort((a: any, b: any) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

    res.json(tasks);
  } catch (error) {
    console.error("List project tasks error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/projects/tasks
router.post("/tasks", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { projectId, title, description, assigneeId, assigneeName, priority = "MEDIUM", dueDate } = req.body || {};

    if (!title || !projectId) {
      return res.status(400).json({ error: "projectId and title are required" });
    }

    const pDoc = await projectsCol(businessId).doc(projectId).get();
    const projectName = pDoc.exists ? pDoc.data()?.name || "Project" : "Project";

    const docRef = tasksCol(businessId).doc();
    const payload = stripUndefined({
      projectId,
      projectName,
      title: String(title).trim(),
      description: description?.trim() || "",
      assigneeId: assigneeId || null,
      assigneeName: assigneeName?.trim() || "Unassigned",
      priority: priority.toUpperCase(),
      status: "TODO",
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/projects/tasks/:id
router.patch("/tasks/:id", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = tasksCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Task not found" });

    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    const fields = ["title", "description", "assigneeId", "assigneeName", "priority", "status", "dueDate"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    if (req.body.status === "DONE" && doc.data()?.status !== "DONE") {
      update.completedAt = new Date().toISOString();
    }

    await docRef.set(stripUndefined(update), { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/projects/tasks/:id/complete
router.post("/tasks/:id/complete", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = tasksCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Task not found" });

    const update = {
      status: "DONE",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(update, { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Complete task error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/projects/:id
router.get("/:id", requirePermission("reports.view", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const projectId = String(req.params.id);
    const doc = await projectsCol(businessId).doc(projectId).get();
    if (!doc.exists) return res.status(404).json({ error: "Project not found" });

    const tasksSnap = await tasksCol(businessId).where("projectId", "==", projectId).get();
    const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const total = tasks.length;
    const done = tasks.filter((t: any) => t.status === "DONE").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : (doc.data()?.progress || 0);

    res.json({ id: doc.id, ...doc.data(), tasks, progress, taskCount: total, completedTaskCount: done });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/projects
router.post("/", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { name, code, clientName, clientId, budget = 0, startDate, deadline, notes } = req.body || {};

    if (!name) return res.status(400).json({ error: "Project name is required" });

    const docRef = projectsCol(businessId).doc();
    const payload = stripUndefined({
      name: String(name).trim(),
      code: code?.trim() || `PRJ-${Date.now().toString().slice(-4)}`,
      clientName: clientName?.trim() || "",
      clientId: clientId || null,
      budget: Number(budget) || 0,
      spent: 0,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      deadline: deadline || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      progress: 0,
      status: "IN_PROGRESS",
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/projects/:id
router.patch("/:id", requirePermission("admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = projectsCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Project not found" });

    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    const fields = ["name", "code", "clientName", "clientId", "budget", "spent", "startDate", "deadline", "status", "progress", "notes"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    await docRef.set(stripUndefined(update), { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
