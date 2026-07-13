"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Project_1 = require("../models/Project");
const uuid_1 = require("uuid");
const LOCAL_DB_DIR = path_1.default.join(__dirname, '../../data');
const LOCAL_DB_FILE = path_1.default.join(LOCAL_DB_DIR, 'projects.json');
class DatabaseService {
    isFallback = true;
    constructor() {
        // Ensure local DB directory exists for fallback mode
        if (!fs_1.default.existsSync(LOCAL_DB_DIR)) {
            fs_1.default.mkdirSync(LOCAL_DB_DIR, { recursive: true });
        }
        if (!fs_1.default.existsSync(LOCAL_DB_FILE)) {
            fs_1.default.writeFileSync(LOCAL_DB_FILE, JSON.stringify([], null, 2));
        }
    }
    async connect(uri) {
        if (!uri) {
            console.warn('⚠️ No MONGO_URI provided in environment. Running in LOCAL FALLBACK mode (using JSON file storage).');
            this.isFallback = true;
            return;
        }
        try {
            // Connect to MongoDB with a short timeout to fail fast if MongoDB is not running
            await mongoose_1.default.connect(uri, {
                serverSelectionTimeoutMS: 3000,
            });
            this.isFallback = false;
            console.log('🚀 Successfully connected to MongoDB.');
        }
        catch (error) {
            console.error('❌ Failed to connect to MongoDB. Error:', error.message);
            console.warn('⚠️ Falling back to LOCAL JSON storage mode.');
            this.isFallback = true;
        }
    }
    get isFallbackMode() {
        return this.isFallback;
    }
    // Read projects helper for local JSON mode
    readLocalProjects() {
        try {
            const data = fs_1.default.readFileSync(LOCAL_DB_FILE, 'utf-8');
            return JSON.parse(data);
        }
        catch (e) {
            console.error('Error reading local JSON database, resetting file:', e);
            return [];
        }
    }
    // Write projects helper for local JSON mode
    writeLocalProjects(projects) {
        try {
            fs_1.default.writeFileSync(LOCAL_DB_FILE, JSON.stringify(projects, null, 2));
        }
        catch (e) {
            console.error('Error writing to local JSON database:', e);
        }
    }
    async getProjects() {
        if (!this.isFallback) {
            return await Project_1.Project.find().sort({ createdAt: -1 });
        }
        else {
            const projects = this.readLocalProjects();
            return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    }
    async getProjectById(id) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(id))
                return null;
            return await Project_1.Project.findById(id);
        }
        else {
            const projects = this.readLocalProjects();
            return projects.find(p => p._id === id) || null;
        }
    }
    async createProject(name, goal, tasks) {
        const formattedTasks = tasks.map(task => ({
            id: task.id || (0, uuid_1.v4)(),
            title: task.title || 'Untitled Task',
            userStory: task.userStory || '',
            description: task.description || '',
            acceptanceCriteria: task.acceptanceCriteria || [],
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            storyPoints: task.storyPoints || 1,
            createdAt: task.createdAt || new Date(),
        }));
        if (!this.isFallback) {
            const newProject = new Project_1.Project({
                name,
                goal,
                tasks: formattedTasks,
            });
            return await newProject.save();
        }
        else {
            const projects = this.readLocalProjects();
            const newProject = {
                _id: (0, uuid_1.v4)(),
                name,
                goal,
                tasks: formattedTasks,
                createdAt: new Date().toISOString(),
            };
            projects.push(newProject);
            this.writeLocalProjects(projects);
            return newProject;
        }
    }
    async updateTask(projectId, taskId, updates) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(projectId))
                return null;
            const project = await Project_1.Project.findById(projectId);
            if (!project)
                return null;
            const taskIndex = project.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1)
                return null;
            // Update fields
            const task = project.tasks[taskIndex];
            if (updates.status !== undefined)
                task.status = updates.status;
            if (updates.priority !== undefined)
                task.priority = updates.priority;
            if (updates.storyPoints !== undefined)
                task.storyPoints = updates.storyPoints;
            if (updates.title !== undefined)
                task.title = updates.title;
            if (updates.description !== undefined)
                task.description = updates.description;
            if (updates.userStory !== undefined)
                task.userStory = updates.userStory;
            if (updates.acceptanceCriteria !== undefined)
                task.acceptanceCriteria = updates.acceptanceCriteria;
            await project.save();
            return project;
        }
        else {
            const projects = this.readLocalProjects();
            const project = projects.find(p => p._id === projectId);
            if (!project)
                return null;
            const task = project.tasks.find((t) => t.id === taskId);
            if (!task)
                return null;
            // Update fields
            if (updates.status !== undefined)
                task.status = updates.status;
            if (updates.priority !== undefined)
                task.priority = updates.priority;
            if (updates.storyPoints !== undefined)
                task.storyPoints = updates.storyPoints;
            if (updates.title !== undefined)
                task.title = updates.title;
            if (updates.description !== undefined)
                task.description = updates.description;
            if (updates.userStory !== undefined)
                task.userStory = updates.userStory;
            if (updates.acceptanceCriteria !== undefined)
                task.acceptanceCriteria = updates.acceptanceCriteria;
            this.writeLocalProjects(projects);
            return project;
        }
    }
    async deleteProject(id) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(id))
                return false;
            const result = await Project_1.Project.findByIdAndDelete(id);
            return result !== null;
        }
        else {
            const projects = this.readLocalProjects();
            const filtered = projects.filter(p => p._id !== id);
            if (filtered.length === projects.length)
                return false;
            this.writeLocalProjects(filtered);
            return true;
        }
    }
}
exports.dbService = new DatabaseService();
exports.default = exports.dbService;
