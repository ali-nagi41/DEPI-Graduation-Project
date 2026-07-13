import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Project, IProject, ITask } from '../models/Project';
import { User, IUser } from '../models/User';
import { v4 as uuidv4 } from 'uuid';

const LOCAL_DB_DIR = path.join(__dirname, '../../data');
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, 'projects.json');
const LOCAL_USERS_FILE = path.join(LOCAL_DB_DIR, 'users.json');

class DatabaseService {
  private isFallback = true;

  constructor() {
    // Ensure local DB directory exists for fallback mode
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(LOCAL_USERS_FILE)) {
      fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify([], null, 2));
    }
  }

  async connect(uri?: string) {
    if (!uri) {
      console.warn('⚠️ No MONGO_URI provided in environment. Running in LOCAL FALLBACK mode (using JSON file storage).');
      this.isFallback = true;
      return;
    }

    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      this.isFallback = false;
      console.log('🚀 Successfully connected to MongoDB.');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB. Error:', (error as Error).message);
      console.warn('⚠️ Falling back to LOCAL JSON storage mode.');
      this.isFallback = true;
    }
  }

  get isFallbackMode(): boolean {
    return this.isFallback;
  }

  // --- LOCAL HELPERS ---
  private readLocalProjects(): any[] {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private writeLocalProjects(projects: any[]) {
    try {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(projects, null, 2));
    } catch (e) {
      console.error('Error writing to local JSON database:', e);
    }
  }

  private readLocalUsers(): any[] {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private writeLocalUsers(users: any[]) {
    try {
      fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
      console.error('Error writing to local JSON users database:', e);
    }
  }

  // --- USER METHODS ---
  async createUser(username: string, passwordHash: string): Promise<any> {
    if (!this.isFallback) {
      const newUser = new User({ username, passwordHash });
      return await newUser.save();
    } else {
      const users = this.readLocalUsers();
      if (users.find(u => u.username === username)) {
        throw new Error('Username already exists');
      }
      const newUser = {
        _id: uuidv4(),
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      this.writeLocalUsers(users);
      return newUser;
    }
  }

  async getUserByUsername(username: string): Promise<any | null> {
    if (!this.isFallback) {
      return await User.findOne({ username });
    } else {
      const users = this.readLocalUsers();
      return users.find(u => u.username === username) || null;
    }
  }

  async getUserById(id: string): Promise<any | null> {
    if (!this.isFallback) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      return await User.findById(id);
    } else {
      const users = this.readLocalUsers();
      return users.find(u => u._id === id) || null;
    }
  }

  // --- PROJECT METHODS ---
  async getProjects(userId: string, username: string): Promise<any[]> {
    if (!this.isFallback) {
      return await Project.find({
        $or: [{ userId }, { teamMembers: username }]
      }).sort({ createdAt: -1 });
    } else {
      const projects = this.readLocalProjects();
      return projects
        .filter(p => p.userId === userId || (p.teamMembers && p.teamMembers.includes(username)))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  async getProjectById(id: string, userId: string, username: string): Promise<any | null> {
    if (!this.isFallback) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      return await Project.findOne({
        _id: id,
        $or: [{ userId }, { teamMembers: username }]
      });
    } else {
      const projects = this.readLocalProjects();
      return projects.find(p => p._id === id && (p.userId === userId || (p.teamMembers && p.teamMembers.includes(username)))) || null;
    }
  }

  async createProject(name: string, goal: string, tasks: Partial<ITask>[], userId: string, teamMembers: string[] = []): Promise<any> {
    const formattedTasks: ITask[] = tasks.map(task => ({
      id: task.id || uuidv4(),
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
      const newProject = new Project({
        name,
        goal,
        tasks: formattedTasks,
        userId,
        teamMembers,
      });
      return await newProject.save();
    } else {
      const projects = this.readLocalProjects();
      const newProject = {
        _id: uuidv4(),
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

  async updateTask(projectId: string, taskId: string, updates: Partial<ITask>, userId: string, username: string): Promise<any | null> {
    if (!this.isFallback) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ userId }, { teamMembers: username }]
      });
      if (!project) return null;

      const taskIndex = project.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return null;

      const task = project.tasks[taskIndex];
      if (updates.status !== undefined) task.status = updates.status;
      if (updates.priority !== undefined) task.priority = updates.priority;
      if (updates.storyPoints !== undefined) task.storyPoints = updates.storyPoints;
      if (updates.title !== undefined) task.title = updates.title;
      if (updates.description !== undefined) task.description = updates.description;
      if (updates.userStory !== undefined) task.userStory = updates.userStory;
      if (updates.acceptanceCriteria !== undefined) task.acceptanceCriteria = updates.acceptanceCriteria;

      if (updates.assignee !== undefined) task.assignee = updates.assignee;

      await project.save();
      return project;
    } else {
      const projects = this.readLocalProjects();
      const project = projects.find(p => p._id === projectId && (p.userId === userId || (p.teamMembers && p.teamMembers.includes(username))));
      if (!project) return null;

      const task = project.tasks.find((t: any) => t.id === taskId);
      if (!task) return null;

      if (updates.status !== undefined) task.status = updates.status;
      if (updates.priority !== undefined) task.priority = updates.priority;
      if (updates.storyPoints !== undefined) task.storyPoints = updates.storyPoints;
      if (updates.title !== undefined) task.title = updates.title;
      if (updates.description !== undefined) task.description = updates.description;
      if (updates.userStory !== undefined) task.userStory = updates.userStory;
      if (updates.acceptanceCriteria !== undefined) task.acceptanceCriteria = updates.acceptanceCriteria;
      if (updates.assignee !== undefined) task.assignee = updates.assignee;

      this.writeLocalProjects(projects);
      return project;
    }
  }

  async addTeamMember(projectId: string, ownerId: string, newMember: string): Promise<any | null> {
    if (!this.isFallback) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
      const project = await Project.findOne({ _id: projectId, userId: ownerId });
      if (!project) return null;

      if (!project.teamMembers) project.teamMembers = [];
      if (!project.teamMembers.includes(newMember)) {
        project.teamMembers.push(newMember);
        await project.save();
      }
      return project;
    } else {
      const projects = this.readLocalProjects();
      const project = projects.find(p => p._id === projectId && p.userId === ownerId);
      if (!project) return null;

      if (!project.teamMembers) project.teamMembers = [];
      if (!project.teamMembers.includes(newMember)) {
        project.teamMembers.push(newMember);
        this.writeLocalProjects(projects);
      }
      return project;
    }
  }

  async removeTeamMember(projectId: string, ownerId: string, memberToRemove: string): Promise<any | null> {
    if (!this.isFallback) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
      const project = await Project.findOne({ _id: projectId, userId: ownerId });
      if (!project) return null;

      if (project.teamMembers && project.teamMembers.includes(memberToRemove)) {
        project.teamMembers = project.teamMembers.filter((m: string) => m !== memberToRemove);
        
        // Also unassign this member from any tasks
        project.tasks.forEach(task => {
          if (task.assignee === memberToRemove) {
            task.assignee = undefined;
          }
        });

        await project.save();
      }
      return project;
    } else {
      const projects = this.readLocalProjects();
      const project = projects.find(p => p._id === projectId && p.userId === ownerId);
      if (!project) return null;

      if (project.teamMembers && project.teamMembers.includes(memberToRemove)) {
        project.teamMembers = project.teamMembers.filter((m: string) => m !== memberToRemove);

        // Also unassign this member from any tasks
        project.tasks.forEach((task: any) => {
          if (task.assignee === memberToRemove) {
            task.assignee = undefined;
          }
        });

        this.writeLocalProjects(projects);
      }
      return project;
    }
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    if (!this.isFallback) {
      if (!mongoose.Types.ObjectId.isValid(id)) return false;
      const result = await Project.findOneAndDelete({ _id: id, userId });
      return result !== null;
    } else {
      const projects = this.readLocalProjects();
      const filtered = projects.filter(p => !(p._id === id && p.userId === userId));
      if (filtered.length === projects.length) return false;
      this.writeLocalProjects(filtered);
      return true;
    }
  }
}

export const dbService = new DatabaseService();
export default dbService;
