import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const AdminPage = () => {
  const { isAdmin, loginAdmin, logoutAdmin } = useAuth();
  const { addToast } = useToast();

  const [passcode, setPasscode] = useState('');
  const [loginErr, setLoginErr] = useState(false);
  const [activePanel, setActivePanel] = useState('dashboard');

  // Data states
  const [teams, setTeams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Forms
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPass, setNewTeamPass] = useState('');
  const [teamCreateOk, setTeamCreateOk] = useState('');
  const [teamCreateErr, setTeamCreateErr] = useState('');

  // Assign boost form
  const [boostTeamId, setBoostTeamId] = useState('');
  const [boostQId, setBoostQId] = useState('');
  const [boostOk, setBoostOk] = useState('');
  const [boostErr, setBoostErr] = useState('');

  // Challenge form
  const [chTeam1, setChTeam1] = useState('');
  const [chTeam2, setChTeam2] = useState('');
  const [chTeam3, setChTeam3] = useState('');
  const [chQId, setChQId] = useState('');
  const [chOk, setChOk] = useState('');
  const [chErr, setChErr] = useState('');

  const fetchAdminData = async () => {
    if (!isAdmin) return;
    try {
      const [tData, qData, sData, lData] = await Promise.all([
        api.getTeams(),
        api.getAdminQuestions(),
        api.getSubmissions(50),
        api.getLeaderboard(),
      ]);
      setTeams(tData || []);
      setQuestions(qData || []);
      setSubmissions(sData || []);
      setLeaderboard(lData || []);
    } catch (err) {
      if (err.status === 401) {
        logoutAdmin();
        addToast('Admin session expired or invalid passcode. Please log in.', 'error');
      }
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
      const interval = setInterval(fetchAdminData, 15000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginErr(false);
    const pass = passcode.trim();
    if (!pass) return;
    try {
      await loginAdmin(pass);
      addToast('Admin authenticated successfully', 'success');
    } catch (err) {
      setLoginErr(true);
      addToast(err.message || 'Invalid admin passcode (Default: admin123)', 'error');
    }
  };

  const handleCreateTeam = async () => {
    setTeamCreateOk('');
    setTeamCreateErr('');
    if (!newTeamName || !newTeamPass) {
      setTeamCreateErr('Team name and passcode are required.');
      return;
    }
    try {
      await api.createTeam({ name: newTeamName, passcode: newTeamPass });
      setTeamCreateOk(`Team "${newTeamName}" created successfully!`);
      setNewTeamName('');
      setNewTeamPass('');
      fetchAdminData();
    } catch (err) {
      setTeamCreateErr(err.message || 'Failed to create team.');
    }
  };

  const handleAddTime = async (teamId, seconds) => {
    try {
      await api.addTeamTime(teamId, seconds);
      addToast(`Added +${seconds / 60}m to team timer`, 'success');
      fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to add time', 'error');
    }
  };

  const handleResetTimer = async (teamId, teamName) => {
    const confirmMessage =
      teamId === 0
        ? 'Are you sure you want to reset the main question timer for ALL teams? This will restart the clock with full fresh time.'
        : `Are you sure you want to reset the main question timer for "${teamName}"? This will restart the clock with full fresh time.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.resetTeamTimer(teamId);
      addToast(
        teamId === 0
          ? 'All team timers have been reset!'
          : `Main question timer for "${teamName}" reset successfully!`,
        'success'
      );
      fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to reset timer', 'error');
    }
  };

  const handleResetToken = async (teamId) => {
    try {
      await api.resetTeamToken(teamId);
      addToast('Team session token reset', 'info');
      fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to reset token', 'error');
    }
  };

  const handleRejudge = async (subId) => {
    try {
      await api.rejudgeSubmission(subId);
      addToast(`Submission #${subId} rejudged`, 'success');
      fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Rejudge failed', 'error');
    }
  };

  const handleAssignBoost = async () => {
    setBoostOk('');
    setBoostErr('');
    if (!boostTeamId || !boostQId) {
      setBoostErr('Select both a team and a question.');
      return;
    }
    try {
      await api.assignBoost({ team_id: parseInt(boostTeamId), question_id: parseInt(boostQId) });
      setBoostOk(`Assigned question #${boostQId} to team #${boostTeamId}`);
      fetchAdminData();
    } catch (err) {
      setBoostErr(err.message || 'Failed to assign boost.');
    }
  };

  const handleStartChallenge = async () => {
    setChOk('');
    setChErr('');
    if (!chTeam1 || !chTeam2 || !chQId) {
      setChErr('Select at least Team 1, Team 2, and a Question.');
      return;
    }
    try {
      await api.createChallenge({
        question_id: parseInt(chQId),
        team1_id: parseInt(chTeam1),
        team2_id: parseInt(chTeam2),
        team3_id: chTeam3 ? parseInt(chTeam3) : null,
      });
      setChOk('Challenge session started successfully!');
      fetchAdminData();
    } catch (err) {
      setChErr(err.message || 'Failed to start challenge.');
    }
  };

  const activeTeamsCount = leaderboard.filter((t) => t.started && !t.expired).length;
  const leaderTeam = leaderboard[0]?.team_name || leaderboard[0]?.name || '—';

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BackgroundLayers />

      {!isAdmin ? (
        /* ══ LOGIN SCREEN ══════════════════════════════════════════════ */
        <div id="login-screen">
          <div className="login-box">
            <div className="login-icon">
              <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2>Admin Panel</h2>
            <p className="login-sub">Enter your admin passcode to access the control panel.</p>
            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="admin-pass">Admin Passcode</label>
              <input
                type="password"
                id="admin-pass"
                placeholder="••••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdminLogin();
                }}
              />
            </div>
            <button className="btn-admin-login" onClick={handleAdminLogin}>
              Access Panel →
            </button>
            <div className={`login-err ${loginErr ? 'show' : ''}`} id="login-err" style={{ display: loginErr ? 'block' : 'none' }}>
              Invalid passcode. Try again.
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link to="/hub" style={{ color: 'var(--muted)', fontSize: '.825rem', textDecoration: 'none' }}>
                ← Back to Hub
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ══ APP SHELL ════════════════════════════════════════════════ */
        <div id="app" style={{ display: 'flex' }}>
          {/* ── Sidebar ── */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="logo-icon">
                <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div className="logo-text">MPL Admin</div>
                <div className="logo-sub">Control Panel</div>
              </div>
            </div>

            <nav className="nav">
              <div className="nav-section">Overview</div>
              <div
                className={`nav-item ${activePanel === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActivePanel('dashboard')}
              >
                <span className="ni-icon">
                  <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </span>
                &nbsp;Dashboard
              </div>

              <div className="nav-section">Management</div>
              <div
                className={`nav-item ${activePanel === 'teams' ? 'active' : ''}`}
                onClick={() => setActivePanel('teams')}
              >
                <span className="ni-icon">
                  <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                &nbsp;Teams
                <span className="ni-badge">{teams.length}</span>
              </div>

              <div
                className={`nav-item ${activePanel === 'questions' ? 'active' : ''}`}
                onClick={() => setActivePanel('questions')}
              >
                <span className="ni-icon">
                  <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                &nbsp;Questions
              </div>

              <div className="nav-section">Operations</div>
              <div
                className={`nav-item ${activePanel === 'assign' ? 'active' : ''}`}
                onClick={() => setActivePanel('assign')}
              >
                <span className="ni-icon">
                  <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </span>
                &nbsp;Assign Boost
              </div>

              <div
                className={`nav-item ${activePanel === 'challenge' ? 'active' : ''}`}
                onClick={() => setActivePanel('challenge')}
              >
                <span className="ni-icon">
                  <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                    <line x1="13" y1="19" x2="19" y2="13" />
                    <line x1="16" y1="16" x2="20" y2="20" />
                    <line x1="19" y1="21" x2="21" y2="19" />
                    <polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5" />
                    <line x1="11" y1="19" x2="5" y2="13" />
                    <line x1="8" y1="16" x2="4" y2="20" />
                    <line x1="5" y1="21" x2="3" y2="19" />
                  </svg>
                </span>
                &nbsp;Challenge
              </div>

              <div
                className={`nav-item ${activePanel === 'review' ? 'active' : ''}`}
                onClick={() => setActivePanel('review')}
              >
                <span className="ni-icon">
                  <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                &nbsp;Review / Submissions
              </div>
            </nav>

            <div className="sidebar-footer">
              <div className="admin-pill">
                <div className="admin-avatar">A</div>
                <div className="admin-info">
                  <div className="admin-name">Administrator</div>
                  <div className="admin-role">Full Access</div>
                </div>
                <button className="btn-signout" onClick={logoutAdmin} title="Sign out">
                  <svg className="mpl-icon" style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="main">
            {/* PANEL: DASHBOARD */}
            {activePanel === 'dashboard' && (
              <div className="panel active" id="panel-dashboard">
                <div className="section-hdr">
                  <h1>Dashboard</h1>
                  <p>Live overview of all teams and event status.</p>
                </div>

                <div className="grid-3" style={{ marginBottom: '24px' }}>
                  <div className="stat-card">
                    <div className="stat-icon gold">
                      <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div className="stat-val" id="stat-teams">{teams.length}</div>
                      <div className="stat-label">Total Teams</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon green">
                      <span className="pulse-indicator" />
                    </div>
                    <div>
                      <div className="stat-val" id="stat-active">{activeTeamsCount}</div>
                      <div className="stat-label">Active (timer running)</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon purple">
                      <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                        <path d="M18 4H6v7a6 6 0 0 0 12 0V4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="stat-val" id="stat-leader">{leaderTeam}</div>
                      <div className="stat-label">Leader (points)</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3>
                      <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                        <path d="M18 4H6v7a6 6 0 0 0 12 0V4z" />
                      </svg>
                      &nbsp;Live Leaderboard
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-expand"
                        onClick={() => handleResetTimer(0, 'ALL Teams')}
                        style={{ color: '#fbbf24', borderColor: 'rgba(240,180,41,0.5)' }}
                      >
                        ↻ Reset All Timers
                      </button>
                      <button className="btn-refresh" onClick={fetchAdminData}>↻ Refresh</button>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Team</th>
                            <th>Points</th>
                            <th>Timer Status</th>
                            <th>Extra Time</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((t, idx) => (
                            <tr key={t.team_id || idx}>
                              <td>
                                <span className={`rank-badge rank-${idx < 3 ? idx + 1 : ''}`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td><strong>{t.team_name || t.name}</strong></td>
                              <td className="pts">{t.total_points || t.points || 0}</td>
                              <td>
                                {t.started ? (
                                  t.expired ? (
                                    <span style={{ color: '#ef4444' }}>● Expired (0s left)</span>
                                  ) : (
                                    <span style={{ color: '#10b981' }}>● Running ({t.seconds_remaining}s left)</span>
                                  )
                                ) : (
                                  <span style={{ color: 'var(--muted)' }}>Not Started</span>
                                )}
                              </td>
                              <td>+{t.extra_time_seconds || 0}s</td>
                              <td>
                                <button
                                  className="btn btn-expand"
                                  onClick={() => handleResetTimer(t.team_id || t.id, t.team_name || t.name)}
                                  style={{ color: '#fbbf24', borderColor: 'rgba(240,180,41,0.5)' }}
                                  title="Reset main question clock"
                                >
                                  ↻ Reset Time
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL: TEAMS */}
            {activePanel === 'teams' && (
              <div className="panel active" id="panel-teams">
                <div className="section-hdr">
                  <h1>Teams</h1>
                  <p>Create and manage competing teams.</p>
                </div>

                <div className="grid-2" style={{ alignItems: 'start' }}>
                  <div className="card">
                    <div className="card-header">
                      <h3>Create Team</h3>
                    </div>
                    <div className="card-body">
                      {teamCreateOk && <div className="alert alert-success">{teamCreateOk}</div>}
                      {teamCreateErr && <div className="alert alert-error">{teamCreateErr}</div>}
                      <div className="form-row">
                        <label>Team Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Team Delta"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>Passcode</label>
                        <input
                          type="text"
                          placeholder="e.g. delta123"
                          value={newTeamPass}
                          onChange={(e) => setNewTeamPass(e.target.value)}
                        />
                      </div>
                      <button className="btn btn-gold" onClick={handleCreateTeam}>
                        Create Team
                      </button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>All Teams</h3>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-expand"
                          onClick={() => handleResetTimer(0, 'ALL Teams')}
                          style={{ color: '#fbbf24', borderColor: 'rgba(240,180,41,0.5)' }}
                        >
                          ↻ Reset All Timers
                        </button>
                        <button className="btn-refresh" onClick={fetchAdminData}>↻ Refresh</button>
                      </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="tbl-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Name</th>
                              <th>Passcode</th>
                              <th>Points</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teams.map((t) => (
                              <tr key={t.id}>
                                <td>#{t.id}</td>
                                <td><strong>{t.name}</strong></td>
                                <td><code>{t.passcode}</code></td>
                                <td className="pts">{t.points}</td>
                                <td>
                                  <button className="btn btn-expand" onClick={() => handleAddTime(t.id, 300)} style={{ marginRight: '6px' }}>
                                    +5m
                                  </button>
                                  <button className="btn btn-expand" onClick={() => handleAddTime(t.id, 600)} style={{ marginRight: '6px' }}>
                                    +10m
                                  </button>
                                  <button
                                    className="btn btn-expand"
                                    onClick={() => handleResetTimer(t.id, t.name)}
                                    style={{ marginRight: '6px', color: '#fbbf24', borderColor: 'rgba(240,180,41,0.5)' }}
                                    title="Reset main question clock"
                                  >
                                    ↻ Reset Time
                                  </button>
                                  <button className="btn btn-expand" onClick={() => handleResetToken(t.id)} style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.4)' }}>
                                    Reset Token
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL: QUESTIONS */}
            {activePanel === 'questions' && (
              <div className="panel active" id="panel-questions">
                <div className="section-hdr">
                  <h1>Questions</h1>
                  <p>View active contest problems.</p>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3>Problem Repository</h3>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Type</th>
                            <th>Title</th>
                            <th>Difficulty</th>
                            <th>Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questions.map((q) => (
                            <tr key={q.id}>
                              <td>#{q.id}</td>
                              <td><span className="badge badge-main">{q.sub_type || q.type}</span></td>
                              <td><strong>{q.title}</strong></td>
                              <td>{q.difficulty}</td>
                              <td className="pts">{q.points || q.reward_value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL: ASSIGN BOOST */}
            {activePanel === 'assign' && (
              <div className="panel active" id="panel-assign">
                <div className="section-hdr">
                  <h1>Assign Boost</h1>
                  <p>Assign time-boost tasks to individual teams.</p>
                </div>
                <div className="card" style={{ maxWidth: '500px' }}>
                  <div className="card-body">
                    {boostOk && <div className="alert alert-success">{boostOk}</div>}
                    {boostErr && <div className="alert alert-error">{boostErr}</div>}
                    <div className="form-row">
                      <label>Team</label>
                      <select value={boostTeamId} onChange={(e) => setBoostTeamId(e.target.value)}>
                        <option value="">Select a team…</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <label>Question</label>
                      <select value={boostQId} onChange={(e) => setBoostQId(e.target.value)}>
                        <option value="">Select a question…</option>
                        {questions.map((q) => (
                          <option key={q.id} value={q.id}>#{q.id} {q.title}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-gold" onClick={handleAssignBoost}>Assign Boost</button>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL: CHALLENGE */}
            {activePanel === 'challenge' && (
              <div className="panel active" id="panel-challenge">
                <div className="section-hdr">
                  <h1>Challenge Arena</h1>
                  <p>Launch live multiplayer head-to-head battles.</p>
                </div>
                <div className="card" style={{ maxWidth: '560px' }}>
                  <div className="card-body">
                    {chOk && <div className="alert alert-success">{chOk}</div>}
                    {chErr && <div className="alert alert-error">{chErr}</div>}
                    <div className="form-row">
                      <label>Team 1 (Required)</label>
                      <select value={chTeam1} onChange={(e) => setChTeam1(e.target.value)}>
                        <option value="">Select Team 1…</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <label>Team 2 (Required)</label>
                      <select value={chTeam2} onChange={(e) => setChTeam2(e.target.value)}>
                        <option value="">Select Team 2…</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <label>Team 3 (Optional)</label>
                      <select value={chTeam3} onChange={(e) => setChTeam3(e.target.value)}>
                        <option value="">(None)</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <label>Challenge Problem</label>
                      <select value={chQId} onChange={(e) => setChQId(e.target.value)}>
                        <option value="">Select problem…</option>
                        {questions.map((q) => (
                          <option key={q.id} value={q.id}>#{q.id} {q.title}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-gold" onClick={handleStartChallenge}>Start Challenge Session</button>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL: REVIEW */}
            {activePanel === 'review' && (
              <div className="panel active" id="panel-review">
                <div className="section-hdr">
                  <h1>Submissions & Rejudge</h1>
                  <p>Review real-time code submissions.</p>
                </div>
                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Team</th>
                            <th>QID</th>
                            <th>Lang</th>
                            <th>Verdict</th>
                            <th>Delta</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((s) => (
                            <tr key={s.id}>
                              <td>#{s.id}</td>
                              <td><strong>{s.team_name || `Team ${s.team_id}`}</strong></td>
                              <td>Q#{s.question_id}</td>
                              <td><code>{s.language}</code></td>
                              <td><span style={{ color: s.verdict === 'PASSED' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{s.verdict}</span></td>
                              <td className="pts">+{s.score_delta || 0}</td>
                              <td>
                                <button className="btn btn-expand" onClick={() => handleRejudge(s.id)}>Rejudge</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
};
