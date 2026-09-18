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
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  // Assign bidding form
  const [boostTeamId, setBoostTeamId] = useState('');
  const [biddingQuestionId, setBiddingQuestionId] = useState('');
  const [bidDeductAmount, setBidDeductAmount] = useState(0);
  const [boostDifficulty, setBoostDifficulty] = useState('MEDIUM');
  const [boostOk, setBoostOk] = useState('');
  const [boostErr, setBoostErr] = useState('');

  // 1v1 / 1v1v1 Challenge state
  const [chTeam1, setChTeam1] = useState('');
  const [chTeam2, setChTeam2] = useState('');
  const [chTeam3, setChTeam3] = useState('');
  const [chQId, setChQId] = useState('');
  const [chOk, setChOk] = useState('');
  const [chErr, setChErr] = useState('');
  const [challengeSessions, setChallengeSessions] = useState([]);
  const [challengeQuestions, setChallengeQuestions] = useState([]);
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);
  const [isChallengePortalUnlocked, setIsChallengePortalUnlocked] = useState(false);
  const [isTogglingPortal, setIsTogglingPortal] = useState(false);


  const fetchAdminData = async () => {
    if (!isAdmin) return;
    try {
      const results = await Promise.allSettled([
        api.getTeams(),
        api.getAdminQuestions(),
        api.getSubmissions(50),
        api.getLeaderboard(),
        api.getChallengeSessions(),
        api.getChallengeQuestions(),
        api.getChallengePortalStatus(),
      ]);

      if (results[0].status === 'fulfilled') setTeams(results[0].value || []);
      if (results[1].status === 'fulfilled') {
        const qList = results[1].value || [];
        setQuestions(qList);
      }
      if (results[2].status === 'fulfilled') setSubmissions(results[2].value || []);
      if (results[3].status === 'fulfilled') setLeaderboard(results[3].value || []);
      if (results[4].status === 'fulfilled') setChallengeSessions(results[4].value || []);
      if (results[5].status === 'fulfilled') {
        const cqList = results[5].value || [];
        setChallengeQuestions(cqList);
        if (!chQId && cqList.length > 0) {
          setChQId(cqList[0].id);
        }
      }
      if (results[6].status === 'fulfilled') {
        setIsChallengePortalUnlocked(Boolean(results[6].value?.is_unlocked));
      }

      const unauthorized = results.find(
        (r) => r.status === 'rejected' && r.reason?.status === 401
      );
      if (unauthorized) {
        logoutAdmin();
        addToast('Admin session expired or invalid passcode. Please log in.', 'error');
      }
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
      addToast(err.message || 'Invalid admin passcode', 'error');
    }
  };

  const handleCreateTeam = async (e) => {
    if (e) e.preventDefault();
    setTeamCreateOk('');
    setTeamCreateErr('');
    const name = newTeamName.trim();
    const pass = newTeamPass.trim();
    if (!name || !pass) {
      setTeamCreateErr('Team name and passcode are required.');
      addToast('Please enter both Team Name and Passcode', 'error');
      return;
    }
    setIsCreatingTeam(true);
    try {
      await api.createTeam({ name, passcode: pass });
      setTeamCreateOk(`Team "${name}" created successfully!`);
      addToast(`Team "${name}" created!`, 'success');
      setNewTeamName('');
      setNewTeamPass('');
      await fetchAdminData();
    } catch (err) {
      const msg = err.message || 'Failed to create team.';
      setTeamCreateErr(msg);
      addToast(msg, 'error');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete "${teamName}" (#${teamId})? All their question progress and submissions will be removed.`)) {
      return;
    }
    try {
      await api.deleteTeam(teamId);
      addToast(`Team "${teamName}" deleted successfully`, 'success');
      fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to delete team', 'error');
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
    if (!boostTeamId) {
      setBoostErr('Select a team to assign a bidding question.');
      return;
    }
    try {
      const deduct = parseInt(bidDeductAmount) || 0;
      const res = await api.assignRandomBoost(
        parseInt(boostTeamId),
        boostDifficulty,
        deduct
      );
      const q = res?.question;
      const pts = q?.reward_points || (boostDifficulty === 'EASY' ? 500 : boostDifficulty === 'HARD' ? 1000 : 800);
      setBoostOk(`Assigned ${q?.difficulty || boostDifficulty} Question: "${q?.title}" (+${pts} PTS) to Team #${boostTeamId}. Deducted ${deduct} pts.`);
      addToast(`Random ${boostDifficulty} question allocated! Deducted ${deduct} pts from team balance.`, 'success');
      fetchAdminData();
    } catch (err) {
      setBoostErr(err.message || 'Failed to allocate bidding question.');
    }
  };



  const handleStartChallenge = async () => {
    setChOk('');
    setChErr('');
    if (!chTeam1 || !chTeam2 || !chQId) {
      setChErr('Select Team 1, Team 2, and a Challenge problem.');
      addToast('Please select Team 1, Team 2, and a Challenge problem', 'error');
      return;
    }
    const teamIds = [chTeam1, chTeam2];
    if (chTeam3) {
      teamIds.push(chTeam3);
    }
    if (new Set(teamIds).size !== teamIds.length) {
      setChErr('All selected competing teams must be distinct.');
      addToast('All selected competing teams must be distinct', 'error');
      return;
    }
    setIsStartingChallenge(true);
    try {
      const isTriangular = Boolean(chTeam3);
      const res = await api.createChallenge({
        question_id: parseInt(chQId),
        team1_id: parseInt(chTeam1),
        team2_id: parseInt(chTeam2),
        team3_id: chTeam3 ? parseInt(chTeam3) : null,
      });
      const matchLabel = isTriangular ? '1v1v1 Triangular Match Started (100 pts stake)!' : '1v1 Challenge Match Started (100 pts stake)!';
      setChOk(res.message || matchLabel);
      addToast(res.message || matchLabel, 'success');
      setChTeam1('');
      setChTeam2('');
      setChTeam3('');
      await fetchAdminData();
    } catch (err) {
      const msg = err.message || 'Failed to start challenge match.';
      setChErr(msg);
      addToast(msg, 'error');
    } finally {
      setIsStartingChallenge(false);
    }
  };

  const handleResolveChallenge = async (sessionId, winnerTeamId, winnerName) => {
    if (!window.confirm(`Declare "${winnerName}" as the WINNER of match #${sessionId}? This will award +100 pts to "${winnerName}" and deduct 100 pts from the opponent.`)) {
      return;
    }
    try {
      const res = await api.resolveChallenge(sessionId, { winner_team_id: winnerTeamId });
      addToast(res.message || `Match #${sessionId} resolved: ${winnerName} won 100 pts!`, 'success');
      await fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to resolve match', 'error');
    }
  };

  const handleToggleChallengePortal = async () => {
    setIsTogglingPortal(true);
    try {
      const res = await api.toggleChallengePortal();
      setIsChallengePortalUnlocked(res.is_unlocked);
      addToast(
        res.message || `Challenge Arena is now ${res.is_unlocked ? 'UNLOCKED' : 'LOCKED'}.`,
        res.is_unlocked ? 'success' : 'info'
      );
      await fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to toggle Challenge Arena portal.', 'error');
    } finally {
      setIsTogglingPortal(false);
    }
  };

  const activeTeamsCount = leaderboard.filter((t) => t.started && !t.expired).length;
  const leaderTeam = leaderboard[0]?.team_name || leaderboard[0]?.name || '—';

  return (
    <div className="page" style={{ position: 'relative', minHeight: '100vh', zIndex: 1 }}>
      <BackgroundLayers />

      {!isAdmin ? (
        /* ══ LOGIN SCREEN ══════════════════════════════════════════════ */
        <div id="login-screen" style={{ position: 'relative', zIndex: 10 }}>
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
        <div id="app" style={{ display: 'flex', position: 'relative', zIndex: 10 }}>
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
                &nbsp;Bidding Allocation
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
                &nbsp;1v1 Challenge
                {challengeSessions.filter(s => s.status === 'ONGOING').length > 0 && (
                  <span className="ni-badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>
                    {challengeSessions.filter(s => s.status === 'ONGOING').length} LIVE
                  </span>
                )}
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
                      {teamCreateOk && <div className="alert alert-success" style={{ display: 'block' }}>{teamCreateOk}</div>}
                      {teamCreateErr && <div className="alert alert-error" style={{ display: 'block' }}>{teamCreateErr}</div>}
                      <form onSubmit={handleCreateTeam}>
                        <div className="form-row">
                          <label htmlFor="create-team-name">Team Name</label>
                          <input
                            id="create-team-name"
                            type="text"
                            placeholder="e.g. Team Delta"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            autoComplete="off"
                            required
                          />
                        </div>
                        <div className="form-row">
                          <label htmlFor="create-team-pass">Passcode</label>
                          <input
                            id="create-team-pass"
                            type="text"
                            placeholder="e.g. delta123"
                            value={newTeamPass}
                            onChange={(e) => setNewTeamPass(e.target.value)}
                            autoComplete="off"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-gold"
                          disabled={isCreatingTeam}
                          style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', padding: '12px' }}
                        >
                          {isCreatingTeam ? 'Creating Team...' : 'Create Team'}
                        </button>
                      </form>
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
                              <th style={{ width: '50px' }}>ID</th>
                              <th style={{ width: '120px' }}>Name</th>
                              <th style={{ width: '90px' }}>Passcode</th>
                              <th>Questions / Progress</th>
                              <th style={{ width: '80px' }}>Points</th>
                              <th style={{ width: '220px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teams.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                                  No teams found. Create a new team on the left!
                                </td>
                              </tr>
                            ) : (
                              teams.map((t) => (
                                <tr key={t.id}>
                                  <td>#{t.id}</td>
                                  <td><strong style={{ color: '#fff' }}>{t.name}</strong></td>
                                  <td><code>{t.passcode}</code></td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                                          {t.question_set_name || (t.started ? 'Set Assigned' : 'Unallocated')}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '100px',
                                            background: t.solved_count === t.total_questions ? 'rgba(16,185,129,0.15)' : t.solved_count > 0 ? 'rgba(240,180,41,0.15)' : 'rgba(255,255,255,0.06)',
                                            color: t.solved_count === t.total_questions ? '#10b981' : t.solved_count > 0 ? '#ffe4a3' : 'var(--muted)',
                                            border: `1px solid ${t.solved_count === t.total_questions ? 'rgba(16,185,129,0.3)' : t.solved_count > 0 ? 'rgba(240,180,41,0.3)' : 'rgba(255,255,255,0.1)'}`
                                          }}
                                        >
                                          {t.solved_count}/{t.total_questions} Solved
                                        </span>
                                        {t.boost_questions && t.boost_questions.length > 0 && (
                                          <span
                                            style={{
                                              fontSize: '0.68rem',
                                              padding: '2px 7px',
                                              borderRadius: '100px',
                                              fontWeight: 700,
                                              background: 'rgba(240,180,41,0.12)',
                                              color: '#ffe4a3',
                                              border: '1px solid rgba(240,180,41,0.25)'
                                            }}
                                            title={t.boost_questions.map(b => `${b.title} (${b.status})`).join(', ')}
                                          >
                                            ⚡ Boost {t.boost_questions[0].status === 'SOLVED' ? 'Earned' : 'Active'}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          className="btn btn-expand"
                                          onClick={() => setExpandedTeamId(expandedTeamId === t.id ? null : t.id)}
                                          style={{ padding: '2px 8px', fontSize: '0.68rem', minHeight: '22px' }}
                                        >
                                          {expandedTeamId === t.id ? '▲ Less' : '▼ Details'}
                                        </button>
                                      </div>

                                      {/* Compact 3-Problem Indicator Bar */}
                                      {t.main_questions && t.main_questions.length > 0 && (
                                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                          {t.main_questions.map((q) => {
                                            const isDone = q.status === 'SOLVED';
                                            const isInProg = q.status === 'IN_PROGRESS';
                                            return (
                                              <span
                                                key={q.question_id}
                                                style={{
                                                  fontSize: '0.68rem',
                                                  padding: '2px 7px',
                                                  borderRadius: '5px',
                                                  fontWeight: 600,
                                                  background: isDone
                                                    ? 'rgba(16, 185, 129, 0.15)'
                                                    : isInProg
                                                    ? 'rgba(245, 158, 11, 0.15)'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                  color: isDone ? '#10b981' : isInProg ? '#f59e0b' : 'var(--muted)',
                                                  border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : isInProg ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px'
                                                }}
                                                title={`${q.category}: ${q.title} (${q.status})`}
                                              >
                                                <span>{q.category === 'DEBUGGING' ? 'Debug' : q.category === 'MATH' ? 'Math' : 'Coding'}</span>
                                                <span style={{ fontSize: '0.75rem' }}>{isDone ? '✓' : isInProg ? '⏳' : '—'}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Expandable Details Drawer */}
                                      {expandedTeamId === t.id && (
                                        <div style={{ marginTop: '4px', padding: '10px 12px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.78rem', maxWidth: '400px' }}>
                                          <div style={{ fontWeight: 700, color: 'var(--gold-light)', marginBottom: '4px' }}>
                                            Problem Breakdown:
                                          </div>
                                          {t.main_questions && t.main_questions.map((q) => (
                                            <div key={q.question_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: 'var(--text-secondary)' }}>
                                              <span>• {q.category}: <strong style={{ color: '#fff' }}>{q.title}</strong></span>
                                              <span style={{ color: q.status === 'SOLVED' ? '#10b981' : 'var(--muted)', fontWeight: 600 }}>
                                                {q.status} {q.best_score ? `(${q.best_score} pts)` : ''}
                                              </span>
                                            </div>
                                          ))}
                                          {t.boost_questions && t.boost_questions.length > 0 && (
                                            <>
                                              <div style={{ fontWeight: 700, color: '#6ee7b7', marginTop: '6px', marginBottom: '2px' }}>
                                                Bonus Time Boosts:
                                              </div>
                                              {t.boost_questions.map((b) => (
                                                <div key={b.question_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                                  <span>⚡ [{b.difficulty}] {b.title}</span>
                                                  <span style={{ color: b.status === 'SOLVED' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                                    {b.status} (+{b.reward_seconds / 60}m)
                                                  </span>
                                                </div>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="pts">{t.points}</td>
                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                      <button className="btn btn-expand" onClick={() => handleAddTime(t.id, 300)} title="Add 5 minutes">
                                        +5m
                                      </button>
                                      <button className="btn btn-expand" onClick={() => handleAddTime(t.id, 600)} title="Add 10 minutes">
                                        +10m
                                      </button>
                                      <button
                                        className="btn btn-expand"
                                        onClick={() => handleResetTimer(t.id, t.name)}
                                        style={{ color: '#fbbf24', borderColor: 'rgba(240,180,41,0.5)' }}
                                        title="Reset main question clock"
                                      >
                                        ↻ Reset
                                      </button>
                                      <button
                                        className="btn btn-expand"
                                        onClick={() => handleDeleteTeam(t.id, t.name)}
                                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                                        title="Delete team"
                                      >
                                        🗑
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
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

            {/* PANEL: ASSIGN BIDDING */}
            {activePanel === 'assign' && (
              <div className="panel active" id="panel-assign">
                <div className="section-hdr">
                  <h1>Bidding Question Allocation</h1>
                  <p>Choose difficulty (Easy, Medium, or Hard) to randomly allocate a question to the team and deduct their winning bid amount.</p>
                </div>
                <div className="card" style={{ maxWidth: '600px' }}>
                  <div className="card-body">
                    {boostOk && <div className="alert alert-success">{boostOk}</div>}
                    {boostErr && <div className="alert alert-error">{boostErr}</div>}
                    <div className="form-row">
                      <label>Select Team</label>
                      <select value={boostTeamId} onChange={(e) => setBoostTeamId(e.target.value)}>
                        <option value="">Select a team…</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            #{t.id} - {t.name} (Current Balance: {t.points || 0} pts)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <label>Select Difficulty & Solve Reward</label>
                      <select value={boostDifficulty} onChange={(e) => setBoostDifficulty(e.target.value)}>
                        <option value="EASY">Easy — Reward: +500 PTS</option>
                        <option value="MEDIUM">Medium — Reward: +800 PTS</option>
                        <option value="HARD">Hard — Reward: +1,000 PTS</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label>Bid Amount to Deduct from Team (PTS)</label>
                      <input
                        type="number"
                        placeholder="Enter winning bid amount (e.g. 100, 250)"
                        value={bidDeductAmount}
                        onChange={(e) => setBidDeductAmount(e.target.value)}
                        min="0"
                      />
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '.84rem', margin: '14px 0 18px', lineHeight: 1.5 }}>
                      A random question matching this difficulty will be allocated to the team. The bid amount is deducted from the team balance (points can go into negative). Upon volunteer verification, the team earns <strong>+500 PTS (Easy)</strong>, <strong>+800 PTS (Medium)</strong>, or <strong>+1,000 PTS (Hard)</strong>.
                    </p>
                    <button className="btn btn-gold" onClick={handleAssignBoost} style={{ width: '100%', justifyContent: 'center' }}>
                      ⚡ Allocate Random Bidding Question & Deduct Bid
                    </button>
                  </div>
                </div>
              </div>
            )}



            {/* PANEL: CHALLENGE */}
            {activePanel === 'challenge' && (
              <div className="panel active" id="panel-challenge">
                <div className="section-hdr">
                  <h1>Challenge Arena (1v1 & 1v1v1)</h1>
                  <p>Pair two or three teams for a high-stakes battle. The winning team earns 500 points taken from the losing team(s).</p>
                </div>


                {/* ── GLOBAL CHALLENGE ARENA GATE TOGGLE CARD ── */}
                <div
                  className="card"
                  style={{
                    marginBottom: '24px',
                    border: `1px solid ${isChallengePortalUnlocked ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}`,
                    background: isChallengePortalUnlocked
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.25))'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.10), rgba(127, 29, 29, 0.20))',
                    boxShadow: isChallengePortalUnlocked ? '0 8px 32px rgba(16, 185, 129, 0.15)' : '0 8px 32px rgba(239, 68, 68, 0.12)',
                  }}
                >
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 320px' }}>
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem',
                          background: isChallengePortalUnlocked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                          border: `1px solid ${isChallengePortalUnlocked ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        }}
                      >
                        {isChallengePortalUnlocked ? '🔓' : '🔒'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Challenge Arena Gate</h3>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '100px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: isChallengePortalUnlocked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                              color: isChallengePortalUnlocked ? '#34d399' : '#f87171',
                              border: `1px solid ${isChallengePortalUnlocked ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                            }}
                          >
                            {isChallengePortalUnlocked ? '🟢 UNLOCKED & LIVE' : '🔴 LOCKED'}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {isChallengePortalUnlocked
                            ? 'The Arena is OPEN. Participants can view questions and submit volunteer passcodes in real-time.'
                            : 'The Arena is LOCKED. Participants see a locked standby screen while you setup matches.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn"
                      onClick={handleToggleChallengePortal}
                      disabled={isTogglingPortal}
                      style={{
                        padding: '12px 24px',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        background: isChallengePortalUnlocked
                          ? 'rgba(239, 68, 68, 0.25)'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                        color: isChallengePortalUnlocked ? '#fca5a5' : '#ffffff',
                        border: `1px solid ${isChallengePortalUnlocked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.5)'}`,
                        boxShadow: isChallengePortalUnlocked ? 'none' : '0 0 15px rgba(16, 185, 129, 0.35)',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {isTogglingPortal ? (
                        <span className="spinner" />
                      ) : isChallengePortalUnlocked ? (
                        '🔒 Lock Challenge Arena'
                      ) : (
                        '🔓 Unlock Arena for All Teams'
                      )}
                    </button>
                  </div>
                </div>

                {/* ── CREATE BATTLE CARD ── */}
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-header">
                    <h3>⚔️ Launch Head-to-Head / Triangular Match</h3>
                  </div>
                  <div className="card-body">
                    {chOk && <div className="alert alert-success">{chOk}</div>}
                    {chErr && <div className="alert alert-error">{chErr}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
                      <div className="form-row" style={{ margin: 0 }}>
                        <label>Team 1 (Required)</label>
                        <select value={chTeam1} onChange={(e) => setChTeam1(e.target.value)}>
                          <option value="">Select Team 1…</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id} disabled={t.id.toString() === chTeam2 || t.id.toString() === chTeam3}>
                              #{t.id} - {t.name} ({t.points || 0} pts)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ textAlign: 'center', paddingTop: '16px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--gold-light)', padding: '4px 10px', borderRadius: '100px', background: 'rgba(240,180,41,0.12)', border: '1px solid rgba(240,180,41,0.3)' }}>
                          VS
                        </span>
                      </div>

                      <div className="form-row" style={{ margin: 0 }}>
                        <label>Team 2 (Required)</label>
                        <select value={chTeam2} onChange={(e) => setChTeam2(e.target.value)}>
                          <option value="">Select Team 2…</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id} disabled={t.id.toString() === chTeam1 || t.id.toString() === chTeam3}>
                              #{t.id} - {t.name} ({t.points || 0} pts)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ textAlign: 'center', paddingTop: '16px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
                          VS
                        </span>
                      </div>

                      <div className="form-row" style={{ margin: 0 }}>
                        <label>Team 3 (Optional — 1v1v1)</label>
                        <select value={chTeam3} onChange={(e) => setChTeam3(e.target.value)}>
                          <option value="">(None - 1v1 Match)</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id} disabled={t.id.toString() === chTeam1 || t.id.toString() === chTeam2}>
                              #{t.id} - {t.name} ({t.points || 0} pts)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '16px' }}>
                      <label>Challenge Problem (Only Tagged CHALLENGE Problems)</label>
                      <select value={chQId} onChange={(e) => setChQId(e.target.value)}>
                        <option value="">Select challenge problem…</option>
                        {challengeQuestions.length > 0 ? (
                          challengeQuestions.map((q) => (
                            <option key={q.id} value={q.id}>
                              #{q.id} [{q.difficulty || 'HARD'}] {q.title}
                            </option>
                          ))
                        ) : (
                          questions.map((q) => (
                            <option key={q.id} value={q.id}>
                              #{q.id} [{q.difficulty || 'MEDIUM'}] {q.title}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div style={{ padding: '10px 14px', background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: '8px', marginBottom: '18px', fontSize: '0.84rem', color: '#ffe4a3', lineHeight: 1.5 }}>
                      ⚡ <strong>Challenge Arena Rules:</strong> The winning team earns <strong>100 points</strong> deducted from the losing team(s). When one team finishes and submits first with the volunteer passcode, all opponents will immediately see <em>"Team [Winner] already done!"</em>.
                    </div>

                    <button
                      className="btn btn-gold"
                      onClick={handleStartChallenge}
                      disabled={isStartingChallenge}
                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem' }}
                    >
                      {isStartingChallenge ? <span className="spinner" /> : chTeam3 ? '⚔️ Launch 1v1v1 Triangular Match' : '⚔️ Launch 1v1 Battle'}
                    </button>
                  </div>
                </div>

                {/* ── MATCHES HISTORY & REAL-TIME STATUS ── */}
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Challenge Battles & Live Matches</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      Total Matches: {challengeSessions.length}
                    </span>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>Match</th>
                            <th>Competing Teams</th>
                            <th>Problem</th>
                            <th>Status</th>
                            <th>Winner / Points Transfer</th>
                            <th style={{ width: '280px' }}>Admin Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {challengeSessions.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                                No challenge matches created yet. Pair teams above to launch a battle!
                              </td>
                            </tr>
                          ) : (
                            challengeSessions.map((s) => {
                              const isOngoing = s.status === 'ONGOING';
                              return (
                                <tr key={s.id}>
                                  <td><strong>#{s.id}</strong></td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <strong style={{ color: s.winner_team_id === s.team1_id ? '#10b981' : '#fff' }}>
                                        {s.team1_name}
                                      </strong>
                                      <span style={{ color: 'var(--gold-light)', fontWeight: 800, fontSize: '0.72rem' }}>VS</span>
                                      <strong style={{ color: s.winner_team_id === s.team2_id ? '#10b981' : '#fff' }}>
                                        {s.team2_name}
                                      </strong>
                                      {s.team3_id && (
                                        <>
                                          <span style={{ color: 'var(--gold-light)', fontWeight: 800, fontSize: '0.72rem' }}>VS</span>
                                          <strong style={{ color: s.winner_team_id === s.team3_id ? '#10b981' : '#fff' }}>
                                            {s.team3_name}
                                          </strong>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ color: 'var(--text-secondary)' }}>{s.question_title}</span>
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: '3px 9px',
                                        borderRadius: '100px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        background: isOngoing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        color: isOngoing ? '#f87171' : '#34d399',
                                        border: `1px solid ${isOngoing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                      }}
                                    >
                                      {isOngoing ? (s.team3_id ? '🔥 LIVE 1v1v1' : '🔥 LIVE 1v1') : '🏆 FINISHED'}
                                    </span>
                                  </td>
                                  <td>
                                    {s.winner_name ? (
                                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                                        🏆 {s.winner_name} (+100 pts)
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                                        100 pts at stake
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {isOngoing ? (
                                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        <button
                                          type="button"
                                          className="btn btn-expand"
                                          onClick={() => handleResolveChallenge(s.id, s.team1_id, s.team1_name)}
                                          title={`Declare ${s.team1_name} as winner (+100 pts)`}
                                          style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
                                        >
                                          ✓ {s.team1_name}
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-expand"
                                          onClick={() => handleResolveChallenge(s.id, s.team2_id, s.team2_name)}
                                          title={`Declare ${s.team2_name} as winner (+100 pts)`}
                                          style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
                                        >
                                          ✓ {s.team2_name}
                                        </button>
                                        {s.team3_id && (
                                          <button
                                            type="button"
                                            className="btn btn-expand"
                                            onClick={() => handleResolveChallenge(s.id, s.team3_id, s.team3_name)}
                                            title={`Declare ${s.team3_name} as winner (+100 pts)`}
                                            style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
                                          >
                                            ✓ {s.team3_name}
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Resolved</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
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
