import React, { useState, useEffect } from 'react';
import JobListings from './components/JobListings';
import Login from './components/Login';
import SignUp from './components/SignUp';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [loading, setLoading] = useState(true);

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
    setIsAuthenticated(false);
    setShowSignUp(false);
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

  return <JobListings onLogout={handleLogout} />;
}

export default App;
