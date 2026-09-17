import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const BoostPage = () => {
  const navigate = useNavigate();
  const { team, updateTeamData, loginTeam, logoutTeam } = useAuth();
  const { addToast } = useToast();

  const [teamName, setTeamName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [activeBoost, setActiveBoost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extraTime, setExtraTime] = useState(team?.extra_time_seconds || 0);

  // Volunteer Verification Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [volunteerPass, setVolunteerPass] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const fetchActiveBoost = async (showSpinner = false) => {
    if (!team?.id) return;
    if (showSpinner) setLoading(true);
    try {
      const [res, statusRes] = await Promise.allSettled([
        api.getActiveBoost(team.id),
        api.getTeamStatus(team.id),
      ]);

      if (res.status === 'fulfilled') {
        setActiveBoost(res.value?.active_boost || null);
      }
      if (statusRes.status === 'fulfilled' && statusRes.value?.team) {
        setExtraTime(statusRes.value.team.extra_time_seconds || 0);
      }
    } catch (err) {
      // ignore status fetch failure
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (team?.id) {
      fetchActiveBoost(true);
      const interval = setInterval(() => fetchActiveBoost(false), 10000);
      return () => clearInterval(interval);
    }
  }, [team?.id]);

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

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyErr('');
    if (!volunteerPass.trim()) {
      setVerifyErr('Please enter the volunteer verification passcode.');
      return;
    }
    if (!activeBoost) return;

    setIsVerifying(true);
    try {
      const res = await api.verifyBoost(team.id, activeBoost.id, volunteerPass.trim());
      setVerifyResult(res);
      if (res.extra_time_seconds != null) {
        setExtraTime(res.extra_time_seconds);
      }
      addToast(res.message || 'Bonus time successfully awarded!', 'success');
      await fetchActiveBoost(false);
    } catch (err) {
      setVerifyErr(err.message || 'Verification failed. Invalid passcode.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelBoost = async () => {
    if (!activeBoost) return;
    if (!window.confirm('Are you sure you want to forfeit and cancel this time boost? You will not earn bonus time for it.')) {
      return;
    }
    try {
      await api.cancelBoost(team.id, activeBoost.id);
      addToast('Time boost cancelled.', 'info');
      setActiveBoost(null);
      await fetchActiveBoost();
    } catch (err) {
      addToast(err.message || 'Failed to cancel boost.', 'error');
    }
  };

  const diffBadgeClass = (diff) => {
    const d = (diff || '').toUpperCase();
    if (d === 'EASY') return 'badge-easy';
    if (d === 'HARD') return 'badge-hard';
    return 'badge-medium';
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
              <p className="login-sub">Login to see your assigned time-boost question and earn extra countdown minutes.</p>
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
                  Enter Bidding Arena
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link to="/main" style={{ color: 'var(--muted)', fontSize: '.84rem', textDecoration: 'none' }}>
                    Main Arena ↗
                  </Link>
                  <button className="btn-logout" onClick={logoutTeam}>
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="wrap" style={{ maxWidth: '880px', margin: '0 auto', padding: '24px' }}>
              <div className="section-head" style={{ padding: '20px 0 16px' }}>
                <h1 style={{ fontSize: '2.2rem', marginBottom: '4px' }}>Bonus Bidding Arena</h1>
                <p style={{ color: 'var(--muted)', fontSize: '.92rem' }}>
                  Solve your bid question, demonstrate your code to a volunteer, and claim bonus countdown time!
                </p>
              </div>

              {/* Team Balance Bar */}
              <div className="time-earned-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: 'rgba(240,180,41,.10)', border: '1px solid rgba(240,180,41,.25)', borderRadius: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(240,180,41,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffe4a3' }}>
                    💰
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, marginBottom: '2px' }}>Current Team Score</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Live points balance (includes winning bids & solved rewards)</p>
                  </div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffe4a3', fontFamily: "'JetBrains Mono', monospace" }}>
                  {team.points ?? 0} PTS
                </div>
              </div>

              {/* Active Boost Card / Empty State */}
              {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
                  Loading bidding question status…
                </div>
              ) : activeBoost ? (
                <div className="q-card" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(0,0,0,.4)' }}>
                  <div className="q-header" style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', background: 'rgba(240,180,41,.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="badge badge-boost" style={{ background: 'rgba(240,180,41,.15)', color: '#ffe4a3', border: '1px solid rgba(240,180,41,.25)', padding: '3px 10px', borderRadius: '100px', fontSize: '.75rem', fontWeight: 700 }}>
                          BIDDING QUESTION
                        </span>
                        <span className={`badge ${diffBadgeClass(activeBoost.difficulty)}`} style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '.75rem', fontWeight: 700 }}>
                          {activeBoost.difficulty || 'MEDIUM'}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
                        {activeBoost.title}
                      </h2>
                    </div>

                    <div style={{ textAlign: 'right', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.25)', padding: '10px 18px', borderRadius: '14px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#6ee7b7', fontFamily: "'JetBrains Mono', monospace" }}>
                        +{activeBoost.difficulty === 'EASY' ? '500' : activeBoost.difficulty === 'HARD' ? '1,000' : '800'} PTS
                      </div>
                      <div style={{ fontSize: '.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                        Reward on Solve
                      </div>
                    </div>
                  </div>


                  <div style={{ padding: '28px' }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
                      Challenge Description
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '.95rem', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '24px' }}>
                      {activeBoost.description}
                    </div>

                    {activeBoost.sample_tests && activeBoost.sample_tests.length > 0 && (
                      <div style={{ marginBottom: '28px' }}>
                        <div style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
                          Sample Test Cases
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {activeBoost.sample_tests.map((tc, idx) => (
                            <div key={idx} style={{ background: 'rgba(0,0,0,.35)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '.82rem', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>INPUT:</span>
                                <span style={{ color: '#a5f3fc', whiteSpace: 'pre-wrap' }}>{tc.stdin || '<empty>'}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '.82rem', fontFamily: "'JetBrains Mono', monospace' " }}>
                                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>EXPECTED:</span>
                                <span style={{ color: '#86efac', whiteSpace: 'pre-wrap' }}>{tc.expected_output || '<empty>'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        onClick={handleCancelBoost}
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', padding: '12px 20px', borderRadius: '12px', fontSize: '.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                      >
                        ✕ Forfeit / Cancel Boost
                      </button>

                      <button
                        type="button"
                        className="btn-login"
                        onClick={() => {
                          setVerifyErr('');
                          setVolunteerPass('');
                          setShowVerifyModal(true);
                        }}
                        style={{ padding: '12px 28px', fontSize: '.92rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        ★ Volunteer Verification & Submit
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state when no boost is assigned */
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '60px 40px', textAlign: 'center', backdropFilter: 'blur(20px)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '14px' }}>⏱️</div>
                  <h3 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '8px' }}>
                    No Active Time Boost
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: '.92rem', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                    You currently have no active bonus bidding question assigned. Request your event admin or bidding coordinator to assign your team an <strong>Easy (+5m)</strong>, <strong>Medium (+10m)</strong>, or <strong>Hard (+15m)</strong> challenge!
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={fetchActiveBoost}
                      className="btn-logout"
                      style={{ padding: '10px 22px', fontSize: '.88rem' }}
                    >
                      🔄 Refresh Status
                    </button>
                    <Link to="/hub" className="btn-login" style={{ padding: '10px 24px', fontSize: '.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      ← Back to Hub
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── VOLUNTEER VERIFICATION MODAL ── */}
      {showVerifyModal && (
        <div className="modal-overlay" onClick={() => !isVerifying && setShowVerifyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowVerifyModal(false)}
              disabled={isVerifying}
            >
              ✕
            </button>

            {verifyResult ? (
              /* Success Celebration */
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3.2rem', marginBottom: '10px' }}>⚡🎉</div>
                <h2 style={{ fontSize: '1.6rem', color: '#6ee7b7', marginBottom: '8px' }}>
                  Bonus Time Awarded!
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '.88rem', marginBottom: '20px' }}>
                  Your time boost has been verified by the volunteer.
                </p>

                <div className="total-award-banner" style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)', borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, letterSpacing: '.08em', marginBottom: '4px' }}>Time Added to Clock</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6ee7b7', fontFamily: "'JetBrains Mono', monospace" }}>
                    +{verifyResult.reward_minutes} MINUTES (+{verifyResult.reward_seconds}s)
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 18px', borderRadius: '12px', marginBottom: '24px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Total Cumulative Bonus Time: </span>
                  <strong style={{ color: '#ffe4a3', fontSize: '1.1rem' }}>+{verifyResult.extra_time_seconds}s</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Link
                    to="/hub"
                    className="btn-logout"
                    style={{ padding: '12px', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Back to Hub
                  </Link>
                  <Link
                    to="/main"
                    className="btn-login"
                    style={{ padding: '12px', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Go to Main Arena →
                  </Link>
                </div>
              </div>
            ) : (
              /* Passcode Form */
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🛡️</div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>
                    Volunteer Verification
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
                    Show your solved solution to the volunteer. Enter the volunteer passcode to claim <strong>+{activeBoost?.reward_minutes} minutes</strong> on your team clock.
                  </p>
                </div>

                <form onSubmit={handleVerifySubmit}>
                  <div className="inp-wrap">
                    <label htmlFor="volunteer-pass">Volunteer / Admin Passcode</label>
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

                  {verifyErr && (
                    <div className="err-msg show" style={{ marginBottom: '16px' }}>
                      {verifyErr}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <button
                      type="button"
                      className="btn-logout"
                      style={{ padding: '12px' }}
                      onClick={() => setShowVerifyModal(false)}
                      disabled={isVerifying}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-login"
                      style={{ padding: '12px' }}
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Verifying…' : 'Confirm & Claim Time'}
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
