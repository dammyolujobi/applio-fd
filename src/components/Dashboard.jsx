import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ onLogout, onNavigateToJobs }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [savedJobs, setSavedJobs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
  const [alertForm, setAlertForm] = useState({
    role_keywords: '',
    location: '',
    job_type: '',
    min_salary: '',
    frequency: 'weekly'
  });
  const [applicationForm, setApplicationForm] = useState({
    job_id: '',
    company: '',
    position: '',
    status: 'applied',
    notes: '',
    job_url: ''
  });

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('http://localhost:8000/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        handleTokenRefresh();
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch profile');

      const data = await response.json();
      setUser(data);
      setFormData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle token refresh
  const handleTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await fetch('http://localhost:8000/users/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) throw new Error('Session expired');

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return true;
    } catch (err) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (onLogout) onLogout();
      return false;
    }
  };

  // Fetch saved jobs
  const fetchSavedJobs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/saved-jobs', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedJobs(data.saved_jobs || []);
      }
    } catch (err) {
      console.error('Error fetching saved jobs:', err);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/alerts', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  // Fetch applications
  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/applications', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  // Fetch search history
  const fetchSearchHistory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/search-history?limit=10', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.search_history || []);
      }
    } catch (err) {
      console.error('Error fetching search history:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') fetchSavedJobs();
    if (activeTab === 'alerts') fetchAlerts();
    if (activeTab === 'applications') fetchApplications();
    if (activeTab === 'history') fetchSearchHistory();
  }, [activeTab]);

  const handleProfileUpdate = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const updateData = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== user[key]) {
          updateData[key] = formData[key];
        }
      });

      if (Object.keys(updateData).length === 0) {
        setEditing(false);
        return;
      }

      const response = await fetch('http://localhost:8000/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      setUser(data);
      setEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleChangePassword = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (passwordData.new_password.length < 8) {
        setError('New password must be at least 8 characters');
        return;
      }

      const response = await fetch('http://localhost:8000/users/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      setShowPasswordModal(false);
      setPasswordData({ current_password: '', new_password: '' });
      setSuccess('Password changed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSaveJob = async (jobId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/saved-jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ job_id: jobId, notes: '' })
      });

      if (!response.ok) throw new Error('Failed to save job');

      setSuccess('Job saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchSavedJobs();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteSavedJob = async (jobId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/users/saved-jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to remove saved job');

      setSuccess('Job removed from saved list');
      setTimeout(() => setSuccess(''), 3000);
      fetchSavedJobs();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertForm)
      });

      if (!response.ok) throw new Error('Failed to create alert');

      setSuccess('Alert created successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setAlertForm({ role_keywords: '', location: '', job_type: '', min_salary: '', frequency: 'weekly' });
      fetchAlerts();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleToggleAlert = async (alertId, isActive) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/users/alerts/${alertId}?is_active=${!isActive}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to update alert');

      fetchAlerts();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/users/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      setSuccess('Alert deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchAlerts();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateApplication = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/applications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationForm)
      });

      if (!response.ok) throw new Error('Failed to track application');

      setSuccess('Application tracked successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setApplicationForm({ job_id: '', company: '', position: '', status: 'applied', notes: '', job_url: '' });
      fetchApplications();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateApplication = async (appId, updates) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/users/applications/${appId}?status=${updates.status}&notes=${encodeURIComponent(updates.notes || '')}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to update application');

      fetchApplications();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title" style={{ cursor: 'pointer' }} onClick={onNavigateToJobs}>
          <h1>applio <em>jobs</em></h1>
          <p>Welcome back, {user?.first_name || 'User'}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      {error && <div className="dashboard-error"><strong>Error:</strong> {error}</div>}
      {success && <div className="dashboard-success"><strong>Success!</strong> {success}</div>}

      <div className="dashboard-nav">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'saved', label: 'Saved Jobs' },
          { id: 'alerts', label: 'Alerts' },
          { id: 'applications', label: 'Applications' },
          { id: 'history', label: 'Search History' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Your Profile</h2>
              <div className="section-actions">
                <button onClick={() => setShowPasswordModal(true)} className="btn-secondary">Change Password</button>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="btn-primary">Edit Profile</button>
                ) : (
                  <>
                    <button onClick={() => { setEditing(false); setFormData(user); }} className="btn-secondary">Cancel</button>
                    <button onClick={handleProfileUpdate} className="btn-primary">Save Changes</button>
                  </>
                )}
              </div>
            </div>

            <div className="profile-grid">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div className="form-group full-width">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div className="form-group full-width">
                <label>Bio</label>
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!editing}
                  rows="3"
                />
              </div>
              <div className="form-group full-width">
                <label>Skills (comma separated)</label>
                <input
                  type="text"
                  value={Array.isArray(formData.skills) ? formData.skills.join(', ') : formData.skills || ''}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                  disabled={!editing}
                  placeholder="JavaScript, Python, React..."
                />
              </div>
            </div>

            <div className="profile-meta">
              <span>Member since: {new Date(user?.created_at || Date.now()).toLocaleDateString()}</span>
              {user?.updated_at && <span>Last updated: {new Date(user.updated_at).toLocaleDateString()}</span>}
            </div>
          </div>
        )}

        {/* Saved Jobs Tab */}
        {activeTab === 'saved' && (
          <div className="saved-section">
            <h2>Saved Jobs ({savedJobs.length})</h2>
            {savedJobs.length === 0 ? (
              <div className="empty-state">No saved jobs yet. Start saving jobs you're interested in!</div>
            ) : (
              <div className="jobs-list">
                {savedJobs.map((job, idx) => (
                  <div key={idx} className="job-card">
                    <div className="job-info">
                      <h3>{job.position || job.title || 'Unknown Position'}</h3>
                      <p className="company">{job.company || 'Unknown Company'}</p>
                      {job.notes && <p className="notes">📝 {job.notes}</p>}
                      <small className="saved-date">Saved: {new Date(job.saved_at || Date.now()).toLocaleDateString()}</small>
                    </div>
                    <button onClick={() => handleDeleteSavedJob(job.job_id)} className="btn-danger">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="alerts-section">
            <h2>Job Alerts</h2>
            
            <div className="alert-form">
              <h3>Create New Alert</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Role Keywords *</label>
                  <input
                    type="text"
                    value={alertForm.role_keywords}
                    onChange={(e) => setAlertForm({ ...alertForm, role_keywords: e.target.value })}
                    placeholder="e.g., Developer, Designer"
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={alertForm.location}
                    onChange={(e) => setAlertForm({ ...alertForm, location: e.target.value })}
                    placeholder="e.g., Lagos, Remote"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Job Type</label>
                  <select
                    value={alertForm.job_type}
                    onChange={(e) => setAlertForm({ ...alertForm, job_type: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Min Salary</label>
                  <input
                    type="text"
                    value={alertForm.min_salary}
                    onChange={(e) => setAlertForm({ ...alertForm, min_salary: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={alertForm.frequency}
                    onChange={(e) => setAlertForm({ ...alertForm, frequency: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <button onClick={handleCreateAlert} className="btn-primary">Create Alert</button>
            </div>

            <div className="alerts-list">
              <h3>Your Alerts ({alerts.length})</h3>
              {alerts.length === 0 ? (
                <div className="empty-state">No alerts configured yet.</div>
              ) : (
                alerts.map((alert, idx) => (
                  <div key={idx} className={`alert-card ${!alert.is_active ? 'inactive' : ''}`}>
                    <div className="alert-info">
                      <h4>{alert.role_keywords}</h4>
                      <p>
                        {alert.location && <span>📍 {alert.location}</span>}
                        {alert.job_type && <span> · {alert.job_type}</span>}
                        {alert.min_salary && <span> · Min: {alert.min_salary}</span>}
                      </p>
                      <small>Frequency: {alert.frequency || 'weekly'} · {alert.is_active ? '✅ Active' : '⏸️ Paused'}</small>
                    </div>
                    <div className="alert-actions">
                      <button onClick={() => handleToggleAlert(alert.id, alert.is_active)} className="btn-secondary">
                        {alert.is_active ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => handleDeleteAlert(alert.id)} className="btn-danger">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="applications-section">
            <h2>Track Applications</h2>
            
            <div className="application-form">
              <h3>Add New Application</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Company *</label>
                  <input
                    type="text"
                    value={applicationForm.company}
                    onChange={(e) => setApplicationForm({ ...applicationForm, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="form-group">
                  <label>Position *</label>
                  <input
                    type="text"
                    value={applicationForm.position}
                    onChange={(e) => setApplicationForm({ ...applicationForm, position: e.target.value })}
                    placeholder="Job title"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={applicationForm.status}
                    onChange={(e) => setApplicationForm({ ...applicationForm, status: e.target.value })}
                  >
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Offer Received</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Job URL</label>
                  <input
                    type="url"
                    value={applicationForm.job_url}
                    onChange={(e) => setApplicationForm({ ...applicationForm, job_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={applicationForm.notes}
                  onChange={(e) => setApplicationForm({ ...applicationForm, notes: e.target.value })}
                  placeholder="Add any notes about this application..."
                  rows="2"
                />
              </div>
              <button onClick={handleCreateApplication} className="btn-primary">Track Application</button>
            </div>

            <div className="applications-list">
              <h3>Your Applications ({applications.length})</h3>
              {applications.length === 0 ? (
                <div className="empty-state">No applications tracked yet.</div>
              ) : (
                applications.map((app, idx) => (
                  <div key={idx} className={`application-card status-${app.status}`}>
                    <div className="app-header">
                      <h4>{app.position}</h4>
                      <span className={`status-badge ${app.status}`}>{app.status}</span>
                    </div>
                    <p className="company">{app.company}</p>
                    {app.job_url && (
                      <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="job-link">
                        View Job →
                      </a>
                    )}
                    {app.notes && <p className="notes">📝 {app.notes}</p>}
                    <small>Applied: {new Date(app.applied_at || Date.now()).toLocaleDateString()}</small>
                    
                    <div className="app-actions">
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateApplication(app.id, { ...app, status: e.target.value })}
                        className="status-select"
                      >
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer Received</option>
                        <option value="rejected">Rejected</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Search History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            <h2>Search History</h2>
            {searchHistory.length === 0 ? (
              <div className="empty-state">No recent searches.</div>
            ) : (
              <div className="history-list">
                {searchHistory.map((search, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-query">
                      <span className="query-text">🔍 {search.query}</span>
                      {search.location && <span className="query-location">· 📍 {search.location}</span>}
                    </div>
                    <small className="history-date">{new Date(search.searched_at || Date.now()).toLocaleString()}</small>
                    {search.filters && (
                      <div className="history-filters">
                        {Object.entries(search.filters).map(([key, value]) => (
                          <span key={key} className="filter-tag">{key}: {value}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Enter new password (min 8 characters)"
                minLength="8"
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleChangePassword} className="btn-primary">Change Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
