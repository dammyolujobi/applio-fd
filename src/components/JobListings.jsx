import React, { useState, useMemo, useEffect } from 'react';
import './JobListings.css';

const JobListings = ({ onLogout }) => {
  const [rawJobsData, setRawJobsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({ role: '', location: '' });

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
          'Authorization': `Bearer ${token}`
        },
        signal: abortController.signal
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
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch jobs');
        console.error('Error fetching jobs:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const jobsData = useMemo(() => {
    if (!rawJobsData) return [];
    return transformJobData(rawJobsData);
  }, [rawJobsData]);

  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSource, setActiveSource] = useState("all");
  const [searchQ, setSearchQ] = useState("");

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
          {onLogout && (
            <button onClick={onLogout} className="logout-btn">Logout</button>
          )}
        </div>
      </div>

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
                  <div key={idx} className="card">
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
                      <a className="arrow-btn" href={j.url} target="_blank" rel="noopener noreferrer" title="View job">↗</a>
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
    </div>
  );
};

export default JobListings;
