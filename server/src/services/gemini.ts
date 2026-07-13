import { GoogleGenerativeAI } from '@google/generative-ai';
import { ITask } from '../models/Project';
import { v4 as uuidv4 } from 'uuid';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private isMockMode = true;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.isMockMode = false;
        console.log('💡 Gemini AI service initialized successfully.');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini AI. Switching to Mock AI Mode.', error);
        this.isMockMode = true;
      }
    } else {
      console.warn('⚠️ No GEMINI_API_KEY found in environment. Running in MOCK AI Mode.');
      this.isMockMode = true;
    }
  }

  get isMock(): boolean {
    return this.isMockMode;
  }

  async generateTasksFromGoal(projectName: string, goal: string, teamMembers?: string[]): Promise<Partial<ITask>[]> {
    if (this.isMockMode || !this.genAI) {
      console.log('Running mock task generation for goal:', goal);
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return this.getMockTasks(projectName, goal, teamMembers);
    }

    let teamPrompt = '';
    if (teamMembers && teamMembers.length > 0) {
      teamPrompt = `Note: The team consists of [${teamMembers.join(', ')}]. DO NOT assign the tasks. Keep the 'assignee' field empty.`;
    }

    const prompt = `
You are an expert Agile Product Owner and Technical Lead.
Your task is to take a Project Name: "${projectName}" and a High-Level Project Goal: "${goal}", and decompose it into 4-6 specific, actionable, and technical Agile Tasks.
${teamPrompt}

Each task must conform to the following JSON structure:
{
  "title": "Clear, concise technical task title",
  "userStory": "As a [User/Developer], I want [Feature] so that [Benefit]",
  "description": "A detailed technical description of what needs to be implemented. List architectural choices, tech stack implications, or database schemas if relevant.",
  "acceptanceCriteria": [
    "Given [Context], when [Action], then [Expected Result]",
    "Another explicit condition that verifies completion"
  ],
  "priority": "low" | "medium" | "high",
  "storyPoints": 1 | 2 | 3 | 5 | 8,
  "assignee": ""
}

Provide the output as a valid JSON array of these task objects. Do not wrap it in any markdown formatting, only output the raw JSON array.
`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();
      const parsedTasks = JSON.parse(responseText);
      
      if (Array.isArray(parsedTasks)) {
        return parsedTasks.map(t => ({
          id: uuidv4(),
          title: t.title || 'Untitled Task',
          userStory: t.userStory || '',
          description: t.description || '',
          acceptanceCriteria: Array.isArray(t.acceptanceCriteria) ? t.acceptanceCriteria : [],
          status: 'todo',
          priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
          storyPoints: [1, 2, 3, 5, 8].includes(Number(t.storyPoints)) ? Number(t.storyPoints) : 3,
          createdAt: new Date(),
        }));
      }
      throw new Error('Response is not a JSON array');
    } catch (error) {
      console.error('Gemini generateTasksFromGoal failed, using mock fallback:', error);
      return this.getMockTasks(projectName, goal);
    }
  }

  async generateCodeTemplate(taskTitle: string, description: string): Promise<string> {
    if (this.isMockMode || !this.genAI) {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getMockCodeTemplate(taskTitle, description);
    }

    const prompt = `
You are an expert AI software engineer.
You are assisting a developer working on the task: "${taskTitle}".
Description of the task: "${description}".

Provide a comprehensive, high-quality technical blueprint and code boilerplate to help the developer implement this task.
The response should contain:
1. **Architecture & Strategy**: Quick bullet points on how to structure the solution.
2. **Boilerplate Implementation**: Complete, well-structured, production-ready code snippets with comments (TypeScript, Node.js, HTML/CSS, React, or MongoDB as appropriate).
3. **Verification Steps**: How the developer can verify that this code works correctly.

Format the output clearly using standard markdown.
`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini generateCodeTemplate failed, using mock fallback:', error);
      return this.getMockCodeTemplate(taskTitle, description);
    }
  }

  private getMockTasks(projectName: string, goal: string, teamMembers?: string[]): Partial<ITask>[] {
    const defaultTasks: Partial<ITask>[] = [
      {
        id: uuidv4(),
        title: 'Project Setup & Technical Skeleton',
        userStory: `As a developer, I want to initialize the project codebase for ${projectName} so that the development team can work with consistent configurations.`,
        description: `Set up the repository structure, configure ESLint, Prettier, and TypeScript compiler configurations. Create the initial server skeleton and frontend client scaffold.`,
        acceptanceCriteria: [
          'Vite is configured and serves a template application.',
          'Express server runs on localhost with a functional health endpoint.',
          'TypeScript compiles successfully in both client and server with no errors.',
          'Project matches the goal: ' + goal
        ],
        status: 'todo',
        priority: 'high',
        storyPoints: 3,
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Database Schema Design & Repository Layer',
        userStory: 'As a developer, I want to define the mongoose schemas and repository pattern so that we can store and retrieve project data reliably.',
        description: 'Design schemas for Projects, Tasks, and Users. Create data access wrappers that handle error checking and provide logical helper functions. Ensure robust handling of database connectivity issues.',
        acceptanceCriteria: [
          'Schemas are defined using TypeScript interfaces.',
          'Connection handles errors and reconnects automatically.',
          'Database operations include proper validation rules.'
        ],
        status: 'todo',
        priority: 'high',
        storyPoints: 5,
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Core Dashboard API & WebSocket Service',
        userStory: 'As a frontend developer, I want to query project data and receive real-time updates so that team members sync their task boards instantly.',
        description: 'Build REST endpoints for fetching project boards and updating task statuses. Integrate Socket.io on the backend to broadcast status changes to rooms grouped by Project ID.',
        acceptanceCriteria: [
          'GET /api/projects returns a full list of projects.',
          'PUT /api/projects/:id/tasks/:taskId successfully updates task status and priority.',
          'Socket.io server broadcasts a taskUpdated event to the project channel when changes occur.'
        ],
        status: 'todo',
        priority: 'medium',
        storyPoints: 5,
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Interactive Board Client & Redux Integration',
        userStory: `As a project manager, I want to interact with the task board for ${projectName} in real-time so that I can see the exact progress of my team.`,
        description: 'Build a gorgeous responsive Kanban board layout using Bootstrap. Integrate Redux Toolkit to manage project state. Connect socket.io-client to receive and dispatch updates automatically.',
        acceptanceCriteria: [
          'Tasks are displayed in columns corresponding to their state (todo, in_progress, review, done).',
          'Moving a task updates state via Redux and triggers an API update.',
          'Live notifications display when another client moves a task.'
        ],
        status: 'todo',
        priority: 'medium',
        storyPoints: 8,
        createdAt: new Date(),
      }
    ];

    // Customize first task slightly based on keywords in goal
    if (goal.toLowerCase().includes('auth') || goal.toLowerCase().includes('login')) {
      defaultTasks.push({
        id: uuidv4(),
        title: 'Authentication & Session Security',
        userStory: 'As an active user, I want to secure my account with a password so that my private dashboard tasks are protected.',
        description: 'Implement JWT authentication. Add bcrypt for hashing passwords. Set up authorization headers and state protection in React Router.',
        acceptanceCriteria: [
          'Password database records are salted and hashed using bcrypt.',
          'JWT token is returned upon successful authentication.',
          'Protected API endpoints reject requests without a valid bearer token.'
        ],
        status: 'todo',
        priority: 'high',
        storyPoints: 5,
        createdAt: new Date(),
      });
    }

    return defaultTasks;
  }

  private getMockCodeTemplate(taskTitle: string, description: string): string {
    return `### 💡 Dev Blueprint: ${taskTitle}

This blueprint was generated in **Mock AI Mode** (GEMINI_API_KEY is not configured).

#### 🛠️ Architecture & Strategy
- **Layer Separation**: Keep all data fetching inside a specialized service layer or Redux thunks.
- **State Integrity**: When modifying task fields, always emit WebSocket events immediately so other team members see the update.
- **Validations**: Validate input models on both the client (TypeScript/Form validations) and server (Mongoose Schema validator/Express middleware).

#### 💻 Sample Implementation
Here is a boilerplate template designed for: *"${taskTitle}"*

\`\`\`typescript
// src/services/taskService.ts
export interface TaskUpdatePayload {
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high';
  storyPoints?: number;
}

/**
 * Updates a task in the backend API.
 * @param projectId - The project database ID.
 * @param taskId - The unique task UUID.
 * @param updates - Partial task properties to apply.
 */
export async function updateTaskOnServer(
  projectId: string, 
  taskId: string, 
  updates: TaskUpdatePayload
): Promise<any> {
  const response = await fetch(\`/api/projects/\${projectId}/tasks/\${taskId}\`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update task: ' + response.statusText);
  }

  return await response.json();
}
\`\`\`

#### ✅ Verification Steps
1. **Mock Verification**: Run standard compiler checks to verify file syntax.
2. **API Verification**: Perform a mock \`PUT\` request using Postman or our UI actions.
3. **Logs Verification**: Inspect backend server logs to confirm that database updates were executed without error.
`;
  }
}

export const geminiService = new GeminiService();
export default geminiService;
