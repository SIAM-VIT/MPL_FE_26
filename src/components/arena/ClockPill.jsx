import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

export const ClockPill = ({ teamId }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Poll server clock every 30s to prevent client drift
  useEffect(() => {
    let isMounted = true;

    const syncClock = async () => {
      try {
        const res = await api.getClock();
        if (isMounted && res?.seconds_remaining != null) {
          setSecondsRemaining(res.seconds_remaining);
          setIsExpired(res.expired);
        }
      } catch (_) {
        // Fallback to team endpoint if available
        if (teamId) {
          try {
            const teamRes = await api.getTimeRemaining(teamId);
            if (isMounted && teamRes?.seconds_remaining != null) {
              setSecondsRemaining(teamRes.seconds_remaining);
              setIsExpired(teamRes.expired);
            }
          } catch (e) {}
        }
      }
    };

    syncClock();
    const syncInterval = setInterval(syncClock, 30000);
    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, [teamId]);

  // Local 1-second countdown tick
  useEffect(() => {
    if (secondsRemaining == null || secondsRemaining <= 0) return;

    const tick = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [secondsRemaining]);

  const formatTime = (totalSec) => {
    if (totalSec == null) return '--:--:--';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  const isLow = secondsRemaining != null && secondsRemaining < 600 && secondsRemaining > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: isExpired
          ? 'rgba(239, 68, 68, 0.15)'
          : isLow
          ? 'rgba(245, 158, 11, 0.15)'
          : 'rgba(16, 185, 129, 0.12)',
        border: `1px solid ${
          isExpired
            ? 'rgba(239, 68, 68, 0.4)'
            : isLow
            ? 'rgba(245, 158, 11, 0.4)'
            : 'rgba(16, 185, 129, 0.3)'
        }`,
        padding: '6px 14px',
        borderRadius: '10px',
        minWidth: '130px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '1.05rem',
          color: isExpired ? '#f87171' : isLow ? '#fbbf24' : '#34d399',
        }}
      >
        {isLow ? <AlertTriangle size={15} /> : <Clock size={15} />}
        <span>{formatTime(secondsRemaining)}</span>
      </div>
      <span
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginTop: '1px',
        }}
      >
        {isExpired ? 'Time Expired' : 'Time Remaining'}
      </span>
    </div>
  );
};
