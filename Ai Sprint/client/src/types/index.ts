export interface ITask {
  id: string;
  title: string;
  userStory: string;
  description: string;
  acceptanceCriteria: string[];
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  storyPoints: number;
  createdAt: string;
}

export interface IProject {
  _id: string;
  name: string;
  goal: string;
  tasks: ITask[];
  createdAt: string;
}

export interface ProjectsState {
  projects: IProject[];
  selectedProject: IProject | null;
  loading: boolean;
  error: string | null;
  fallbackMode: boolean;
  isMockAI: boolean;
}
