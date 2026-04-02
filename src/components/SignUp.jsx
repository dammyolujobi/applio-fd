import React, { useState } from 'react';
import './Auth.css';

const SignUp = ({ onSignUpSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Build query parameters for GET request
      const params = new URLSearchParams({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password
      });

      const createResponse = await fetch(`http://localhost:8000/users/create_user?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.detail || 'Failed to create account');
      }

      setSuccess('Account created successfully! Signing you in...');
      
      // Auto-login after signup
      setTimeout(() => {
        loginAfterSignUp();
      }, 1500);
    } catch (err) {
      setError(err.message);
      console.error('SignUp error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loginAfterSignUp = async () => {
    try {
      const response = await fetch('http://localhost:8000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: formData.email,
          password: formData.password,
          grant_type: 'password'
        }).toString()
      });

      if (!response.ok) throw new Error('Login after signup failed');

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      onSignUpSuccess();
    } catch (err) {
      setError('Account created but auto-login failed. Please login manually.');
      console.error('Auto-login error:', err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>applio <em>jobs</em></h1>
          <p>Find your next opportunity</p>
        </div>

        <form onSubmit={handleSignUp} className="auth-form">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join to explore amazing job opportunities</p>

          {error && (
            <div className="auth-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              <strong>Success!</strong> {success}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              minLength="6"
              required
            />
            <small>Minimum 6 characters</small>
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? 
            <button 
              type="button"
              onClick={onSwitchToLogin}
              className="auth-link"
              disabled={loading}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
