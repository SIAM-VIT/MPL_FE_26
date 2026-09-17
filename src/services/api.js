// Centralized API client for MPL backend

const BASE_URL = 'https://mpl-26-be.onrender.com';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Auto-inject Team Token if present
  const sessionData = localStorage.getItem('mpl_team') || sessionStorage.getItem('mpl_team');
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
  const adminPass = localStorage.getItem('mpl_admin_pass') || sessionStorage.getItem('mpl_admin_pass');
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
    if (response.status === 401) {
      localStorage.removeItem('mpl_team');
      sessionStorage.removeItem('mpl_team');
    }
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
  verifyMainQuestion: (questionId, passcode) =>
    request('/api/main/verify-question', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, passcode }),
    }),
  finalSubmit: (passcode) =>
    request('/api/main/final-submit', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),


  // Team & Status
  getTeamStatus: (teamId) => request(`/api/teams/${teamId}/status`),
  getTimeRemaining: (teamId) => request(`/api/teams/${teamId}/time-remaining`),
  getActiveBoost: (teamId) => request(`/api/teams/${teamId}/active-boost`),
  verifyBoost: (teamId, questionId, passcode) =>
    request(`/api/teams/${teamId}/verify-boost`, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, passcode }),
    }),
  cancelBoost: (teamId, questionId) =>
    request(`/api/teams/${teamId}/cancel-boost`, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId }),
    }),

  // Admin APIs
  adminLogin: (passcode) =>
    request('/api/admin/teams', {
      headers: { 'admin-passcode': passcode },
    }),
  getTeams: () => request('/api/admin/teams'),
  assignRandomBoost: (teamId, difficulty) =>
    request(`/api/admin/teams/${teamId}/assign-random-boost`, {
      method: 'POST',
      body: JSON.stringify({ difficulty }),
    }),
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
  deleteTeam: (teamId) =>
    request(`/api/admin/teams/${teamId}`, {
      method: 'DELETE',
    }),
  deleteAllTeams: () =>
    request('/api/admin/teams', {
      method: 'DELETE',
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
  getChallengeSessions: () => request('/api/admin/challenge/sessions'),
  getChallengeQuestions: () => request('/api/admin/challenge/questions'),
  resolveChallenge: (sessionId, payload) =>
    request(`/api/admin/challenge/${sessionId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitChallenge1v1: (teamId, payload) =>
    request(`/api/teams/${teamId}/challenge-submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getChallengePortalStatus: () => request('/api/admin/challenge/portal-status'),
  toggleChallengePortal: (payload) =>
    request('/api/admin/challenge/portal-toggle', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  getPublicChallengePortalStatus: () => request('/api/teams/challenge/portal-status'),
  assignBoost: (payload) =>
    request('/api/admin/assign-boost', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

