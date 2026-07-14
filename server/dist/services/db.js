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
const User_1 = require("../models/User");
const uuid_1 = require("uuid");
const LOCAL_DB_DIR = path_1.default.join(__dirname, '../../data');
const LOCAL_DB_FILE = path_1.default.join(LOCAL_DB_DIR, 'projects.json');
const LOCAL_USERS_FILE = path_1.default.join(LOCAL_DB_DIR, 'users.json');
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
        if (!fs_1.default.existsSync(LOCAL_USERS_FILE)) {
            fs_1.default.writeFileSync(LOCAL_USERS_FILE, JSON.stringify([], null, 2));
        }
    }
    async connect(uri) {
        if (!uri) {
            console.warn('⚠️ No MONGO_URI provided in environment. Running in LOCAL FALLBACK mode (using JSON file storage).');
            this.isFallback = true;
            return;
        }
        try {
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
    // --- LOCAL HELPERS ---
    readLocalProjects() {
        try {
            return JSON.parse(fs_1.default.readFileSync(LOCAL_DB_FILE, 'utf-8'));
        }
        catch (e) {
            return [];
        }
    }
    writeLocalProjects(projects) {
        try {
            fs_1.default.writeFileSync(LOCAL_DB_FILE, JSON.stringify(projects, null, 2));
        }
        catch (e) {
            console.error('Error writing to local JSON database:', e);
        }
    }
    readLocalUsers() {
        try {
            return JSON.parse(fs_1.default.readFileSync(LOCAL_USERS_FILE, 'utf-8'));
        }
        catch (e) {
            return [];
        }
    }
    writeLocalUsers(users) {
        try {
            fs_1.default.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2));
        }
        catch (e) {
            console.error('Error writing to local JSON users database:', e);
        }
    }
    // --- USER METHODS ---
    async createUser(username, passwordHash) {
        if (!this.isFallback) {
            const newUser = new User_1.User({ username, passwordHash });
            return await newUser.save();
        }
        else {
            const users = this.readLocalUsers();
            if (users.find(u => u.username === username)) {
                throw new Error('Username already exists');
            }
            const newUser = {
                _id: (0, uuid_1.v4)(),
                username,
                passwordHash,
                createdAt: new Date().toISOString(),
            };
            users.push(newUser);
            this.writeLocalUsers(users);
            return newUser;
        }
    }
    async getUserByUsername(username) {
        if (!this.isFallback) {
            return await User_1.User.findOne({ username });
        }
        else {
            const users = this.readLocalUsers();
            return users.find(u => u.username === username) || null;
        }
    }
    async getUserById(id) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(id))
                return null;
            return await User_1.User.findById(id);
        }
        else {
            const users = this.readLocalUsers();
            return users.find(u => u._id === id) || null;
        }
    }
    // --- PROJECT METHODS ---
    async getProjects(userId, username) {
        if (!this.isFallback) {
            return await Project_1.Project.find({
                $or: [{ userId }, { teamMembers: username }]
            }).sort({ createdAt: -1 });
        }
        else {
            const projects = this.readLocalProjects();
            return projects
                .filter(p => p.userId === userId || (p.teamMembers && p.teamMembers.includes(username)))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    }
    async getProjectById(id, userId, username) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(id))
                return null;
            return await Project_1.Project.findOne({
                _id: id,
                $or: [{ userId }, { teamMembers: username }]
            });
        }
        else {
            const projects = this.readLocalProjects();
            return projects.find(p => p._id === id && (p.userId === userId || (p.teamMembers && p.teamMembers.includes(username)))) || null;
        }
    }
    async createProject(name, goal, tasks, userId, teamMembers = []) {
        const formattedTasks = tasks.map(task => ({
            id: task.id || (0, uuid_1.v4)(),
            title: task.title || 'Untitled Task',
            userStory: task.userStory || '',
            description: task.description || '',
            acceptanceCriteria: task.acceptanceCriteria || [],
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            storyPoints: task.storyPoints || 1,
            assignee: task.assignee || undefined,
            createdAt: task.createdAt || new Date(),
        }));
        if (!this.isFallback) {
            const newProject = new Project_1.Project({
                name,
                goal,
                tasks: formattedTasks,
                userId,
                teamMembers,
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
                userId,
                teamMembers,
                createdAt: new Date().toISOString(),
            };
            projects.push(newProject);
            this.writeLocalProjects(projects);
            return newProject;
        }
    }
    async updateTask(projectId, taskId, updates, userId, username) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(projectId))
                return null;
            const project = await Project_1.Project.findOne({
                _id: projectId,
                $or: [{ userId }, { teamMembers: username }]
            });
            if (!project)
                return null;
            const taskIndex = project.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1)
                return null;
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
            if (updates.assignee !== undefined)
                task.assignee = updates.assignee;
            await project.save();
            return project;
        }
        else {
            const projects = this.readLocalProjects();
            const project = projects.find(p => p._id === projectId && (p.userId === userId || (p.teamMembers && p.teamMembers.includes(username))));
            if (!project)
                return null;
            const task = project.tasks.find((t) => t.id === taskId);
            if (!task)
                return null;
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
            if (updates.assignee !== undefined)
                task.assignee = updates.assignee;
            this.writeLocalProjects(projects);
            return project;
        }
    }
    async addTeamMember(projectId, ownerId, newMember) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(projectId))
                return null;
            const project = await Project_1.Project.findOne({ _id: projectId, userId: ownerId });
            if (!project)
                return null;
            if (!project.teamMembers)
                project.teamMembers = [];
            if (!project.teamMembers.includes(newMember)) {
                project.teamMembers.push(newMember);
                await project.save();
            }
            return project;
        }
        else {
            const projects = this.readLocalProjects();
            const project = projects.find(p => p._id === projectId && p.userId === ownerId);
            if (!project)
                return null;
            if (!project.teamMembers)
                project.teamMembers = [];
            if (!project.teamMembers.includes(newMember)) {
                project.teamMembers.push(newMember);
                this.writeLocalProjects(projects);
            }
            return project;
        }
    }
    async removeTeamMember(projectId, ownerId, memberToRemove) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(projectId))
                return null;
            const project = await Project_1.Project.findOne({ _id: projectId, userId: ownerId });
            if (!project)
                return null;
            if (project.teamMembers && project.teamMembers.includes(memberToRemove)) {
                project.teamMembers = project.teamMembers.filter((m) => m !== memberToRemove);
                // Also unassign this member from any tasks
                project.tasks.forEach(task => {
                    if (task.assignee === memberToRemove) {
                        task.assignee = undefined;
                    }
                });
                await project.save();
            }
            return project;
        }
        else {
            const projects = this.readLocalProjects();
            const project = projects.find(p => p._id === projectId && p.userId === ownerId);
            if (!project)
                return null;
            if (project.teamMembers && project.teamMembers.includes(memberToRemove)) {
                project.teamMembers = project.teamMembers.filter((m) => m !== memberToRemove);
                // Also unassign this member from any tasks
                project.tasks.forEach((task) => {
                    if (task.assignee === memberToRemove) {
                        task.assignee = undefined;
                    }
                });
                this.writeLocalProjects(projects);
            }
            return project;
        }
    }
    async deleteProject(id, userId) {
        if (!this.isFallback) {
            if (!mongoose_1.default.Types.ObjectId.isValid(id))
                return false;
            const result = await Project_1.Project.findOneAndDelete({ _id: id, userId });
            return result !== null;
        }
        else {
            const projects = this.readLocalProjects();
            const filtered = projects.filter(p => !(p._id === id && p.userId === userId));
            if (filtered.length === projects.length)
                return false;
            this.writeLocalProjects(filtered);
            return true;
        }
    }
}
exports.dbService = new DatabaseService();
exports.default = exports.dbService;
