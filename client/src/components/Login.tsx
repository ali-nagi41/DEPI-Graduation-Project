import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearAuthError } from '../store/authSlice';
import { AppDispatch, RootState } from '../store';
import { Layers, LogIn, UserPlus } from 'lucide-react';

export const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearAuthError());
    if (isLoginView) {
      dispatch(login({ username, password }));
    } else {
      dispatch(register({ username, password }));
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
      <div className="card shadow-lg border-0 p-4 p-md-5" style={{ maxWidth: '450px', width: '100%' }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
            <Layers size={40} className="animate-pulse" />
          </div>
          <h2 className="brand-font fw-bold text-dark">AI Sprint</h2>
          <p className="text-muted small">Agile Project Decomposer & Automator</p>
        </div>

        <h4 className="fw-bold text-center mb-4">
          {isLoginView ? 'Welcome Back' : 'Create an Account'}
        </h4>

        {error && (
          <div className="alert alert-danger py-2 small border-0 bg-danger bg-opacity-10 text-danger mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold text-muted">Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Enter your username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="form-label small fw-semibold text-muted">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2 d-flex justify-content-center align-items-center gap-2 mb-3"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : isLoginView ? (
              <><LogIn size={18} /> Sign In</>
            ) : (
              <><UserPlus size={18} /> Register</>
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <button 
            className="btn btn-link text-decoration-none small text-muted"
            onClick={() => {
              setIsLoginView(!isLoginView);
              dispatch(clearAuthError());
            }}
          >
            {isLoginView 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};
