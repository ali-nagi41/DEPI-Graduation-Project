"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../services/db"));
const gemini_1 = __importDefault(require("../services/gemini"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect all project routes
router.use('/projects', auth_1.verifyToken);
// GET /api/projects - Get all projects for logged-in user
router.get('/projects', async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        const projects = await db_1.default.getProjects(userId, username);
        res.json({
            success: true,
            data: projects,
            fallbackMode: db_1.default.isFallbackMode,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/projects/:id - Get project by ID for logged-in user
router.get('/projects/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        const project = await db_1.default.getProjectById(req.params.id, userId, username);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, data: project });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// POST /api/projects - Create a new project (Triggers Gemini AI)
router.post('/projects', async (req, res) => {
    const { name, goal, teamMembers } = req.body;
    const userId = req.user.id;
    if (!name || !goal) {
        return res.status(400).json({ success: false, message: 'Project name and goal are required' });
    }
    // Parse teamMembers if it comes as a comma-separated string
    let parsedTeamMembers = [];
    if (teamMembers) {
        parsedTeamMembers = teamMembers.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    try {
        console.log(`Generating tasks for project "${name}" with goal: "${goal}" by user: ${userId}`);
        // 1. Generate tasks using Gemini (or Mock fallback)
        const generatedTasks = await gemini_1.default.generateTasksFromGoal(name, goal, parsedTeamMembers);
        // 2. Save project to DB (MongoDB or Local JSON fallback)
        const newProject = await db_1.default.createProject(name, goal, generatedTasks, userId, parsedTeamMembers);
        // 3. Broadcast list update to all socket clients (room specific)
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${userId}`).emit('projectListUpdated');
        }
        res.status(201).json({
            success: true,
            data: newProject,
            isMockAI: gemini_1.default.isMock,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// PUT /api/projects/:id/tasks/:taskId - Update task details or status
router.put('/projects/:id/tasks/:taskId', async (req, res) => {
    const { id: projectId, taskId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    try {
        const updatedProject = await db_1.default.updateTask(projectId, taskId, updates, userId, username);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// PUT /api/projects/:id/members - Add a team member
router.put('/projects/:id/members', async (req, res) => {
    const { id: projectId } = req.params;
    const { username: newMember } = req.body;
    const userId = req.user.id;
    if (!newMember) {
        return res.status(400).json({ success: false, message: 'Username is required' });
    }
    try {
        const updatedProject = await db_1.default.addTeamMember(projectId, userId, newMember);
        if (!updatedProject) {
            return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
        }
        const io = req.app.get('io');
        if (io) {
            io.to(`project:${projectId}`).emit('projectUpdated', updatedProject);
        }
        res.json({ success: true, data: updatedProject });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// DELETE /api/projects/:id/members/:username - Remove a team member
router.delete('/projects/:id/members/:username', async (req, res) => {
    const { id: projectId, username: memberToRemove } = req.params;
    const userId = req.user.id;
    try {
        const updatedProject = await db_1.default.removeTeamMember(projectId, userId, memberToRemove);
        if (!updatedProject) {
            return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
        }
        const io = req.app.get('io');
        if (io) {
            io.to(`project:${projectId}`).emit('projectUpdated', updatedProject);
            // Also trigger a refresh for all users to update their dashboards
            io.emit('projectListUpdated');
        }
        res.json({ success: true, data: updatedProject });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// DELETE /api/projects/:id - Delete a project
router.delete('/projects/:id', async (req, res) => {
    const userId = req.user.id;
    try {
        const success = await db_1.default.deleteProject(req.params.id, userId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${userId}`).emit('projectListUpdated');
        }
        res.json({ success: true, message: 'Project deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// POST /api/projects/:id/tasks/:taskId/automate - Generate blueprint code template for a task
router.post('/projects/:id/tasks/:taskId/automate', async (req, res) => {
    const { id: projectId, taskId } = req.params;
    const userId = req.user.id;
    const username = req.user.username;
    try {
        const project = await db_1.default.getProjectById(projectId, userId, username);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const task = project.tasks.find((t) => t.id === taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        console.log(`Generating code template for task: "${task.title}"`);
        const blueprint = await gemini_1.default.generateCodeTemplate(task.title, task.description);
        res.json({
            success: true,
            blueprint,
            isMockAI: gemini_1.default.isMock,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
