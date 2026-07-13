import { Router, Request, Response } from 'express';
import dbService from '../services/db';
import geminiService from '../services/gemini';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Protect all project routes
router.use('/projects', verifyToken);

// GET /api/projects - Get all projects for logged-in user
router.get('/projects', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projects = await dbService.getProjects(userId);
    res.json({
      success: true,
      data: projects,
      fallbackMode: dbService.isFallbackMode,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// GET /api/projects/:id - Get project by ID for logged-in user
router.get('/projects/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const project = await dbService.getProjectById(req.params.id, userId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// POST /api/projects - Create a new project (Triggers Gemini AI)
router.post('/projects', async (req: AuthRequest, res: Response) => {
  const { name, goal } = req.body;
  const userId = req.user!.id;

  if (!name || !goal) {
    return res.status(400).json({ success: false, message: 'Project name and goal are required' });
  }

  try {
    console.log(`Generating tasks for project "${name}" with goal: "${goal}" by user: ${userId}`);
    // 1. Generate tasks using Gemini (or Mock fallback)
    const generatedTasks = await geminiService.generateTasksFromGoal(name, goal);

    // 2. Save project to DB (MongoDB or Local JSON fallback)
    const newProject = await dbService.createProject(name, goal, generatedTasks, userId);

    // 3. Broadcast list update to all socket clients (room specific)
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('projectListUpdated');
    }

    res.status(201).json({
      success: true,
      data: newProject,
      isMockAI: geminiService.isMock,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// PUT /api/projects/:id/tasks/:taskId - Update task details or status
router.put('/projects/:id/tasks/:taskId', async (req: AuthRequest, res: Response) => {
  const { id: projectId, taskId } = req.params;
  const updates = req.body;
  const userId = req.user!.id;

  try {
    const updatedProject = await dbService.updateTask(projectId, taskId, updates, userId);
    if (!updatedProject) {
      return res.status(404).json({ success: false, message: 'Project or Task not found' });
    }

    // Broadcast update to all clients listening to this project room
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('taskUpdated', updatedProject);
      io.to(`user:${userId}`).emit('boardUpdated', { projectId, task: updates });
    }

    res.json({ success: true, data: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/projects/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const success = await dbService.deleteProject(req.params.id, userId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('projectListUpdated');
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// POST /api/projects/:id/tasks/:taskId/automate - Generate blueprint code template for a task
router.post('/projects/:id/tasks/:taskId/automate', async (req: AuthRequest, res: Response) => {
  const { id: projectId, taskId } = req.params;
  const userId = req.user!.id;

  try {
    const project = await dbService.getProjectById(projectId, userId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const task = project.tasks.find((t: any) => t.id === taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    console.log(`Generating code template for task: "${task.title}"`);
    const blueprint = await geminiService.generateCodeTemplate(task.title, task.description);

    res.json({
      success: true,
      blueprint,
      isMockAI: geminiService.isMock,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
