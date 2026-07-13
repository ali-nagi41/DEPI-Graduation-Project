import { Schema, model, Document } from 'mongoose';

export interface ITask {
  id: string;
  title: string;
  userStory: string;
  description: string;
  acceptanceCriteria: string[];
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  storyPoints: number;
  assignee?: string;
  createdAt: Date;
}

export interface IProject extends Document {
  name: string;
  goal: string;
  tasks: ITask[];
  userId: string; // To link project to user
  teamMembers?: string[];
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  userStory: { type: String, required: true },
  description: { type: String, required: true },
  acceptanceCriteria: [{ type: String }],
  status: { 
    type: String, 
    enum: ['todo', 'in_progress', 'review', 'done'], 
    default: 'todo' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  storyPoints: { type: Number, default: 1 },
  assignee: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  goal: { type: String, required: true },
  tasks: [TaskSchema],
  userId: { type: String, required: true },
  teamMembers: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export const Project = model<IProject>('Project', ProjectSchema);
