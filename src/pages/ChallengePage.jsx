import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const ChallengePage = () => {
  const { team, loginTeam, logoutTeam } = useAuth();
  const { addToast } = useToast();

  const [teamName, setTeamName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('description');

  // Submission state
  const [volunteerPass, setVolunteerPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitErr, setSubmitErr] = useState('');

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
      const interval = setInterval(checkChallenge, 3000);
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

  const handleSubmit1v1 = async (e) => {
    if (e) e.preventDefault();
    setSubmitErr('');
    setSubmitResult(null);

    if (!activeSession) return;
    if (!volunteerPass.trim()) {
      setSubmitErr('Please enter the volunteer verification passcode.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitChallenge1v1(team.id, {
        session_id: activeSession.id,
        passcode: volunteerPass.trim(),
      });

      if (res.already_done) {
        setSubmitResult(res);
        addToast(res.message || `Team ${res.winner_name} already done!`, 'error');
      } else {
        setSubmitResult(res);
        addToast(res.message || 'Victory! +100 points claimed!', 'success');
      }
      setVolunteerPass('');
      await checkChallenge();
    } catch (err) {
      const msg = err.message || 'Verification failed. Check passcode.';
      setSubmitErr(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOngoing = activeSession && activeSession.status === 'ONGOING';
  const isWinner = activeSession && (activeSession.is_winner || submitResult?.is_winner);
  const isAlreadyDone = activeSession && (activeSession.already_done || submitResult?.already_done);

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
              <h2>1v1 Challenge Arena</h2>
              <p className="login-sub">Log in to participate in assigned 1v1 head-to-head matches.</p>
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
                  Enter 1v1 Arena
                </button>
              </form>
              {errMsg && <div className="err-msg show" id="err-msg">{errMsg}</div>}
              <div className="back-link">
                <Link to="/hub">← Back to Hub</Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── 1v1 CHALLENGE VIEW ── */
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
                  <span style={{ color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.8rem', marginLeft: '6px' }}>
                    ({team.points || 0} pts)
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
                  &nbsp;1v1 Head-to-Head Arena
                </span>
                <button className="btn-logout" onClick={logoutTeam}>
                  Logout
                </button>
              </div>
            </div>

            {!activeSession ? (
              /* ── WAITING / NO 1v1 MATCH ── */
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
                <div className="lock-title">Awaiting 1v1 Matchmaking</div>
                <p className="lock-sub">
                  Your team is in the arena! When the Admin pairs your team against an opponent in a 1v1 battle, this page will instantly activate.
                </p>
                <div className="poll-indicator">
                  <div className="poll-dot" />
                  <span>Checking for assigned 1v1 match every 3 seconds…</span>
                </div>
              </div>
            ) : (
              /* ── 1v1 BATTLE VIEW ── */
              <div id="active-state" style={{ display: 'block' }}>
                <div className="wrap">
                  {/* ── VS BANNER ── */}
                  <div
                    className="challenge-banner"
                    style={{
                      background: isWinner
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 78, 59, 0.45))'
                        : isAlreadyDone
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(127, 29, 29, 0.45))'
                        : undefined,
                      borderColor: isWinner ? 'rgba(16, 185, 129, 0.4)' : isAlreadyDone ? 'rgba(239, 68, 68, 0.4)' : undefined,
                    }}
                  >
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0 }}>
                          {isWinner ? '🏆 VICTORY!' : isAlreadyDone ? '⚠️ MATCH FINISHED' : '🔥 1v1 BATTLE IS LIVE!'}
                        </h2>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: isWinner ? 'rgba(16,185,129,0.2)' : isAlreadyDone ? 'rgba(239,68,68,0.2)' : 'rgba(240,180,41,0.2)',
                            color: isWinner ? '#34d399' : isAlreadyDone ? '#f87171' : '#ffe4a3',
                          }}
                        >
                          {isWinner
                            ? 'YOU WON'
                            : isAlreadyDone
                            ? `${activeSession.winner_name || activeSession.opponent_name} WON`
                            : 'HEAD-TO-HEAD'}
                        </span>
                      </div>

                      <p style={{ marginTop: '6px', fontSize: '0.92rem' }}>
                        {isWinner ? (
                          <strong style={{ color: '#34d399' }}>
                            Your team solved the problem first! +100 points won from {activeSession.opponent_name}.
                          </strong>
                        ) : isAlreadyDone ? (
                          <strong style={{ color: '#f87171' }}>
                            Team {activeSession.winner_name || activeSession.opponent_name} already done! 100 points transferred to them.
                          </strong>
                        ) : (
                          <>
                            <strong>{team.name}</strong> <span style={{ color: 'var(--gold-light)' }}>VS</span> <strong>{activeSession.opponent_name}</strong>. First team to complete and verify wins 100 points from the opponent!
                          </>
                        )}
                      </p>
                    </div>

                    <div className="cb-reward">
                      <div className="r-val" style={{ color: isWinner ? '#34d399' : isAlreadyDone ? '#f87171' : 'var(--gold-light)' }}>
                        {isWinner ? '+100' : isAlreadyDone ? '-100' : '100'}
                      </div>
                      <div className="r-label">Points Stake</div>
                    </div>
                  </div>

                  {/* ── ALREADY DONE ALERT BANNER ── */}
                  {isAlreadyDone && (
                    <div
                      style={{
                        margin: '18px 0',
                        padding: '16px 20px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                      <div>
                        <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: '1.05rem' }}>
                          Team {activeSession.winner_name || activeSession.opponent_name} already completed this challenge!
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                          The 1v1 battle has ended. 100 points were transferred from your score to {activeSession.winner_name || activeSession.opponent_name}.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── VICTORY BANNER ── */}
                  {isWinner && (
                    <div
                      style={{
                        margin: '18px 0',
                        padding: '16px 20px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '1.6rem' }}>🏆</span>
                      <div>
                        <div style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '1.05rem' }}>
                          Victory! Your team claimed 1st place in this 1v1 battle!
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                          +100 points have been successfully added to your team leaderboard score.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── QUESTION CARD ── */}
                  <div className="q-card" style={{ display: 'block' }}>
                    <div className="q-header">
                      <div className="q-meta">
                        <span className="badge badge-challenge">1v1 Challenge</span>
                        <span className="badge badge-hard">100 Pts Stake</span>
                      </div>
                      <div className="q-title">
                        {activeSession.title || `1v1 Challenge Problem #${activeSession.question_id}`}
                      </div>
                    </div>

                    <div className="tabs">
                      <div className={`tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>
                        Problem Statement
                      </div>
                    </div>

                    <div className="tab-content active">
                      <pre className="desc-text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'inherit' }}>
                        {activeSession.description || `Solve this problem before ${activeSession.opponent_name} to win!`}
                      </pre>
                    </div>
                  </div>

                  {/* ── SUBMISSION & VOLUNTEER PASSCODE VERIFICATION ── */}
                  <div className="q-card" style={{ marginTop: '20px', display: 'block' }}>
                    <div className="q-header">
                      <div className="q-title" style={{ fontSize: '1.1rem' }}>
                        {isOngoing ? '🛡️ Volunteer Verification & Submission' : 'Match Resolution'}
                      </div>
                    </div>

                    <div style={{ padding: '20px' }}>
                      {isOngoing ? (
                        <>
                          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '0 0 16px', lineHeight: 1.5 }}>
                            Finished your code? Demonstrate the solution to your room volunteer. They will enter their passcode below to verify and declare your victory immediately.
                          </p>

                          {submitErr && (
                            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                              {submitErr}
                            </div>
                          )}

                          <form onSubmit={handleSubmit1v1} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                              type="password"
                              placeholder="Volunteer Passcode (e.g. 1234)"
                              value={volunteerPass}
                              onChange={(e) => setVolunteerPass(e.target.value)}
                              disabled={isSubmitting}
                              style={{
                                flex: '1 1 240px',
                                padding: '12px 16px',
                                background: 'rgba(0,0,0,0.35)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.95rem',
                              }}
                            />
                            <button
                              type="submit"
                              className="btn btn-gold"
                              disabled={isSubmitting || !volunteerPass}
                              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                            >
                              {isSubmitting ? <span className="spinner" /> : '⚔️ Submit & Claim Victory'}
                            </button>
                          </form>
                        </>
                      ) : isWinner ? (
                        <div style={{ color: '#10b981', fontWeight: 700 }}>
                          ✓ This 1v1 battle was won by your team. Score updated!
                        </div>
                      ) : (
                        <div style={{ color: '#ef4444', fontWeight: 700 }}>
                          ✗ Team {activeSession.winner_name || activeSession.opponent_name} completed first.
                        </div>
                      )}
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

