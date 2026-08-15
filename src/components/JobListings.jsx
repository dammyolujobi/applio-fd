import React, { useState, useMemo } from 'react';
import './JobListings.css';

const JobListings = ({ onLogout, onNavigateToDashboard }) => {
  const [rawJobsData, setRawJobsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({ role: '', location: '' });
  const [selectedJob, setSelectedJob] = useState(null);

  // Transform backend data to include source field
  const transformJobData = (data) => {
    const allJobs = [];
    if (data['Jobs In Nigeria']) {
      allJobs.push(...data['Jobs In Nigeria'].map(job => ({
        ...job,
        source: 'jobberman',
        url: job.job_url,
        desc: job.description
      })));
    }
    if (data['Work at Apple']) {
      allJobs.push(...data['Work at Apple'].map(job => ({
        ...job,
        source: 'apple',
        url: job.job_url,
        desc: job.description
      })));
    }
    return allJobs;
  };

  // Fetch jobs from backend when user clicks Search button
  const handleSearch = async () => {
    const abortController = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setError('No authentication token available');
        setLoading(false);
        return;
      }

      // Validate inputs
      if (!searchParams.role.trim() || !searchParams.location.trim()) {
        setError('Please fill in both job role and location');
        setLoading(false);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        role: searchParams.role,
        location_of_job: searchParams.location
      });

      const response = await fetch(`http://localhost:8000/aggregate?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: abortController.signal,
        body: JSON.stringify({
          role: searchParams.role,
          location: searchParams.location
        })
      });
      
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        setError('Session expired. Please login again.');
        if (onLogout) onLogout();
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRawJobsData(data);
      setError(null);

      // Store search in history
      await storeSearchHistory(searchParams.role, searchParams.location, token);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch jobs');
        console.error('Error fetching jobs:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Store search history
  const storeSearchHistory = async (query, location, token) => {
    try {
      await fetch('http://localhost:8000/users/search-history', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          location: location,
          filters: {}
        })
      });
    } catch (err) {
      console.error('Error storing search history:', err);
    }
  };

  // Handle job click to show details
  const handleJobClick = async (job) => {
    setSelectedJob(job);
    
    // Log view-job activity
    try {
      const token = localStorage.getItem('access_token');
      if (token && job.job_id) {
        await fetch(`http://localhost:8000/jobs/${job.job_id}?source=${job.source}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {}); // Silently fail if endpoint doesn't exist
      }
    } catch (err) {
      console.error('Error logging job view:', err);
    }
  };

  // Handle save job from modal
  const handleSaveJobFromModal = async (jobId) => {
    if (!jobId) {
      setError('No job ID available for saving');
      return;
    }
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

      setSuccessMessage('Job saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const jobsData = useMemo(() => {
    if (!rawJobsData) return [];
    return transformJobData(rawJobsData);
  }, [rawJobsData]);

  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSource, setActiveSource] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [successMessage, setSuccessMessage] = useState('');

  const helpers = useMemo(() => ({
    getSourceLabel: (s) => ({jobberman:"Jobberman",myjobmag:"MyJobMag",indeed:"Indeed",apple:"Apple"}[s]||s),
    isRemote: (j) => /remote/i.test((j.title || "") + (j.desc || "") + (j.company || "")),
    isIntern: (j) => /intern|internship|graduate|nysc/i.test((j.title || "") + (j.desc || "")),
    isTech: (j) => /tech|developer|mobile|IT|security|data|digital|software|code|design|graphic|web|engineer|qa/i.test((j.title || "") + (j.desc || "")),
    isPaid: (j) => j.salary && j.salary !== "Unpaid" && j.salary !== "",
    isUnpaid: (j) => /unpaid/i.test((j.title || "") + (j.desc || "")) || (j.salary === "Unpaid"),
    isNew: (j) => /apr 2|apr 1/i.test(j.date || "")
  }), []);

  const filteredJobs = useMemo(() => {
    if (!jobsData || jobsData.length === 0) return [];
    return jobsData.filter(j => {
      if (activeSource !== "all" && j.source !== activeSource) return false;
      if (searchQ) {
        const hay = ((j.title || "") + (j.company || "") + (j.desc || "")).toLowerCase();
        if (!hay.includes(searchQ.toLowerCase())) return false;
      }
      if (activeFilter === "remote" && !helpers.isRemote(j)) return false;
      if (activeFilter === "intern" && !helpers.isIntern(j)) return false;
      if (activeFilter === "paid" && !helpers.isPaid(j)) return false;
      if (activeFilter === "tech" && !helpers.isTech(j)) return false;
      return true;
    });
  }, [activeFilter, activeSource, searchQ, jobsData, helpers]);

  const stats = {
    remote: jobsData.filter(helpers.isRemote).length,
    intern: jobsData.filter(helpers.isIntern).length,
    paid: jobsData.filter(helpers.isPaid).length
  };

  return (
    <div className="shell">
      <div className="header">
        <div className="header-left">
          <h1>applio <em>jobs</em></h1>
          <p>Aggregated from Jobberman · MyJobMag · Indeed · LinkedIn</p>
        </div>
        <div className="header-right">
          <span className="count-pill">{filteredJobs.length} role{filteredJobs.length!==1?'s':''}</span>
          {onNavigateToDashboard && (
            <button onClick={onNavigateToDashboard} className="logout-btn" style={{ marginRight: '8px' }}>Dashboard</button>
          )}
          {onLogout && (
            <button onClick={onLogout} className="logout-btn">Logout</button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <strong>Success!</strong> {successMessage}
        </div>
      )}

      {/* Search Form */}
      <div className="search-form-section">
        <div className="search-form-group">
          <input 
            type="text" 
            placeholder="Job Role (e.g., Developer, Designer...)"
            value={searchParams.role}
            onChange={(e) => setSearchParams({...searchParams, role: e.target.value})}
            className="search-form-input"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <input 
            type="text" 
            placeholder="Location (e.g., Nigeria, Lagos...)"
            value={searchParams.location}
            onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
            className="search-form-input"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="search-btn"
            style={{
              padding: '10px 24px',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* API Error */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="empty">Searching for jobs...</div>
      )}

      {/* Initial State - No Search Performed */}
      {!loading && !rawJobsData && (
        <div className="empty">Enter a job role and location, then click Search.</div>
      )}

      {/* Main Content - Only show if has data */}
      {!loading && rawJobsData && jobsData.length > 0 && (
        <>
          <div className="stats-bar">
            <div className="stat"><div className="stat-n">{stats.remote}</div><div className="stat-l">remote</div></div>
            <div className="stat"><div className="stat-n">{stats.intern}</div><div className="stat-l">internships</div></div>
            <div className="stat"><div className="stat-n">{stats.paid}</div><div className="stat-l">paid roles</div></div>
          </div>

          <div className="controls">
            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input 
                type="text" 
                placeholder="Search jobs, companies, keywords…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
            <div className="filter-group">
              {['all', 'remote', 'intern', 'paid', 'tech'].map(filter => (
                <button 
                  key={filter}
                  className={`chip ${activeFilter === filter ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="source-tabs">
            {['all', 'jobberman', 'myjobmag', 'indeed', 'apple'].map(source => (
              <button
                key={source}
                className={`tab ${activeSource === source ? 'active' : ''}`}
                onClick={() => setActiveSource(source)}
              >
                {source === 'all' ? 'All sources' : helpers.getSourceLabel(source)}
              </button>
            ))}
          </div>

          <div className="grid">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((j, idx) => {
                const tags = [];
                if (helpers.isRemote(j)) tags.push({type: 'remote', label: 'Remote'});
                else tags.push({type: 'onsite', label: 'On-site'});
                if (helpers.isIntern(j)) tags.push({type: 'generic', label: 'Intern'});
                if (helpers.isTech(j)) tags.push({type: 'generic', label: 'Tech'});
                if (helpers.isUnpaid(j)) tags.push({type: 'unpaid', label: 'Unpaid'});
                else if (helpers.isPaid(j)) tags.push({type: 'paid', label: j.salary});
                if (helpers.isNew(j)) tags.push({type: 'new-tag', label: 'New'});
                const company = j.company ? `· ${j.company}` : '';
                return (
                  <div key={idx} className="card" onClick={() => handleJobClick(j)}>
                    <div className="card-left">
                      <div className="card-meta">
                        <span className={`source-dot ${j.source}`}></span>
                        <span className="source-name">{helpers.getSourceLabel(j.source)}</span>
                        <span className="company">{company}</span>
                      </div>
                      <div className="card-title">{j.title}</div>
                      <div className="tags">
                        {tags.map((tag, i) => (
                          <span key={i} className={`tag ${tag.type}`}>{tag.label}</span>
                        ))}
                      </div>
                    </div>
                    <div className="card-right">
                      <span className="date">{j.date || '—'}</span>
                      <a className="arrow-btn" href={j.url} target="_blank" rel="noopener noreferrer" title="View job" onClick={(e) => e.stopPropagation()}>↗</a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty">No roles match your filters.</div>
            )}
          </div>
        </>
      )}

      {/* No Results State */}
      {!loading && rawJobsData && jobsData.length === 0 && (
        <div className="empty">No jobs found for your search.</div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="job-modal" onClick={(e) => e.stopPropagation()}>
            <div className="job-modal-header">
              <div className="job-modal-title">
                <h2>{selectedJob.title}</h2>
                <p>{selectedJob.company || 'Company not specified'}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedJob(null)}>✕</button>
            </div>
            <div className="job-modal-content">
              {selectedJob.description && (
                <div className="job-section">
                  <h3>Description</h3>
                  <p className="job-description">{selectedJob.description}</p>
                </div>
              )}
              <div className="job-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Source</span>
                  <span className="meta-value">{helpers.getSourceLabel(selectedJob.source)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Location</span>
                  <span className="meta-value">{selectedJob.location || 'Not specified'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Salary</span>
                  <span className="meta-value">{selectedJob.salary || 'Not specified'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Posted</span>
                  <span className="meta-value">{selectedJob.date || 'Not specified'}</span>
                </div>
              </div>
              {selectedJob.requirements && (
                <div className="job-section">
                  <h3>Requirements</h3>
                  <ul className="job-requirements">
                    {Array.isArray(selectedJob.requirements) ? (
                      selectedJob.requirements.map((req, i) => <li key={i}>{req}</li>)
                    ) : (
                      <li>{selectedJob.requirements}</li>
                    )}
                  </ul>
                </div>
              )}
              {selectedJob.benefits && (
                <div className="job-section">
                  <h3>Benefits</h3>
                  <ul className="job-benefits">
                    {Array.isArray(selectedJob.benefits) ? (
                      selectedJob.benefits.map((ben, i) => <li key={i}>{ben}</li>)
                    ) : (
                      <li>{selectedJob.benefits}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="job-modal-footer">
              <button className="btn-secondary" onClick={() => handleSaveJobFromModal(selectedJob.job_id || selectedJob.id)}>
                Save Job
              </button>
              <a className="btn-primary" href={selectedJob.url} target="_blank" rel="noopener noreferrer">
                Apply Now →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobListings;
