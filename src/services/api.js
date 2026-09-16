// Centralized API client for MPL backend

const BASE_URL = '';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Auto-inject Team Token if present
  const sessionData = sessionStorage.getItem('mpl_team');
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      const token = session?.session_token || session?.token;
      if (token) {
        headers['X-Team-Token'] = token;
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (_) {}
  }

  // Auto-inject Admin Passcode if present
  const adminPass = sessionStorage.getItem('mpl_admin_pass');
  if (adminPass) {
    headers['admin-passcode'] = adminPass;
    headers['x-admin-passcode'] = adminPass;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.error || `HTTP ${response.status}: Request failed`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (name, passcode) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, passcode }),
    }),

  // Main Arena
  getQuestions: () => request('/api/main/questions'),
  runCode: (payload) =>
    request('/api/main/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitCode: (payload) =>
    request('/api/main/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getClock: () => request('/api/main/clock'),

  // Team & Status
  getTeamStatus: (teamId) => request(`/api/teams/${teamId}/status`),
  getTimeRemaining: (teamId) => request(`/api/teams/${teamId}/time-remaining`),

  // Admin APIs
  adminLogin: (passcode) =>
    request('/api/admin/teams', {
      headers: { 'admin-passcode': passcode },
    }),
  getTeams: () => request('/api/admin/teams'),
  createTeam: (payload) =>
    request('/api/admin/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addTeamTime: (teamId, seconds) =>
    request(`/api/admin/teams/${teamId}/add-time`, {
      method: 'POST',
      body: JSON.stringify({ seconds }),
    }),
  resetTeamTimer: (teamId) =>
    request(`/api/admin/teams/${teamId}/reset-timer`, {
      method: 'POST',
    }),
  resetTeamToken: (teamId) =>
    request(`/api/admin/teams/${teamId}/reset-token`, {
      method: 'POST',
    }),
  getAdminQuestions: () => request('/api/admin/questions'),
  createQuestion: (payload) =>
    request('/api/admin/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTestCases: (questionId) => request(`/api/admin/questions/${questionId}/test-cases`),
  setTestCases: (questionId, testCases, replace = true) =>
    request(`/api/admin/questions/${questionId}/test-cases?replace=${replace}`, {
      method: 'POST',
      body: JSON.stringify(testCases),
    }),
  getSubmissions: (limit = 100) => request(`/api/admin/submissions?limit=${limit}`),
  rejudgeSubmission: (submissionId) =>
    request(`/api/admin/submissions/${submissionId}/rejudge`, {
      method: 'POST',
    }),
  getLeaderboard: () => request('/api/admin/leaderboard'),
  getJudgeHealth: () => request('/api/admin/judge/health'),
  createChallenge: (payload) =>
    request('/api/admin/challenge/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  assignBoost: (payload) =>
    request('/api/admin/assign-boost', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
