import React, { useState, useEffect } from 'react';
import { ITask, IProject } from '../types';
import { 
  Cpu, 
  CheckCircle2, 
  Copy,
  Check,
  Zap,
  FileCode2
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTaskStatus } from '../store/projectSlice';
import { RootState, AppDispatch } from '../store';

interface TaskModalProps {
  project: IProject;
  task: ITask;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ project, task, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const isCreator = user?.id === project.userId;
  const canEditTask = isCreator || task.assignee === user?.username;
  const [blueprint, setBlueprint] = useState<string>('');
  const [loadingBlueprint, setLoadingBlueprint] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Local edit states
  const [priority, setPriority] = useState<ITask['priority']>(task.priority);
  const [storyPoints, setStoryPoints] = useState<number>(task.storyPoints);

  // Sync state if task changes
  useEffect(() => {
    setPriority(task.priority);
    setStoryPoints(task.storyPoints);
    setBlueprint('');
  }, [task]);

  const handleUpdateTaskDetails = (updatedFields: Partial<ITask>) => {
    dispatch(updateTaskStatus({
      projectId: project._id,
      taskId: task.id,
      updates: updatedFields
    }));
  };

  const handleGenerateBlueprint = async () => {
    setLoadingBlueprint(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${project._id}/tasks/${task.id}/automate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBlueprint(data.blueprint);
      } else {
        setBlueprint(`Error: ${data.message}`);
      }
    } catch (err: any) {
      setBlueprint(`Connection error: ${err.message || 'Failed to fetch'}`);
    } finally {
      setLoadingBlueprint(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(blueprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow border-0">
          
          {/* Modal Header */}
          <div className="modal-header align-items-center bg-light">
            <div className="d-flex align-items-center gap-2">
              <Cpu size={24} className="text-primary" />
              <h5 className="modal-title brand-font fw-bold text-dark m-0">Task Workspace</h5>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body overflow-y-auto" style={{ maxHeight: '75vh' }}>
            
            {/* Title & User Story */}
            <div className="mb-4">
              <h3 className="brand-font fw-bold text-dark mb-2">{task.title}</h3>
              <div className="p-3 rounded-3 bg-light border border-secondary border-opacity-10">
                <span className="small text-primary fw-bold text-uppercase d-block mb-1">User Story</span>
                <p className="mb-0 text-dark font-monospace small">"{task.userStory}"</p>
              </div>
            </div>

            <div className="row g-4 mb-4">
              {/* Task Details Panel */}
              <div className="col-12 col-md-8">
                <h6 className="brand-font text-dark fw-bold mb-2">Description</h6>
                <p className="text-dark small mb-4">{task.description}</p>

                {/* Acceptance Criteria */}
                <h6 className="brand-font text-dark fw-bold mb-2 d-flex align-items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  Acceptance Criteria
                </h6>
                <div className="mb-4">
                  {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 ? (
                    task.acceptanceCriteria.map((criterion, idx) => (
                      <div key={idx} className="criterion-item d-flex align-items-start gap-2">
                        <span className="text-success font-monospace select-none">•</span>
                        <span>{criterion}</span>
                      </div>
                    ))
                  ) : (
                    <span className="small text-muted">No acceptance criteria specified</span>
                  )}
                </div>
              </div>

              {/* Adjustments Sidebar */}
              <div className="col-12 col-md-4">
                <div className="p-3 rounded-3 bg-light border border-secondary border-opacity-10">
                  <h6 className="brand-font text-dark fw-bold mb-3">Adjustments</h6>
                  
                  {/* Status Dropdown */}
                  <div className="mb-3">
                    <label className="small text-muted mb-1 d-block">Stage</label>
                    <select 
                      className="form-select form-select-sm"
                      value={task.status}
                      onChange={(e) => handleUpdateTaskDetails({ status: e.target.value as ITask['status'] })}
                      disabled={!canEditTask}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Completed</option>
                    </select>
                  </div>

                  {/* Priority Select */}
                  <div className="mb-3">
                    <label className="small text-muted mb-1 d-block">Priority</label>
                    <select 
                      className="form-select form-select-sm"
                      value={priority}
                      onChange={(e) => {
                        const val = e.target.value as ITask['priority'];
                        setPriority(val);
                        handleUpdateTaskDetails({ priority: val });
                      }}
                      disabled={!canEditTask}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Story Points Select */}
                  <div className="mb-3">
                    <label className="small text-muted mb-1 d-block">Story Points (Difficulty)</label>
                    <select 
                      className="form-select form-select-sm"
                      value={storyPoints}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStoryPoints(val);
                        handleUpdateTaskDetails({ storyPoints: val });
                      }}
                      disabled={!canEditTask}
                    >
                      <option value={1}>1 Point (Very Easy)</option>
                      <option value={2}>2 Points (Easy)</option>
                      <option value={3}>3 Points (Medium)</option>
                      <option value={5}>5 Points (Complex)</option>
                      <option value={8}>8 Points (Very Complex)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* AI developer automation blueprint section */}
            <div className="border-top border-secondary border-opacity-10 pt-4 mt-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="brand-font text-dark fw-bold mb-1 d-flex align-items-center gap-2">
                    <Zap size={18} className="text-warning animate-pulse" />
                    AI Task Automator
                  </h5>
                  <p className="small text-muted mb-0">Generate a custom implementation blueprint, database schemas, and codebase skeleton</p>
                </div>
                
                {!blueprint && (
                  <button 
                    className="btn btn-sm btn-primary px-3 py-2 d-flex align-items-center gap-2"
                    onClick={handleGenerateBlueprint}
                    disabled={loadingBlueprint}
                  >
                    {loadingBlueprint ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Cpu size={14} />
                        Auto-Code Blueprint
                      </>
                    )}
                  </button>
                )}
              </div>

              {loadingBlueprint && (
                <div className="text-center py-5 rounded-3 bg-light border border-secondary border-opacity-10">
                  <div className="spinner-grow text-primary mb-3" role="status"></div>
                  <p className="small text-muted mb-0">Gemini is engineering your code structure. Please wait...</p>
                </div>
              )}

              {blueprint && (
                <div className="mt-3 rounded overflow-hidden shadow-lg border border-secondary border-opacity-25" style={{ backgroundColor: '#1e1e1e' }}>
                  {/* VS Code Header */}
                  <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ backgroundColor: '#252526', borderBottom: '1px solid #333' }}>
                    <div className="d-flex gap-2">
                      <div className="rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: '#ff5f56' }}></div>
                      <div className="rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: '#ffbd2e' }}></div>
                      <div className="rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: '#27c93f' }}></div>
                    </div>
                    <span className="small font-monospace text-light opacity-75 d-flex align-items-center gap-2">
                      <FileCode2 size={14} />
                      AI-generated-blueprint.md
                    </span>
                    <button 
                      className="btn btn-sm p-1 text-light opacity-75 hover-opacity-100 d-flex align-items-center gap-1 border-0"
                      style={{ background: 'transparent' }}
                      onClick={handleCopyToClipboard}
                    >
                      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      <span className="small">{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  
                  {/* Blueprint display */}
                  <div className="p-3 overflow-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
                    <pre className="font-monospace small mb-0 white-space-pre-wrap" style={{ color: '#d4d4d4', tabSize: 2, fontSize: '0.85rem', lineHeight: '1.5' }}>
                      <code>{blueprint}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-light">
            <button type="button" className="btn btn-secondary btn-sm px-4" onClick={onClose}>
              Close Workspace
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
export default TaskModal;
