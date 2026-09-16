import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ClockPill } from '../arena/ClockPill';
import { Trophy, LogOut, Shield, Zap, Sparkles } from 'lucide-react';

export const Navbar = ({ showClock = false }) => {
  const { team, logoutTeam, isAdmin, logoutAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (team) logoutTeam();
    if (isAdmin) logoutAdmin();
    navigate('/');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10, 12, 24, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '10px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <Link
          to="/hub"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.4rem',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}
            >
              MPL ARENA
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              ROUND 1 — CODE ARENA
            </div>
          </div>
        </Link>

        {/* Center Clock for Coding Arena */}
        {showClock && <ClockPill teamId={team?.id} />}

        {/* Right Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {team && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(25, 30, 60, 0.6)',
                  border: '1px solid var(--border-glass)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {team.name ? team.name[0].toUpperCase() : 'T'}
                </div>
                <span style={{ fontWeight: 600 }}>{team.name}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                <Trophy size={14} />
                <span>{team.points ?? 0} pts</span>
              </div>
            </div>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                padding: '5px 10px',
                borderRadius: '8px',
                color: '#c084fc',
                fontSize: '0.82rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <Shield size={14} />
              <span>Admin</span>
            </Link>
          )}

          {(team || isAdmin) && (
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '5px' }}
            >
              <LogOut size={13} />
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
