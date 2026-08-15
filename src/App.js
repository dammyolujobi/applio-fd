import React, { useState, useEffect } from 'react';
import JobListings from './components/JobListings';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('jobs'); // 'jobs' or 'dashboard'
  
  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowSignUp(false);
  };

  const handleSignUpSuccess = () => {
    setIsAuthenticated(true);
    setShowSignUp(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setShowSignUp(false);
    setCurrentView('jobs');
  };

  const navigateToDashboard = () => {
    setCurrentView('dashboard');
  };

  const navigateToJobs = () => {
    setCurrentView('jobs');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'DM Sans' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        {showSignUp ? (
          <SignUp 
            onSignUpSuccess={handleSignUpSuccess}
            onSwitchToLogin={() => setShowSignUp(false)}
          />
        ) : (
          <Login 
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignUp={() => setShowSignUp(true)}
          />
        )}
      </>
    );
  }

  if (currentView === 'dashboard') {
    return <Dashboard onLogout={handleLogout} onNavigateToJobs={navigateToJobs} />;
  }

  return <JobListings onLogout={handleLogout} onNavigateToDashboard={navigateToDashboard} />;
}

export default App;
