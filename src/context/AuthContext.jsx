import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [team, setTeam] = useState(() => {
    try {
      const saved = localStorage.getItem('mpl_team') || sessionStorage.getItem('mpl_team');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const [adminPasscode, setAdminPasscode] = useState(() => {
    return localStorage.getItem('mpl_admin_pass') || sessionStorage.getItem('mpl_admin_pass') || '';
  });

  const loginTeam = async (name, passcode) => {
    const data = await api.login(name, passcode);
    setTeam(data);
    localStorage.setItem('mpl_team', JSON.stringify(data));
    sessionStorage.setItem('mpl_team', JSON.stringify(data));
    return data;
  };

  const logoutTeam = () => {
    setTeam(null);
    localStorage.removeItem('mpl_team');
    sessionStorage.removeItem('mpl_team');
  };

  const updateTeamData = (updates) => {
    setTeam((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('mpl_team', JSON.stringify(updated));
      sessionStorage.setItem('mpl_team', JSON.stringify(updated));
      return updated;
    });
  };

  const loginAdmin = async (passcode) => {
    await api.adminLogin(passcode);
    setAdminPasscode(passcode);
    localStorage.setItem('mpl_admin_pass', passcode);
    sessionStorage.setItem('mpl_admin_pass', passcode);
  };

  const logoutAdmin = () => {
    setAdminPasscode('');
    localStorage.removeItem('mpl_admin_pass');
    sessionStorage.removeItem('mpl_admin_pass');
  };

  return (
    <AuthContext.Provider
      value={{
        team,
        isAdmin: !!adminPasscode,
        adminPasscode,
        loginTeam,
        logoutTeam,
        updateTeamData,
        loginAdmin,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
