import React, { useState } from 'react';
import './Auth.css';

const Login = ({ onLoginSuccess, onSwitchToSignUp }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: username,
          password: password,
          grant_type: 'password'
        }).toString()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>applio <em>jobs</em></h1>
          <p>Find your next opportunity</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to access job listings</p>

          {error && (
            <div className="auth-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Email or Username</label>
            <input
              id="username"
              type="text"
              placeholder="your@email.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? 
            <button 
              type="button"
              onClick={onSwitchToSignUp}
              className="auth-link"
              disabled={loading}
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
