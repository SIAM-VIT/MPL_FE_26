import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Cpu, Clock, Terminal } from 'lucide-react';

export const ResultPanel = ({ result, isRunning }) => {
  if (isRunning) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px',
          gap: '12px',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-display)',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span>Executing code in Judge sandbox...</span>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        style={{
          padding: '30px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Terminal size={24} color="#475569" />
        <span>Click <b>Run</b> to test sample cases, or <b>Submit</b> for full evaluation.</span>
      </div>
    );
  }

  const isPassed = result.verdict === 'PASSED';
  const isPartial = result.verdict === 'PARTIAL';
  const isError = result.verdict === 'ERROR';

  let bannerBg = 'rgba(239, 68, 68, 0.15)';
  let bannerBorder = 'rgba(239, 68, 68, 0.35)';
  let bannerColor = '#f87171';
  let bannerIcon = <XCircle size={20} />;

  if (isPassed) {
    bannerBg = 'rgba(16, 185, 129, 0.15)';
    bannerBorder = 'rgba(16, 185, 129, 0.35)';
    bannerColor = '#34d399';
    bannerIcon = <CheckCircle2 size={20} />;
  } else if (isPartial) {
    bannerBg = 'rgba(245, 158, 11, 0.15)';
    bannerBorder = 'rgba(245, 158, 11, 0.35)';
    bannerColor = '#fbbf24';
    bannerIcon = <AlertTriangle size={20} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
      {/* Verdict Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: bannerBg,
          border: `1px solid ${bannerBorder}`,
          borderRadius: '10px',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: bannerColor, fontWeight: 700 }}>
          {bannerIcon}
          <span style={{ fontSize: '1.05rem', fontFamily: 'var(--font-mono)' }}>
            {result.verdict || (result.passed ? 'ALL SAMPLES PASSED' : 'SOME TESTS FAILED')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          {result.score_delta != null && (
            <span style={{ color: '#34d399', fontWeight: 600 }}>
              +{result.score_delta} pts gained
            </span>
          )}
          {result.tests_passed != null && (
            <span style={{ color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
              Tests: <b>{result.tests_passed}</b> / {result.tests_total}
            </span>
          )}
        </div>
      </div>

      {/* Global Error or Compiler Message */}
      {result.error_message && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {result.error_message}
        </div>
      )}

      {/* Test Case Cards */}
      {result.results && result.results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.results.map((tc, idx) => {
            const passed = tc.passed;
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(10, 13, 26, 0.8)',
                  border: `1px solid ${passed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.82rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {passed ? <CheckCircle2 size={15} color="#34d399" /> : <XCircle size={15} color="#f87171" />}
                    <span style={{ fontWeight: 600, color: passed ? '#34d399' : '#f87171' }}>
                      Test Case #{idx + 1} {tc.is_hidden ? '(Hidden)' : '(Sample)'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      — {tc.judge_status || (passed ? 'Accepted' : 'Wrong Answer')}
                    </span>
                  </div>

                  {tc.time_seconds != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Clock size={12} />
                      <span>{tc.time_seconds.toFixed(3)}s</span>
                    </div>
                  )}
                </div>

                {/* Test Case Details for visible / run */}
                {!tc.is_hidden && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Your Output:</span>
                      <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '4px', marginTop: '2px', color: passed ? '#34d399' : '#fca5a5', overflowX: 'auto' }}>
                        {tc.stdout || '<no output>'}
                      </pre>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Expected:</span>
                      <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '4px', marginTop: '2px', color: '#38bdf8', overflowX: 'auto' }}>
                        {tc.expected_output || '<no output>'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Stderr / Compilation errors */}
                {(tc.stderr || tc.compile_output) && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ color: '#f87171', fontSize: '0.75rem' }}>Error Details:</span>
                    <pre style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', padding: '6px', borderRadius: '4px', marginTop: '2px', overflowX: 'auto' }}>
                      {tc.compile_output || tc.stderr}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
