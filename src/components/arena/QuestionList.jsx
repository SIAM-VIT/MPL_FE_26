import React from 'react';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export const QuestionList = ({ questions, selectedId, onSelectQuestion }) => {
  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
      {questions.map((q, idx) => {
        const isSelected = q.id === selectedId;
        const isSolved = q.status === 'SOLVED';

        let typeBadgeClass = 'badge-debugging';
        if (q.sub_type === 'MATH') typeBadgeClass = 'badge-math';
        if (q.sub_type === 'LEETCODE') typeBadgeClass = 'badge-leetcode';

        return (
          <button
            key={q.id}
            onClick={() => onSelectQuestion(q.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(18, 22, 42, 0.6)',
              border: isSelected ? '1px solid var(--border-active)' : '1px solid var(--border-glass)',
              color: '#f8fafc',
              cursor: 'pointer',
              minWidth: '160px',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.25)' : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <span className={`badge ${typeBadgeClass}`}>
                {q.sub_type || `Q${idx + 1}`}
              </span>
              {isSolved ? (
                <CheckCircle2 size={15} color="#34d399" />
              ) : q.attempts > 0 ? (
                <AlertCircle size={15} color="#fbbf24" />
              ) : (
                <Circle size={14} color="#64748b" />
              )}
            </div>

            <div
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '150px',
              }}
            >
              {q.title}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>{q.points} pts</span>
              <span>
                Best: <b style={{ color: isSolved ? '#34d399' : '#e2e8f0' }}>{q.best_score || 0}</b>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
