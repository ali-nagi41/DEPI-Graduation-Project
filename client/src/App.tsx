import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchProjects, 
  createProject, 
  deleteProject, 
  setSelectedProject, 
  clearError 
} from './store/projectSlice';
import { RootState, AppDispatch } from './store';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { ITask, IProject } from './types';
import socketService from './services/socket';
import { logout } from './store/authSlice';
import { Login } from './components/Login';
import { 
  Plus, 
  FolderKanban, 
  Trash2, 
  Layers, 
  Cpu, 
  Info,
  Activity,
  CheckCircle,
  HelpCircle,
  LogOut
} from 'lucide-react';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { projects, selectedProject, loading, error } = useSelector(
    (state: RootState) => state.projects
  );
  const { user } = useSelector((state: RootState) => state.auth);

  // App Modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  
  // Active task details modal state
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);

  // Real-time notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  // Init socket and fetch projects on mount if user is logged in
  useEffect(() => {
    if (user) {
      dispatch(fetchProjects());
      socketService.connect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [dispatch, user]);

  // Handle active project room switching in socket
  useEffect(() => {
    if (selectedProject) {
      socketService.joinProjectRoom(selectedProject._id);
    }
  }, [selectedProject]);

  // Monitor socket updates to trigger toast notifications
  useEffect(() => {
    const handleSocketNotification = () => {
      addToast('Syncing real-time workspace updates...');
    };

    // Listen on general board updates
    const socket = (socketService as any).socket;
    if (socket) {
      socket.on('taskUpdated', handleSocketNotification);
      socket.on('projectListUpdated', () => {
        addToast('Project database updated.');
      });
    }

    return () => {
      if (socket) {
        socket.off('taskUpdated', handleSocketNotification);
        socket.off('projectListUpdated');
      }
    };
  }, [selectedProject]);

  const addToast = (msg: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message: msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectGoal.trim()) return;

    const resultAction = await dispatch(createProject({ 
      name: projectName, 
      goal: projectGoal
    }));
    if (createProject.fulfilled.match(resultAction)) {
      setShowNewProjectModal(false);
      setProjectName('');
      setProjectGoal('');
      addToast(`Agile backlog generated for ${resultAction.payload.project.name}!`);
    }
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid selecting the project when deleting it
    if (window.confirm('Are you sure you want to delete this project?')) {
      dispatch(deleteProject(id));
      addToast('Project deleted.');
    }
  };

  // Calculate project progress percentage
  const getProgressInfo = (project: IProject) => {
    if (!project.tasks || project.tasks.length === 0) return { percent: 0, done: 0, total: 0 };
    const doneTasks = project.tasks.filter(t => t.status === 'done').length;
    const totalTasks = project.tasks.length;
    return {
      percent: Math.round((doneTasks / totalTasks) * 100),
      done: doneTasks,
      total: totalTasks
    };
  };

  const progress = selectedProject ? getProgressInfo(selectedProject) : { percent: 0, done: 0, total: 0 };

  // Helper to extract the currently open task from the updated project state
  const currentOpenTask = selectedTask && selectedProject
    ? selectedProject.tasks.find(t => t.id === selectedTask.id) || null
    : null;

  if (!user) {
    return <Login />;
  }

  return (
    <div className="container-fluid py-4 min-vh-100 d-flex flex-column">
      
      {/* Top Navbar */}
      <header className="row mb-4">
        <div className="col-12">
          <div className="navbar navbar-light bg-white shadow-sm p-3 rounded-3 d-flex justify-content-between align-items-center">
            
            {/* Branding */}
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 rounded-3 bg-primary bg-opacity-15 text-primary">
                <Layers size={28} className="animate-pulse" />
              </div>
              <div>
                <h3 className="brand-font fw-bold m-0 text-dark tracking-tight">
                  AI Sprint
                </h3>
              </div>
            </div>

            {/* User Profile & Logout */}
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted small d-none d-md-inline">
                Welcome, <strong>{user.username}</strong>
              </span>
              <button 
                className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 px-3"
                onClick={() => dispatch(logout())}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="row flex-grow-1 g-4">
        
        {/* Left Side Menu - Projects */}
        <aside className="col-12 col-lg-3 d-flex flex-column">
          <div className="card shadow-sm border-0 p-4 flex-grow-1 d-flex flex-column" style={{ minHeight: '400px' }}>
            
            {/* Create Project Button */}
            <button 
              className="btn btn-primary w-100 py-2 mb-4 d-flex align-items-center justify-content-center gap-2"
              onClick={() => {
                dispatch(clearError());
                setShowNewProjectModal(true);
              }}
            >
              <Plus size={18} />
              Decompose Project
            </button>

            {/* Section Title */}
            <div className="d-flex align-items-center gap-2 mb-3 text-muted">
              <FolderKanban size={16} />
              <span className="small text-uppercase fw-semibold tracking-wider">Workspace Projects</span>
            </div>

            {/* Project List container */}
            <div className="flex-grow-1 overflow-y-auto mb-3" style={{ maxHeight: '50vh' }}>
              {loading && projects.length === 0 ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="small text-muted mt-2">Loading backlog...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center text-muted py-5 border border-dashed rounded-3 border-secondary border-opacity-10">
                  <Info size={24} className="mb-2 opacity-50" />
                  <p className="small m-0 px-2">No projects created. Use the button above to generate one using AI!</p>
                </div>
              ) : (
                projects.map(proj => (
                  <div 
                    key={proj._id}
                    className={`project-list-item ${selectedProject?._id === proj._id ? 'active' : ''}`}
                    onClick={() => dispatch(setSelectedProject(proj))}
                  >
                    <div className="text-truncate me-2">
                      <span className="text-dark d-block text-truncate small fw-semibold">{proj.name}</span>
                      <span className="text-muted small font-monospace" style={{ fontSize: '0.75rem' }}>
                        {proj.tasks?.length || 0} Tasks
                      </span>
                    </div>
                    
                    <button 
                      className="btn btn-link p-1 text-muted border-0 hover-danger"
                      onClick={(e) => handleDeleteProject(e, proj._id)}
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Helper Tips */}
            <div className="p-3 rounded-3 bg-light border border-secondary border-opacity-10 mt-auto">
              <div className="d-flex align-items-start gap-2">
                <HelpCircle size={16} className="text-primary mt-0.5" />
                <div>
                  <span className="small text-dark fw-semibold d-block">Pro Tip</span>
                  <span className="text-muted small" style={{ fontSize: '0.8rem' }}>
                    Click on a task card to open the workspace. You can update priorities, story points, and generate complete code boilerplates using Gemini!
                  </span>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Right Side - Board Details */}
        <section className="col-12 col-lg-9 d-flex flex-column">
          {selectedProject ? (
            <div className="card shadow-sm border-0 p-4 flex-grow-1 d-flex flex-column">
              
              {/* Project Title and Progress Bar */}
              <div className="row align-items-center mb-4 g-3">
                <div className="col-12 col-md-7">
                  <h2 className="brand-font fw-bold text-dark mb-1">{selectedProject.name}</h2>
                  <p className="small text-muted mb-0">{selectedProject.goal}</p>
                </div>
                
                {/* Progress bar info */}
                <div className="col-12 col-md-5">
                  <div className="d-flex justify-content-between mb-1.5 align-items-center">
                    <span className="small text-muted d-flex align-items-center gap-1">
                      <Activity size={14} className="text-primary" />
                      Progress: <strong>{progress.percent}%</strong>
                    </span>
                    <span className="small text-muted font-monospace">
                      {progress.done}/{progress.total} Tasks Completed
                    </span>
                  </div>
                  <div className="custom-progress">
                    <div 
                      className="custom-progress-bar" 
                      style={{ width: `${progress.percent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Kanban Columns Component */}
              <div className="flex-grow-1">
                <KanbanBoard 
                  project={selectedProject} 
                  onSelectTask={(task) => setSelectedTask(task)} 
                />
              </div>

            </div>
          ) : (
            // Placeholder view
            <div className="card shadow-sm border-0 p-5 flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
              <div className="p-4 rounded-circle bg-light border border-secondary border-opacity-10 mb-4 text-primary">
                <FolderKanban size={48} className="animate-pulse" />
              </div>
              <h3 className="brand-font fw-bold text-dark mb-2">Welcome to AI Sprint Workspace</h3>
              <p className="text-muted max-w-lg mb-4" style={{ maxWidth: '500px' }}>
                Decompose your high-level project goals into technical Agile tasks, user stories, and acceptance criteria automatically. Get started by launching a project decomposition.
              </p>
              <button 
                className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                onClick={() => {
                  dispatch(clearError());
                  setShowNewProjectModal(true);
                }}
              >
                <Plus size={18} />
                Create New Project
              </button>
            </div>
          )}
        </section>

      </main>

      {/* New Project Decomposition Modal */}
      {showNewProjectModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-light align-items-center">
                <div className="d-flex align-items-center gap-2 text-primary">
                  <Cpu size={20} />
                  <h5 className="modal-title brand-font fw-bold text-dark m-0">AI Decomposer</h5>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowNewProjectModal(false)}></button>
              </div>
              
              <form onSubmit={handleCreateProject}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small border-0 bg-danger bg-opacity-15 text-danger mb-3">
                      Error: {error}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small text-muted">Project Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g., E-Commerce Gateway" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">What is the Project Goal?</label>
                    <textarea 
                      className="form-control" 
                      rows={4}
                      placeholder="e.g., A developer API that handles card processing. We need users to signup, generate API keys, secure endpoints with oauth2, and store transact logs in PostgreSQL." 
                      value={projectGoal}
                      onChange={(e) => setProjectGoal(e.target.value)}
                      required
                    />
                  </div>

                  <div className="p-3 rounded-2 bg-light border border-secondary border-opacity-10 mb-2">
                    <span className="small text-muted d-flex align-items-start gap-1.5">
                      <Info size={14} className="text-info mt-0.5 flex-shrink-0" />
                      <span>
                        Gemini AI will analyze your prompt to generate technical user stories, acceptance criteria, story points, and status pipelines.
                      </span>
                    </span>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary btn-sm px-3" onClick={() => setShowNewProjectModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Decomposing...
                      </>
                    ) : (
                      'Decompose Goal'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal Workspace */}
      {currentOpenTask && selectedProject && (
        <TaskModal 
          project={selectedProject} 
          task={currentOpenTask} 
          onClose={() => setSelectedTask(null)} 
        />
      )}

      {/* Real-time Toast Notifications */}
      <div className="toast-container-custom">
        {toasts.map(toast => (
          <div key={toast.id} className="toast-custom d-flex align-items-center gap-2 small">
            <CheckCircle size={16} className="text-success" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
