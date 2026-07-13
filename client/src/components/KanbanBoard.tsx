import React from 'react';
import { ITask, IProject } from '../types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  CheckSquare, 
  Award
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTaskStatus, addTeamMember, removeTeamMember } from '../store/projectSlice';
import { RootState, AppDispatch } from '../store';
import { UserCircle, UserPlus, X } from 'lucide-react';
import { useState } from 'react';

interface KanbanBoardProps {
  project: IProject;
  onSelectTask: (task: ITask) => void;
}

const COLUMNS: { id: ITask['status']; label: string; classSuffix: string; color: string }[] = [
  { id: 'todo', label: 'To Do', classSuffix: 'todo', color: 'var(--color-todo)' },
  { id: 'in_progress', label: 'In Progress', classSuffix: 'inprogress', color: 'var(--color-in-progress)' },
  { id: 'review', label: 'Review', classSuffix: 'review', color: 'var(--color-review)' },
  { id: 'done', label: 'Completed', classSuffix: 'done', color: 'var(--color-done)' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ project, onSelectTask }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [newMemberInput, setNewMemberInput] = useState('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberInput.trim()) return;
    dispatch(addTeamMember({ projectId: project._id, username: newMemberInput.trim() }));
    setNewMemberInput('');
  };

  const handleRemoveMember = (username: string) => {
    if (window.confirm(`Are you sure you want to remove ${username}? They will also be unassigned from any tasks.`)) {
      dispatch(removeTeamMember({ projectId: project._id, username }));
    }
  };

  const handleMoveTask = (e: React.MouseEvent, taskId: string, currentStatus: ITask['status'], direction: 'left' | 'right') => {
    e.stopPropagation(); // Avoid opening the details modal when clicking move buttons
    
    const statusOrder: ITask['status'][] = ['todo', 'in_progress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    let nextIndex = currentIndex + (direction === 'right' ? 1 : -1);
    
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      const nextStatus = statusOrder[nextIndex];
      dispatch(updateTaskStatus({
        projectId: project._id,
        taskId,
        updates: { status: nextStatus }
      }));
    }
  };

  const getPriorityBadgeClass = (priority: ITask['priority']) => {
    switch (priority) {
      case 'low': return 'badge-low';
      case 'medium': return 'badge-medium';
      case 'high': return 'badge-high';
      default: return 'badge-medium';
    }
  };

  return (
    <div>
      {/* Team Management Header */}
      {user?.id === project.userId && (
        <div className="mb-4 p-3 bg-light rounded-3 border border-secondary border-opacity-10">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2 text-dark fw-semibold">
              <UserCircle size={18} className="text-primary" />
              <span>Manage Team</span>
            </div>
            <form className="d-flex gap-2" onSubmit={handleAddMember}>
              <input
                type="text"
                className="form-control form-control-sm border-secondary border-opacity-25"
                placeholder="Username..."
                value={newMemberInput}
                onChange={(e) => setNewMemberInput(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-primary d-flex align-items-center gap-1">
                <UserPlus size={14} /> Add
              </button>
            </form>
          </div>
          
          {/* List Current Team Members */}
          {project.teamMembers && project.teamMembers.length > 0 && (
            <div className="d-flex flex-wrap gap-2 pt-2 border-top border-secondary border-opacity-10">
              {project.teamMembers.map(member => (
                <div key={member} className="badge bg-white text-dark border border-secondary border-opacity-25 d-flex align-items-center gap-1 py-1 px-2">
                  <UserCircle size={12} className="text-muted" />
                  <span className="fw-normal">{member}</span>
                  <button 
                    className="btn btn-link p-0 text-danger ms-1 text-decoration-none" 
                    onClick={() => handleRemoveMember(member)}
                    title="Remove Member"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="row g-4 mt-1">
      {COLUMNS.map(col => {
        const columnTasks = project.tasks.filter(t => t.status === col.id);
        
        return (
          <div key={col.id} className="col-12 col-md-6 col-lg-3">
            <div className={`kanban-column kanban-column-${col.classSuffix} h-100`}>
              
              {/* Column Header */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 brand-font fw-bold" style={{ color: col.color }}>
                  {col.label}
                </h5>
                <span className="badge rounded-pill bg-secondary bg-opacity-25 px-2.5 py-1">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-grow-1 overflow-y-auto" style={{ minHeight: '300px' }}>
                {columnTasks.length === 0 ? (
                  <div className="text-center text-muted py-5 border border-dashed rounded-3 border-secondary border-opacity-10 d-flex flex-column align-items-center">
                    <Clock size={20} className="mb-2 opacity-50" />
                    <span className="small">No tasks in this stage</span>
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <div 
                      key={task.id}
                      className={`task-card task-card-${task.priority}`}
                      onClick={() => onSelectTask(task)}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span className={`badge-priority ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                        
                        {/* Story Points Badge */}
                        <span className="badge bg-light text-dark border border-secondary border-opacity-10 small py-0.5 px-1.5 rounded d-flex align-items-center gap-1">
                          <Award size={10} />
                          {task.storyPoints} SP
                        </span>
                      </div>

                      <h6 className="fw-semibold text-dark mb-2 text-truncate-2">
                        {task.title}
                      </h6>
                      
                      {user?.id === project.userId && project.teamMembers && project.teamMembers.length > 0 ? (
                        <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                          <select 
                            className="form-select form-select-sm border-primary text-primary fw-semibold bg-primary bg-opacity-10" 
                            style={{ width: 'fit-content', cursor: 'pointer', fontSize: '0.75rem' }}
                            value={task.assignee || ''}
                            onChange={(e) => {
                              dispatch(updateTaskStatus({
                                projectId: project._id,
                                taskId: task.id,
                                updates: { assignee: e.target.value }
                              }));
                            }}
                          >
                            <option value="">Unassigned</option>
                            {project.teamMembers.map(member => (
                              <option key={member} value={member}>{member}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        task.assignee && (
                          <div className="d-flex align-items-center gap-1 mb-2 small text-primary fw-semibold bg-primary bg-opacity-10 d-inline-flex px-2 py-0.5 rounded">
                            <UserCircle size={14} />
                            <span>{task.assignee}</span>
                          </div>
                        )
                      )}

                      <p className="small text-muted mb-3 text-truncate-3">
                        {task.description}
                      </p>

                      {/* Task Footer Actions */}
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-10">
                        {/* Task Acceptance Criteria Count */}
                        <div className="d-flex align-items-center gap-1 small text-muted">
                          <CheckSquare size={12} />
                          <span>{task.acceptanceCriteria?.length || 0} Criteria</span>
                        </div>

                        {/* Move Actions (Creator or Assignee) */}
                        {(user?.id === project.userId || task.assignee === user?.username) && (
                          <div className="d-flex gap-1">
                          {col.id !== 'todo' && (
                            <button 
                              className="btn btn-sm btn-outline-secondary p-1 border-opacity-10 text-muted"
                              title="Move Left"
                              onClick={(e) => handleMoveTask(e, task.id, task.status, 'left')}
                            >
                              <ArrowLeft size={14} />
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button 
                              className="btn btn-sm btn-outline-secondary p-1 border-opacity-10 text-muted"
                              title="Move Right"
                              onClick={(e) => handleMoveTask(e, task.id, task.status, 'right')}
                            >
                              <ArrowRight size={14} />
                            </button>
                          )}
                          </div>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
export default KanbanBoard;
