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

  // Individual Volunteer Submit Modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [volunteerPass, setVolunteerPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const solvedCount = questions.filter((q) => q.status === 'SOLVED').length;

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

  const handleVerifyQuestionSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!volunteerPass.trim()) {
      setSubmitError('Please enter the volunteer verification passcode.');
      return;
    }
    if (!selectedQuestion) return;
    setIsSubmitting(true);
    try {
      const res = await api.verifyMainQuestion(selectedQuestion.id, volunteerPass.trim());
      setSubmitResult(res);
      if (res.team_points != null) {
        updateTeamData({ points: res.team_points });
      }
      addToast(res.message || 'Question successfully verified! Points awarded.', 'success');
      await fetchQuestions();
    } catch (err) {
      setSubmitError(err.message || 'Verification failed. Invalid passcode.');
    } finally {
      setIsSubmitting(false);
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

  const getSubtypeLabel = (q) => {
    if (!q) return 'MAIN';
    if (q.sub_type === 'DEBUGGING' || q.id <= 120) return 'DEBUGGING (2,000 PTS)';
    if (q.sub_type === 'MATH' || (q.id > 120 && q.id <= 220)) return 'MATH (2,000 PTS)';
    return 'CODING (3,000 PTS)';
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BackgroundLayers />

      <div className="page">
        {!team ? (
          /* ── LOGIN VIEW ── */
          <div id="login-view">
            <div className="login-box">
              <div className="login-icon">
                <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h2>Main Coding Arena</h2>
              <p className="login-sub">
                Enter your assigned Team Credentials to unlock your 3-question set.
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
                  <label htmlFor="passcode">Team Passcode</label>
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
              {loginErr && <div className="err-msg show" id="err-msg">{loginErr}</div>}
              <div className="back-link">
                <Link to="/hub">← Back to Hub</Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── ARENA VIEW ── */
          <div id="arena-view">
            <div className="topbar">
              <div className="topbar-inner">
                <div className="team-pill">
                  <div className="avatar" id="avatar">
                    {team.name ? team.name[0].toUpperCase() : 'T'}
                  </div>
                  <span className="tname" id="team-name-disp">
                    {team.name}
                  </span>
                </div>

                <div className="timer-pill" id="timer-pill">
                  <div className={`timer-digits ${timerClass}`} id="timer-digits">
                    {formatTimer(timerSeconds)}
                  </div>
                  <div className="timer-label">Time Remaining</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="stat-pill">
                    Points <b id="points">{team.points ?? 0}</b>
                  </span>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '100px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: solvedCount === questions.length && questions.length > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(240,180,41,0.15)',
                      color: solvedCount === questions.length && questions.length > 0 ? '#34d399' : '#ffe4a3',
                      border: `1px solid ${solvedCount === questions.length && questions.length > 0 ? 'rgba(16,185,129,0.35)' : 'rgba(240,180,41,0.3)'}`,
                    }}
                  >
                    {solvedCount}/{questions.length} Solved
                  </span>

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
                    <span className="panel-title">Assigned Problems</span>
                    <span className="hint">{questions.length} problems</span>
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
                            <span className="pts" style={{ color: isSolved ? '#34d399' : '#ffe4a3', fontWeight: 700 }}>
                              {isSolved ? '✓ SOLVED' : `${q.points || (q.id <= 220 ? 2000 : 3000)} pts`}
                            </span>
                          </div>
                          <div className="q-tab-title">{q.title}</div>
                          <div className="q-tab-meta">
                            <span>{q.difficulty || 'MEDIUM'}</span>
                            <span className={isSolved ? 'ok' : ''}>{isSolved ? 'Status: SOLVED' : 'Pending Verification'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Info Card */}
                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>
                    Submission Guidelines
                  </div>
                  <p style={{ fontSize: '.84rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                    Solve each problem in your local environment. Once ready, call a volunteer to verify and submit each question individually!
                  </p>
                </div>
              </div>

              {/* Right column: Problem statement */}
              <div className="problem-col">
                <div className="panel">
                  <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="panel-title">Problem Statement</span>
                      <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', color: '#ffe4a3', fontWeight: 600 }}>
                        {getSubtypeLabel(selectedQuestion)}
                      </span>
                    </div>
                    <span className="stat-pill">
                      <b id="q-points">{selectedQuestion?.points || (selectedQuestion?.id <= 220 ? 2000 : 3000)}</b> pts
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

                    {/* Individual Question Action Bar */}
                    <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        {selectedQuestion?.status === 'SOLVED' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontWeight: 700, fontSize: '0.92rem' }}>
                            ✓ Verified & Solved (+{selectedQuestion?.points || (selectedQuestion?.id <= 220 ? 2000 : 3000)} PTS)
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                            Ready to submit this solution? Call your volunteer.
                          </span>
                        )}
                      </div>

                      {selectedQuestion?.status !== 'SOLVED' && (
                        <button
                          type="button"
                          className="btn-login"
                          style={{ padding: '12px 24px', width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem' }}
                          onClick={() => {
                            setSubmitError('');
                            setVolunteerPass('');
                            setSubmitResult(null);
                            setShowSubmitModal(true);
                          }}
                        >
                          ★ Volunteer Verify & Submit (+{selectedQuestion?.points || (selectedQuestion?.id <= 220 ? 2000 : 3000)} PTS)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── INDIVIDUAL VOLUNTEER SUBMIT MODAL ── */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowSubmitModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowSubmitModal(false)}
              disabled={isSubmitting}
            >
              ✕
            </button>

            {submitResult ? (
              /* Success Result View */
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h2 style={{ fontSize: '1.6rem', color: '#6ee7b7', marginBottom: '8px' }}>
                  Question Verified & Solved!
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '.88rem', marginBottom: '20px' }}>
                  {submitResult.message || `Problem #${selectedQuestion?.id} successfully submitted.`}
                </p>

                <div className="total-award-banner">
                  <div className="total-award-title">Points Awarded for this Question</div>
                  <div className="total-award-pts">+{submitResult.points_awarded || selectedQuestion?.points || 2000} PTS</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 18px', borderRadius: '12px', marginBottom: '24px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Updated Team Balance: </span>
                  <strong style={{ color: '#ffe4a3', fontSize: '1.1rem' }}>{submitResult.team_points} PTS</strong>
                </div>

                <button
                  className="btn-login"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSubmitResult(null);
                  }}
                >
                  Continue Coding
                </button>
              </div>
            ) : (
              /* Volunteer Passcode Input */
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🛡️</div>
                  <h2 style={{ fontSize: '1.45rem', marginBottom: '6px' }}>
                    Volunteer Verification
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
                    Verify solution for: <strong style={{ color: '#fff' }}>{selectedQuestion?.title}</strong>
                  </p>
                </div>

                <div className="total-award-banner" style={{ marginBottom: '20px' }}>
                  <div className="total-award-title">Reward on Verification</div>
                  <div className="total-award-pts">
                    +{selectedQuestion?.points || (selectedQuestion?.id <= 220 ? 2000 : 3000)} PTS
                  </div>
                </div>

                <form onSubmit={handleVerifyQuestionSubmit}>
                  <div className="inp-wrap">
                    <label htmlFor="volunteer-pass">Volunteer Passcode</label>
                    <input
                      type="password"
                      id="volunteer-pass"
                      placeholder="Enter volunteer passcode"
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
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-login"
                      style={{ padding: '12px' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Verifying…' : 'Confirm & Award PTS'}
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
