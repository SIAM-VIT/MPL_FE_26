import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const MainArenaPage = () => {
  const { team, loginTeam, logoutTeam } = useAuth();
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
        {/* â”€â”€ LOGIN VIEW â”€â”€ */}
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
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-login" id="btn-login" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Authenticatingâ€¦' : 'Start Challenge â†’'}
                </button>
              </form>

              {loginErr && <div className="err-msg show" id="login-err">{loginErr}</div>}

              <div className="back-link">
                <Link to="/hub">â† Back to Hub</Link>
              </div>
            </div>
          </div>
        ) : (
          /* â”€â”€ ARENA VIEW â”€â”€ */
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="stat-pill">
                    Points <b id="points">{team.points ?? 0}</b>
                  </span>
                  {(team.extra_time_seconds ?? 0) > 0 && (
                    <span className="extra-badge" id="extra-badge">
                      +{team.extra_time_seconds}s bonus
                    </span>
                  )}
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
                            <span className={`badge badge-${q.sub_type?.toLowerCase() || 'main'}`}>
                              {q.sub_type || 'MAIN'}
                            </span>
                            <span className="pts">{q.points} pts</span>
                          </div>
                          <div className="q-tab-title">{q.title}</div>
                          <div className="q-tab-meta">
                            <span>{q.difficulty}</span>
                            <span className="best-score">best: {q.best_score || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                      {selectedQuestion?.title || 'â€”'}
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
    </div>
  );
};
