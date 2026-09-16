import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [team, setTeam] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mpl_team');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const [adminPasscode, setAdminPasscode] = useState(() => {
    return sessionStorage.getItem('mpl_admin_pass') || '';
  });

  const loginTeam = async (name, passcode) => {
    const data = await api.login(name, passcode);
    setTeam(data);
    sessionStorage.setItem('mpl_team', JSON.stringify(data));
    return data;
  };

  const logoutTeam = () => {
    setTeam(null);
    sessionStorage.removeItem('mpl_team');
  };

  const updateTeamData = (updates) => {
    setTeam((prev) => {
      const updated = { ...prev, ...updates };
      sessionStorage.setItem('mpl_team', JSON.stringify(updated));
      return updated;
    });
  };

  const loginAdmin = async (passcode) => {
    await api.adminLogin(passcode);
    setAdminPasscode(passcode);
    sessionStorage.setItem('mpl_admin_pass', passcode);
  };

  const logoutAdmin = () => {
    setAdminPasscode('');
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
