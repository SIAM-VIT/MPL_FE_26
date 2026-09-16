import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const ChallengePage = () => {
  const { team, loginTeam, logoutTeam } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('description');

  const checkChallenge = async () => {
    if (!team) return;
    try {
      const res = await api.getTeamStatus(team.id);
      setActiveSession(res?.active_challenge_session || null);
    } catch (_) {}
  };

  useEffect(() => {
    if (team) {
      checkChallenge();
      const interval = setInterval(checkChallenge, 5000);
      return () => clearInterval(interval);
    }
  }, [team]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrMsg('');
    if (!teamName || !passcode) {
      setErrMsg('Please enter team name and passcode.');
      return;
    }
    try {
      await loginTeam(teamName, passcode);
    } catch (err) {
      setErrMsg(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BackgroundLayers />

      <div className="page">
        {!team ? (
          /* ── LOGIN ── */
          <div id="login-view">
            <div className="login-box">
              <div className="login-icon">
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
              </div>
              <h2>Challenge Mode</h2>
              <p className="login-sub">Login and wait for admin to start a challenge session for your team.</p>
              <form onSubmit={handleLogin}>
                <div className="inp-wrap">
                  <label htmlFor="team-name">Team Name</label>
                  <input
                    type="text"
                    id="team-name"
                    placeholder="e.g. Team Alpha"
                    autoComplete="off"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
                <div className="inp-wrap">
                  <label htmlFor="passcode">Passcode</label>
                  <input
                    type="password"
                    id="passcode"
                    placeholder="••••••••"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-login" id="login-btn">
                  Enter Arena
                </button>
              </form>
              {errMsg && <div className="err-msg show" id="err-msg">{errMsg}</div>}
              <div className="back-link">
                <Link to="/hub">← Back to Hub</Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── CHALLENGE VIEW ── */
          <div id="challenge-view" style={{ display: 'block' }}>
            <div className="topbar">
              <div className="topbar-inner">
                <div className="team-pill">
                  <div className="avatar" id="team-avatar">
                    {team.name ? team.name[0].toUpperCase() : 'T'}
                  </div>
                  <span className="tname" id="team-name-display">
                    {team.name}
                  </span>
                </div>
                <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
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
                  &nbsp;Challenge Arena
                </span>
                <button className="btn-logout" onClick={logoutTeam}>
                  Logout
                </button>
              </div>
            </div>

            {!activeSession ? (
              /* ── LOCKED / WAITING state ── */
              <div id="locked-state" style={{ display: 'block' }}>
                <div className="lock-anim">
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
                </div>
                <div className="lock-title">Awaiting Challenge</div>
                <p className="lock-sub">
                  You're in the arena — now wait for the admin to start a challenge session for your team.
                  This page will automatically unlock when your challenge begins.
                </p>
                <div className="poll-indicator">
                  <div className="poll-dot" />
                  <span>Checking for active challenge every 5 seconds…</span>
                </div>
              </div>
            ) : (
              /* ── ACTIVE CHALLENGE state ── */
              <div id="active-state" style={{ display: 'block' }}>
                <div className="wrap">
                  <div className="challenge-banner" id="challenge-banner">
                    <div className="cb-icon">
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
                    </div>
                    <div className="cb-text">
                      <h2>Challenge is LIVE!</h2>
                      <p id="challenge-sub">Solve the question below. First team to finish wins!</p>
                    </div>
                    <div className="cb-reward" id="reward-box">
                      <div className="r-val" id="reward-val">500</div>
                      <div className="r-label">Bonus Points</div>
                    </div>
                  </div>

                  <div className="q-card" id="q-card" style={{ display: 'block' }}>
                    <div className="q-header">
                      <div className="q-meta">
                        <span className="badge badge-challenge">Challenge</span>
                        <span className="badge badge-hard" id="diff-badge">Hard</span>
                      </div>
                      <div className="q-title" id="q-title">Battle Question #{activeSession.question_id}</div>
                    </div>
                    <div className="tabs">
                      <div className={`tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>
                        Problem Statement
                      </div>
                    </div>
                    <div className="tab-content active" id="tab-description">
                      <pre className="desc-text" id="q-desc">
                        Solve Question #{activeSession.question_id} in the Main Arena or submit here.
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
