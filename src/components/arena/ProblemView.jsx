import React from 'react';
import { BookOpen, Terminal, Zap } from 'lucide-react';

export const ProblemView = ({ question }) => {
  if (!question) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No question selected
      </div>
    );
  }

  let diffBadge = 'badge-easy';
  if (question.difficulty === 'MEDIUM') diffBadge = 'badge-medium';
  if (question.difficulty === 'HARD') diffBadge = 'badge-hard';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${diffBadge}`}>{question.difficulty || 'MEDIUM'}</span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
            {question.compare_mode || 'TRIM'} Match
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 600 }}>
          <Zap size={15} />
          <span>{question.points} Points</span>
        </div>
      </div>

      {/* Problem Title */}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.35rem',
          fontWeight: 700,
          color: '#f8fafc',
          lineHeight: 1.3,
        }}
      >
        {question.title}
      </h2>

      {/* Problem Description */}
      <div
        style={{
          color: '#cbd5e1',
          fontSize: '0.92rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          background: 'rgba(10, 13, 26, 0.4)',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid var(--border-glass)',
        }}
      >
        {question.description}
      </div>

      {/* Visible Test Cases */}
      {question.visible_tests && question.visible_tests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <Terminal size={14} color="#818cf8" />
            Sample Test Cases
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {question.visible_tests.map((test, index) => (
              <div
                key={test.id || index}
                style={{
                  background: 'rgba(10, 13, 26, 0.7)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                    fontWeight: 600,
                  }}
                >
                  Test Case #{index + 1}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>INPUT (stdin):</span>
                    <pre
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        marginTop: '3px',
                        color: '#38bdf8',
                        overflowX: 'auto',
                      }}
                    >
                      {test.stdin || '<empty>'}
                    </pre>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>EXPECTED OUTPUT:</span>
                    <pre
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        marginTop: '3px',
                        color: '#34d399',
                        overflowX: 'auto',
                      }}
                    >
                      {test.expected_output || '<empty>'}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
