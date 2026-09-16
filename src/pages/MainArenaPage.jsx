import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const MainArenaPage = () => {
  const navigate = useNavigate();
  const { team, updateTeamData, loginTeam, logoutTeam } = useAuth();
  const { addToast } = useToast();

  // Login form state
  const [teamName, setTeamName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Arena state
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(null);

  // Volunteer Final Submit Modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [volunteerPass, setVolunteerPass] = useState('');
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  const fetchQuestions = async () => {
    try {
      const data = await api.getQuestions();
      setQuestions(data || []);
      if (data && data.length > 0 && !selectedQuestionId) {
        setSelectedQuestionId(data[0].id);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch questions', 'error');
    }
  };

  // Clock sync
  useEffect(() => {
    if (!team) return;
    fetchQuestions();

    const syncClock = async () => {
      try {
        const res = await api.getClock();
        if (res?.seconds_remaining != null) {
          setTimerSeconds(res.seconds_remaining);
        }
      } catch (_) {}
    };

    syncClock();
    const clockInterval = setInterval(syncClock, 30000);
    return () => clearInterval(clockInterval);
  }, [team]);

  // Clock tick
  useEffect(() => {
    if (timerSeconds == null || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const selectedQuestion =
    questions.find((q) => q.id === selectedQuestionId) || questions[0];

  const isAllSolved =
    questions.length > 0 && questions.every((q) => q.status === 'SOLVED');

  const remainingMins = Math.max(0, Math.floor((timerSeconds || 0) / 60));
  const estTimeBonus = remainingMins * 10;
  const estTotalAward = 1000 + estTimeBonus;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');
    if (!teamName || !passcode) {
      setLoginErr('Please enter team name and passcode.');
      return;
    }
    setIsLoggingIn(true);
    try {
      await loginTeam(teamName, passcode);
    } catch (err) {
      setLoginErr(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!volunteerPass.trim()) {
      setSubmitError('Please enter the volunteer verification passcode.');
      return;
    }
    setIsSubmittingFinal(true);
    try {
      const res = await api.finalSubmit(volunteerPass.trim());
      setSubmitResult(res);
      if (res.team_points != null) {
        updateTeamData({ points: res.team_points });
      }
      addToast('Challenge successfully verified & submitted! Points awarded.', 'success');
      await fetchQuestions();
    } catch (err) {
      setSubmitError(err.message || 'Verification failed. Invalid passcode.');
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  const formatTimer = (sec) => {
    if (sec == null) return '--:--:--';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  const timerClass =
    timerSeconds == null || timerSeconds > 600
      ? 'timer-green'
      : timerSeconds > 180
      ? 'timer-yellow'
      : 'timer-red';

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BackgroundLayers />

      <div className="page">
        {/* ── LOGIN VIEW ── */}
        {!team ? (
          <div id="login-view">
            <div className="login-box">
              <div className="login-icon">
                <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h2>Main Arena</h2>
              <p className="login-sub">
                Enter your team credentials to start your countdown.
              </p>

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

                <button type="submit" className="btn-login" id="btn-login" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Authenticating…' : 'Start Challenge →'}
                </button>
              </form>

              {loginErr && <div className="err-msg show" id="login-err">{loginErr}</div>}

              <div className="back-link">
                <Link to="/hub">← Back to Hub</Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── ARENA VIEW ── */
          <div id="arena-view" style={{ display: 'block' }}>
            {/* Sticky topbar */}
            <div className="topbar">
              <div className="topbar-inner">
                <div className="team-pill">
                  <div className="avatar" id="avatar">
                    {team.name ? team.name[0].toUpperCase() : 'T'}
                  </div>
                  <span className="tname" id="tname">
                    {team.name}
                  </span>
                </div>

                <div className="timer-block">
                  <div id="timer" className={timerClass}>
                    {formatTimer(timerSeconds)}
                  </div>
                  <div className="timer-label">Time Remaining</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="stat-pill">
                    Points <b id="points">{team.points ?? 0}</b>
                  </span>
                  {(team.extra_time_seconds ?? 0) > 0 && (
                    <span className="extra-badge" id="extra-badge">
                      +{team.extra_time_seconds}s bonus
                    </span>
                  )}

                  {/* Final Submit Button */}
                  <button
                    className={`btn-final-submit ${isAllSolved ? 'completed' : ''}`}
                    id="btn-final-submit"
                    onClick={() => {
                      setSubmitError('');
                      setVolunteerPass('');
                      setShowSubmitModal(true);
                    }}
                  >
                    {isAllSolved ? '✓ Verified & Completed' : '★ Final Volunteer Submit'}
                  </button>

                  <button className="btn-logout" id="btn-logout" onClick={logoutTeam}>
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="arena-grid">
              {/* Left column: Question tabs */}
              <div className="questions-col">
                <div className="panel">
                  <div className="panel-head">
                    <span className="panel-title">Questions</span>
                    <span className="hint">{questions.length} problem{questions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="q-tabs" id="q-tabs">
                    {questions.map((q) => {
                      const isActive = q.id === selectedQuestion?.id;
                      const isSolved = q.status === 'SOLVED';
                      return (
                        <div
                          key={q.id}
                          className={`q-tab ${isActive ? 'active' : ''} ${isSolved ? 'solved' : ''}`}
                          onClick={() => setSelectedQuestionId(q.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="q-tab-top">
                            <span className={`badge badge-${(q.sub_type === 'LEETCODE' ? 'coding' : q.sub_type)?.toLowerCase() || 'main'}`}>
                              {q.sub_type === 'LEETCODE' ? 'CODING' : (q.sub_type || 'MAIN')}
                            </span>
                            <span className="pts">{isSolved ? '✓ SOLVED' : `${q.points} pts`}</span>
                          </div>
                          <div className="q-tab-title">{q.title}</div>
                          <div className="q-tab-meta">
                            <span>{q.difficulty}</span>
                            <span className={isSolved ? 'ok' : ''}>{isSolved ? 'Status: SOLVED' : `best: ${q.best_score || 0}`}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Final Submit Side Banner */}
                <div className="panel" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
                    Round Submission
                  </div>
                  <p style={{ fontSize: '.84rem', color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.5 }}>
                    Finished all 3 questions? Call your volunteer to verify your code and enter their verification code.
                  </p>
                  <button
                    className={`btn-final-submit ${isAllSolved ? 'completed' : ''}`}
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setSubmitError('');
                      setVolunteerPass('');
                      setShowSubmitModal(true);
                    }}
                  >
                    {isAllSolved ? '✓ Round Completed' : '★ Final Volunteer Submit'}
                  </button>
                </div>
              </div>

              {/* Right column: Problem statement */}
              <div className="problem-col">
                <div className="panel">
                  <div className="panel-head">
                    <span className="panel-title">Problem Statement</span>
                    <span className="stat-pill">
                      <b id="q-points">{selectedQuestion?.points || 0}</b> pts
                    </span>
                  </div>
                  <div className="problem-body">
                    <div className="problem-title" id="q-title">
                      {selectedQuestion?.title || '—'}
                    </div>
                    <div className="problem-desc" id="q-desc">
                      {selectedQuestion?.description || ''}
                    </div>

                    {selectedQuestion?.visible_tests?.length > 0 && (
                      <>
                        <div className="section-label">Sample Tests</div>
                        <div id="q-samples">
                          {selectedQuestion.visible_tests.map((tc, idx) => (
                            <div className="sample-box" key={tc.id || idx}>
                              <div className="sample-head">Sample #{idx + 1}</div>
                              <div className="sample-grid">
                                <div>
                                  <div className="sample-lbl">Input (stdin)</div>
                                  <pre className="sample-code">{tc.stdin || '<empty>'}</pre>
                                </div>
                                <div>
                                  <div className="sample-lbl">Expected Output</div>
                                  <pre className="sample-code">{tc.expected_output || '<empty>'}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── VOLUNTEER FINAL SUBMIT MODAL ── */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => !isSubmittingFinal && setShowSubmitModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowSubmitModal(false)}
              disabled={isSubmittingFinal}
            >
              ✕
            </button>

            {submitResult ? (
              /* Success Result View */
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h2 style={{ fontSize: '1.6rem', color: '#6ee7b7', marginBottom: '8px' }}>
                  Challenge Verified & Solved!
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '.88rem', marginBottom: '20px' }}>
                  All 3 questions have been verified and marked as solved.
                </p>

                <div className="total-award-banner">
                  <div className="total-award-title">Total Score Awarded</div>
                  <div className="total-award-pts">+{submitResult.total_awarded} PTS</div>
                </div>

                <div className="score-breakdown-grid">
                  <div className="score-cell">
                    <div className="score-cell-val">+{submitResult.completion_points}</div>
                    <div className="score-cell-lbl">Completion Base</div>
                  </div>
                  <div className="score-cell">
                    <div className="score-cell-val">+{submitResult.time_bonus}</div>
                    <div className="score-cell-lbl">Time Bonus ({submitResult.remaining_minutes}m × 10)</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 18px', borderRadius: '12px', marginBottom: '24px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Current Team Balance: </span>
                  <strong style={{ color: '#ffe4a3', fontSize: '1.1rem' }}>{submitResult.team_points} PTS</strong>
                </div>

                <button
                  className="btn-login"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSubmitResult(null);
                    navigate('/');
                  }}
                >
                  Return to Landing Page
                </button>
              </div>
            ) : (
              /* Volunteer Password Input & Score Preview */
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🛡️</div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>
                    Volunteer Verification
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
                    Have a volunteer check all 3 solutions. Enter verification passcode to claim points and submit.
                  </p>
                </div>

                <div className="score-breakdown-grid">
                  <div className="score-cell">
                    <div className="score-cell-val">+1,000</div>
                    <div className="score-cell-lbl">3-Problem Completion</div>
                  </div>
                  <div className="score-cell">
                    <div className="score-cell-val">+{estTimeBonus}</div>
                    <div className="score-cell-lbl">Time Bonus ({remainingMins}m × 10)</div>
                  </div>
                </div>

                <div className="total-award-banner">
                  <div className="total-award-title">Estimated Award on Submit</div>
                  <div className="total-award-pts">+{estTotalAward} PTS</div>
                </div>

                <form onSubmit={handleFinalSubmit}>
                  <div className="inp-wrap">
                    <label htmlFor="volunteer-pass">Volunteer / Team Passcode</label>
                    <input
                      type="password"
                      id="volunteer-pass"
                      placeholder="Enter verification passcode"
                      autoComplete="off"
                      autoFocus
                      value={volunteerPass}
                      onChange={(e) => setVolunteerPass(e.target.value)}
                    />
                  </div>

                  {submitError && (
                    <div className="err-msg show" style={{ marginBottom: '16px' }}>
                      {submitError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <button
                      type="button"
                      className="btn-logout"
                      style={{ padding: '12px' }}
                      onClick={() => setShowSubmitModal(false)}
                      disabled={isSubmittingFinal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-login"
                      style={{ padding: '12px' }}
                      disabled={isSubmittingFinal}
                    >
                      {isSubmittingFinal ? 'Verifying…' : 'Confirm & Submit'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
