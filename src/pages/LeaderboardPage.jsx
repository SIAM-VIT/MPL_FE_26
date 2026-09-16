import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Starfield } from '../components/common/Starfield';
import { Trophy, Medal, RotateCcw, Clock, Sparkles } from 'lucide-react';

export const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchScoreboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data || []);
      setLastUpdated(new Date());
    } catch (_) {}
  };

  useEffect(() => {
    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Starfield />
      <Navbar />

      <main style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', margin: '0 auto', padding: '40px 24px', flex: 1, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Trophy size={28} color="#fbbf24" />
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>
                Live Standings
              </h1>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.92rem' }}>
              Auto-refreshing live scoreboard. Ranked by points and submission velocity.
            </p>
          </div>

          <button onClick={fetchScoreboard} className="btn-secondary" style={{ gap: '6px', fontSize: '0.85rem' }}>
            <RotateCcw size={14} />
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          </button>
        </div>

        {/* Podium Top 3 (if teams exist) */}
        {leaderboard.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {/* Rank 2 */}
            <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', borderTop: '3px solid #94a3b8' }}>
              <Medal size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>2ND PLACE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '6px 0', color: '#f8fafc' }}>
                {leaderboard[1].team_name || leaderboard[1].name}
              </div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399' }}>
                {leaderboard[1].total_points || leaderboard[1].points || 0} pts
              </div>
            </div>

            {/* Rank 1 */}
            <div className="glass-card" style={{ padding: '28px 16px', textAlign: 'center', borderTop: '3px solid #fbbf24', background: 'radial-gradient(circle at top, rgba(245, 158, 11, 0.15), rgba(15, 18, 35, 0.8))', transform: 'scale(1.04)' }}>
              <Trophy size={34} color="#fbbf24" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 700 }}>1ST PLACE LEADER</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, margin: '6px 0', color: '#f8fafc' }}>
                {leaderboard[0].team_name || leaderboard[0].name}
              </div>
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fbbf24' }}>
                {leaderboard[0].total_points || leaderboard[0].points || 0} pts
              </div>
            </div>

            {/* Rank 3 */}
            <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', borderTop: '3px solid #d97706' }}>
              <Medal size={28} color="#d97706" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 700 }}>3RD PLACE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '6px 0', color: '#f8fafc' }}>
                {leaderboard[2].team_name || leaderboard[2].name}
              </div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399' }}>
                {leaderboard[2].total_points || leaderboard[2].points || 0} pts
              </div>
            </div>
          </div>
        )}

        {/* Full Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: 'rgba(10, 13, 26, 0.7)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '14px 20px', width: '80px' }}>Rank</th>
                <th style={{ padding: '14px 20px' }}>Team Name</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((team, idx) => (
                <tr key={team.team_id || idx} style={{ borderTop: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : '#94a3b8' }}>
                    #{idx + 1}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#f8fafc' }}>
                    {team.team_name || team.name}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>
                    {team.total_points || team.points || 0} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
