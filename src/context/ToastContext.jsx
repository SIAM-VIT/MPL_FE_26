import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Overlay */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        maxWidth: '400px',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => {
          let bg = 'rgba(18, 22, 42, 0.95)';
          let border = 'rgba(99, 102, 241, 0.3)';
          let icon = <Info size={18} color="#818cf8" />;

          if (toast.type === 'success') {
            border = 'rgba(16, 185, 129, 0.4)';
            icon = <CheckCircle2 size={18} color="#34d399" />;
          } else if (toast.type === 'error') {
            border = 'rgba(239, 68, 68, 0.4)';
            icon = <AlertCircle size={18} color="#f87171" />;
          } else if (toast.type === 'warning') {
            border = 'rgba(245, 158, 11, 0.4)';
            icon = <AlertCircle size={18} color="#fbbf24" />;
          }

          return (
            <div
              key={toast.id}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                backdropFilter: 'blur(12px)',
                padding: '12px 16px',
                borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-sans)',
                pointerEvents: 'auto',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {icon}
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
