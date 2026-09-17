import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LandingPage } from './pages/LandingPage';
import { HubPage } from './pages/HubPage';
import { MainArenaPage } from './pages/MainArenaPage';
import { AdminPage } from './pages/AdminPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { BoostPage } from './pages/BoostPage';
import { ChallengePage } from './pages/ChallengePage';

export const App = () => {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/hub" element={<HubPage />} />
            <Route path="/main" element={<MainArenaPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/boost" element={<BoostPage />} />
            <Route path="/challenge" element={<ChallengePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
