import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ProjectsState, IProject, ITask } from '../types';
import { RootState } from './index';

const initialState: ProjectsState = {
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,
  fallbackMode: false,
  isMockAI: false,
};

const getHeaders = (state: RootState, includeContentType = true) => {
  const headers: any = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (state.auth.token) headers['Authorization'] = `Bearer ${state.auth.token}`;
  return headers;
};

// Async Thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const response = await fetch('/api/projects', { headers: getHeaders(state, false) });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return { projects: data.data, fallbackMode: data.fallbackMode };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch projects');
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const response = await fetch(`/api/projects/${id}`, { headers: getHeaders(state, false) });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data as IProject;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch project details');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (payload: { name: string; goal: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: getHeaders(state),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return { project: data.data, isMockAI: data.isMockAI };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to create project');
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'projects/updateTaskStatus',
  async (
    payload: { projectId: string; taskId: string; updates: Partial<ITask> },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const response = await fetch(`/api/projects/${payload.projectId}/tasks/${payload.taskId}`, {
        method: 'PUT',
        headers: getHeaders(state),
        body: JSON.stringify(payload.updates),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data as IProject;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update task');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getHeaders(state, false),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete project');
    }
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setSelectedProject(state, action: PayloadAction<IProject | null>) {
      state.selectedProject = action.payload;
    },
    // WebSocket real-time update actions
    socketUpdateProject(state, action: PayloadAction<IProject>) {
      // If the currently selected project is the one updated, update it
      if (state.selectedProject && state.selectedProject._id === action.payload._id) {
        state.selectedProject = action.payload;
      }
      // Also update in list
      state.projects = state.projects.map(p => 
        p._id === action.payload._id ? action.payload : p
      );
    },
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchProjects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.projects;
        state.fallbackMode = action.payload.fallbackMode;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchProjectById
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProject = action.payload;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createProject
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.unshift(action.payload.project);
        state.selectedProject = action.payload.project;
        state.isMockAI = action.payload.isMockAI;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateTaskStatus
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        if (state.selectedProject && state.selectedProject._id === action.payload._id) {
          state.selectedProject = action.payload;
        }
        state.projects = state.projects.map(p => 
          p._id === action.payload._id ? action.payload : p
        );
      })
      // deleteProject
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p._id !== action.payload);
        if (state.selectedProject && state.selectedProject._id === action.payload) {
          state.selectedProject = null;
        }
      });
  },
});

export const { setSelectedProject, socketUpdateProject, clearError } = projectSlice.actions;
export default projectSlice.reducer;
