import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface ArenaGatewayProps {
  gatewayRef: React.RefObject<HTMLDivElement>;
}

// Act IV finale: the film performs NO authentication. It simply hands the
// visitor off to the arena hub (sibling index.html), which owns team login.
const HUB_URL = '../index.html';
const ADMIN_URL = '../admin.html';
const LOGO_URL = `${import.meta.env.BASE_URL}mpl_logo.png`;

export const ArenaGateway: React.FC<ArenaGatewayProps> = ({ gatewayRef }) => {
  const enterArena = () => {
    window.location.href = HUB_URL;
  };

  return (
    <div
      ref={gatewayRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        opacity: 0,
        pointerEvents: 'none',
        transform: 'translateY(30px)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '24px',
          padding: '28px 26px 22px 26px',
          background: 'linear-gradient(165deg, rgba(10, 15, 30, 0.94) 0%, rgba(5, 8, 18, 0.97) 100%)',
          backdropFilter: 'blur(32px) saturate(190%)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.95), 0 0 35px rgba(234, 179, 8, 0.15), 0 0 80px -20px rgba(6, 182, 212, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          animation: 'shimmerBorder 4s ease-in-out infinite',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
        }}
      >
        {/* Subtle glowing top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #eab308, #2dd4bf, transparent)',
            borderRadius: '2px',
          }}
        />

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Logo Badge with luminous aura */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'radial-gradient(circle, rgba(234, 179, 8, 0.20) 0%, rgba(15, 23, 42, 0.6) 80%)',
              border: '1px solid rgba(234, 179, 8, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
              boxShadow: '0 0 20px rgba(234, 179, 8, 0.25)',
            }}
          >
            <img
              src={LOGO_URL}
              alt="MPL Logo"
              style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(234, 179, 8, 0.8))' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span className="mono-label" style={{ color: '#fde047', letterSpacing: '0.18em', fontSize: '10px' }}>
              ACT IV // ARENA GATE
            </span>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em', margin: 0 }}>
            Arena Gateway
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>
            The flight ends here — step through to the arena hub to sign your team in
          </p>
        </div>

        {/* ── SESSION NOTE ── */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.10) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 20px rgba(45, 212, 191, 0.08)',
          }}
        >
          <ShieldCheck size={18} color="#2dd4bf" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            Team sign-in lives in the hub. Your flight telemetry stays on this page — nothing is transmitted.
          </span>
        </div>

        {/* ── ENTER HERO BUTTON ── */}
        <button
          type="button"
          onClick={enterArena}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)',
            color: '#060913',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 22px rgba(234, 179, 8, 0.45)',
            transition: 'transform 0.2s, box-shadow 0.2s, filter 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 8px 35px rgba(234, 179, 8, 0.65)';
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 22px rgba(234, 179, 8, 0.45)';
            e.currentTarget.style.filter = 'none';
          }}
        >
          <span>Enter Arena</span>
          <ArrowRight size={15} />
        </button>

        {/* ── FOOTER LINK ── */}
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(148, 163, 184, 0.12)', paddingTop: '12px' }}>
          <a
            href={ADMIN_URL}
            style={{
              fontSize: '0.78rem',
              color: '#64748b',
              textDecoration: 'none',
              transition: 'color 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#eab308')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            Organizers & Judges // Admin Gateway →
          </a>
        </div>
      </div>
    </div>
  );
};
