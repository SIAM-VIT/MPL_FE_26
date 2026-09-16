import React from 'react';
import { Link } from 'react-router-dom';
import { BackgroundLayers } from '../components/common/BackgroundLayers';

export const HubPage = () => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BackgroundLayers />

      <div className="wrap">
        <header>
          <div className="live-badge">
            <div className="live-dot" /> Event Active
          </div>
          <h1>
            Mini Programming<br />League
          </h1>
          <p className="subtitle">
            Compete, solve, and dominate. Choose your arena below to get started.
          </p>
        </header>

        <div className="section-label">
          <span>Choose your arena</span>
        </div>

        <div className="cards">
          {/* Card 1: Main Question */}
          <Link to="/main" className="card card-main" id="btn-main">
            <div className="card-icon">
              <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="2" r="2" />
              </svg>
            </div>
            <span className="card-tag">Main Event</span>
            <h2>Main Question</h2>
            <p className="desc">
              The primary 90-minute challenge. Login to start your countdown and receive your team's assigned question set.
            </p>
            <div className="card-cta">
              Get Started <span className="arrow">→</span>
            </div>
          </Link>

          {/* Card 2: Bonus Bidding */}
          <Link to="/boost" className="card card-boost" id="btn-boost">
            <div className="card-icon">
              <svg className="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="card-tag">Time Boost</span>
            <h2>Bonus Bidding</h2>
            <p className="desc">
              Solve bonus questions to earn extra minutes on your countdown timer. Stack your time advantage before it runs out!
            </p>
            <div className="card-cta">
              Earn Time <span className="arrow">→</span>
            </div>
          </Link>

          {/* Card 3: 1v1 Challenge Mode */}
          <Link
            to="/challenge"
            className="card card-boost"
            id="btn-challenge"
            style={{ textDecoration: 'none' }}
          >
            <div className="card-icon">
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
            <span className="card-tag" style={{ background: 'rgba(240,180,41,0.15)', color: '#ffe4a3', borderColor: 'rgba(240,180,41,0.3)' }}>
              ⚔️ 1v1 Head-to-Head
            </span>
            <h2>Challenge Arena</h2>
            <p className="desc">
              Go head-to-head in 1v1 battles. First team to solve and verify wins 100 points transferred directly from the opponent!
            </p>
            <div className="card-cta">
              Enter 1v1 Arena <span className="arrow">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};


