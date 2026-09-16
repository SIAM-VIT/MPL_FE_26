import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const BoostPage = () => {
  const { team, loginTeam, logoutTeam } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [boostQuestions, setBoostQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBoosts = async () => {
    if (!team) return;
    setLoading(true);
    try {
      const res = await api.getTeamStatus(team.id);
      setBoostQuestions(res?.assigned_time_boosts || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (team) fetchBoosts();
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
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h2>Bonus Bidding</h2>
              <p className="login-sub">Login to see your assigned time-boost questions and earn extra minutes.</p>
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
                  View My Boosts
                </button>
              </form>
              {errMsg && <div className="err-msg show" id="err-msg">{errMsg}</div>}
              <div className="back-link">
                <Link to="/hub">← Back to Hub</Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── BOOST VIEW ── */
          <div id="boost-view" style={{ display: 'block' }}>
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
                <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Time Boost Questions</span>
                <button className="btn-logout" onClick={logoutTeam}>
                  Logout
                </button>
              </div>
            </div>

            <div className="wrap">
              <div className="section-head">
                <h1>Bonus Bidding</h1>
                <p>Solve these questions to add bonus time to your main question countdown.</p>
              </div>

              <div className="time-earned-bar" id="teb" style={{ display: 'flex' }}>
                <div className="teb-icon">
                  <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="14" r="8" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="14" x2="12" y2="10" />
                    <line x1="12" y1="14" x2="15" y2="14" />
                  </svg>
                </div>
                <div className="teb-text">
                  <h3>Total Bonus Time Earned</h3>
                  <p>Awarded after admin reviews your submission</p>
                </div>
                <div className="teb-val" id="teb-val">+{team.extra_time_seconds || 0}s</div>
              </div>

              <div id="boost-list-wrap">
                {boostQuestions.length === 0 ? (
                  <div className="empty-state" id="empty-state" style={{ display: 'block' }}>
                    <div className="e-icon">
                      <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                      </svg>
                    </div>
                    <h3>No boost questions assigned</h3>
                    <p>The admin hasn't assigned any time-boost questions to your team yet.<br />Check back soon!</p>
                  </div>
                ) : (
                  <div className="boost-list" id="boost-list">
                    {boostQuestions.map((qid) => (
                      <div key={qid} className="boost-card">
                        <h3>Time Boost #{qid}</h3>
                        <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Question ID: {qid}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
