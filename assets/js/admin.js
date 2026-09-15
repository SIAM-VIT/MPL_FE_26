const API = 'http://localhost:8000';
  let adminPasscode = '';
  let allTeams = [];
  let createdQuestions = JSON.parse(localStorage.getItem('mpl_admin_questions') || '[]');

  // ──────────────────────────────────────────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────────────────────────────────────────
  function adminLogin() {
    const pass = document.getElementById('admin-pass').value.trim();
    if (!pass) return;
    adminPasscode = pass;
    sessionStorage.setItem('mpl_admin_pass', pass);
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    init();
  }

  function adminLogout() {
    adminPasscode = '';
    sessionStorage.removeItem('mpl_admin_pass');
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-pass').value = '';
  }

  document.getElementById('admin-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });

  // Auto-restore session
  const savedPass = sessionStorage.getItem('mpl_admin_pass');
  if (savedPass) {
    adminPasscode = savedPass;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    // Will init after DOM ready
    window.addEventListener('DOMContentLoaded', init);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────────────────────────────────
  async function init() {
    await loadTeams();
    await loadDashboard();
    populateTeamSelects();
    renderCreatedQ();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ──────────────────────────────────────────────────────────────────────────
  function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    document.getElementById('nav-' + name).classList.add('active');
    if (name === 'dashboard') loadDashboard();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // API HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  function adminHeaders() {
    return { 'admin-passcode': adminPasscode, 'Content-Type': 'application/json' };
  }

  async function apiGet(path) {
    const r = await fetch(API + path, { headers: adminHeaders() });
    return { status: r.status, data: await r.json() };
  }

  async function apiPost(path, body) {
    const r = await fetch(API + path, {
      method: 'POST', headers: adminHeaders(), body: JSON.stringify(body)
    });
    return { status: r.status, data: await r.json() };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TOAST
  // ──────────────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast toast-${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function showAlert(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg; el.className = `alert alert-${type} show`;
    setTimeout(() => el.classList.remove('show'), 5000);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────
  async function loadDashboard() {
    const { status, data } = await apiGet('/api/admin/teams');
    if (status !== 200) { toast('Failed to load teams: ' + (data.detail || status), 'error'); return; }

    allTeams = data;
    document.getElementById('nav-badge-teams').textContent = data.length;

    // Sort by points desc
    const sorted = [...data].sort((a, b) => b.points - a.points);
    const active = data.filter(t => t.timer_start_time !== null).length;

    document.getElementById('stat-teams').textContent  = data.length;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-leader').textContent = sorted[0]?.name ?? '—';

    const tbody = document.getElementById('leaderboard-body');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No teams yet.</td></tr>';
      return;
    }

    tbody.innerHTML = sorted.map((t, i) => {
      const rankIcon = i === 0 ? '<span class="rank-badge rank-1">1</span>' : i === 1 ? '<span class="rank-badge rank-2">2</span>' : i === 2 ? '<span class="rank-badge rank-3">3</span>' : `#${i+1}`;
      const timerChip = t.timer_start_time
        ? `<span class="timer-chip timer-active">Running</span>`
        : `<span class="timer-chip timer-pending">Not started</span>`;
      const extraTime = t.extra_time_seconds > 0
        ? `+${Math.floor(t.extra_time_seconds/60)}m ${t.extra_time_seconds%60}s`
        : '—';
      return `
        <tr>
          <td style="font-size:1rem">${rankIcon}</td>
          <td><strong>${escHtml(t.name)}</strong></td>
          <td><span class="pts">${t.points}</span></td>
          <td>${timerChip}</td>
          <td style="color:${t.extra_time_seconds>0?'#34d399':'var(--muted)'}">
            ${extraTime}
          </td>
          <td>${t.main_question_id ? `<code>#${t.main_question_id}</code>` : '<span style="color:var(--muted)">—</span>'}</td>
        </tr>`;
    }).join('');

    populateTeamSelects();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEAMS
  // ──────────────────────────────────────────────────────────────────────────
  async function loadTeams() {
    const { status, data } = await apiGet('/api/admin/teams');
    if (status !== 200) return;
    allTeams = data;
    document.getElementById('nav-badge-teams').textContent = data.length;

    const tbody = document.getElementById('teams-table-body');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--muted)">No teams yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(t => `
      <tr>
        <td><code>#${t.id}</code></td>
        <td><strong>${escHtml(t.name)}</strong></td>
        <td><span class="pts">${t.points}</span></td>
        <td>${t.timer_start_time
          ? '<span class="badge badge-green">Active</span>'
          : '<span class="badge" style="color:var(--muted);background:rgba(100,116,139,.08);border:1px solid var(--border)">Pending</span>'}</td>
      </tr>`).join('');
    populateTeamSelects();
  }

  function populateTeamSelects() {
    const selects = ['assign-team-id','ch-team1','ch-team2','ch-team3','review-team-id'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const isOptional = id === 'ch-team3';
      const prevVal = sel.value;
      sel.innerHTML = `<option value="">${isOptional ? '— None (2-team match) —' : '— Select a team —'}</option>`;
      allTeams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id; opt.textContent = `#${t.id} — ${t.name} (${t.points} pts)`;
        sel.appendChild(opt);
      });
      if (prevVal) sel.value = prevVal;
    });
  }

  async function createTeam() {
    const name = document.getElementById('new-team-name').value.trim();
    const pass = document.getElementById('new-team-pass').value.trim();
    if (!name || !pass) { showAlert('create-team-err','Fill in both fields.','error'); return; }

    const btn = document.getElementById('btn-create-team');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating…';

    const { status, data } = await apiPost('/api/admin/teams', { name, passcode: pass });
    btn.disabled = false; btn.textContent = 'Create Team';

    if (status === 200) {
      showAlert('create-team-ok', `Team "${name}" created (ID: ${data.id})`, 'success');
      toast(`Team "${name}" created!`, 'success');
      document.getElementById('new-team-name').value = '';
      document.getElementById('new-team-pass').value = '';
      loadTeams();
    } else {
      showAlert('create-team-err', '' + (data.detail || 'Error creating team'), 'error');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // QUESTIONS
  // ──────────────────────────────────────────────────────────────────────────
  function toggleRewardLabel() {
    const type = document.getElementById('q-type').value;
    const label = document.getElementById('reward-label');
    if (type === 'TIME_BOOST') label.textContent = 'Reward Value (seconds of extra time)';
    else if (type === 'CHALLENGE') label.textContent = 'Reward Value (bonus points for winner)';
    else label.textContent = 'Reward Value (leave 0 for MAIN)';
  }

  async function createQuestion() {
    const title      = document.getElementById('q-title').value.trim();
    const desc       = document.getElementById('q-desc').value.trim();
    const tcRaw      = document.getElementById('q-tc').value.trim();
    const type       = document.getElementById('q-type').value;
    const difficulty = document.getElementById('q-diff').value || null;
    const reward     = parseInt(document.getElementById('q-reward').value) || 0;

    if (!title || !desc) { showAlert('create-q-err','Title and description are required.','error'); return; }

    let test_cases = tcRaw;
    if (tcRaw) {
      try { JSON.parse(tcRaw); } catch { showAlert('create-q-err','Test cases must be valid JSON.','error'); return; }
    } else { test_cases = '[]'; }

    const btn = document.getElementById('btn-create-q');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating…';

    const payload = { title, description: desc, test_cases, type, difficulty, reward_value: reward };
    const { status, data } = await apiPost('/api/admin/questions', payload);
    btn.disabled = false; btn.textContent = 'Create Question';

    if (status === 200) {
      const qEntry = { id: data.id, title, type, reward };
      createdQuestions.unshift(qEntry);
      localStorage.setItem('mpl_admin_questions', JSON.stringify(createdQuestions));
      showAlert('create-q-ok', `Question created (ID: ${data.id})`, 'success');
      toast(`Question #${data.id} created!`, 'success');
      document.getElementById('q-title').value = '';
      document.getElementById('q-desc').value  = '';
      document.getElementById('q-tc').value    = '';
      document.getElementById('q-reward').value = '0';
      renderCreatedQ();
    } else {
      showAlert('create-q-err', '' + (data.detail || 'Error creating question'), 'error');
    }
  }

  function renderCreatedQ() {
    const tbody = document.getElementById('created-q-body');
    if (!createdQuestions.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--muted);font-size:.85rem">Questions you create will appear here.</td></tr>';
      return;
    }
    const typeClass = { MAIN:'purple', TIME_BOOST:'cyan', CHALLENGE:'red' };
    tbody.innerHTML = createdQuestions.slice(0,20).map(q => `
      <tr>
        <td><code>#${q.id}</code></td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(q.title)}">${escHtml(q.title)}</td>
        <td><span class="badge badge-${typeClass[q.type] || 'gold'}">${q.type}</span></td>
        <td style="color:${q.type==='TIME_BOOST'?'#ffe4a3':q.type==='CHALLENGE'?'#ffe4a3':'var(--muted)'}">${q.reward || '—'}</td>
      </tr>`).join('');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ASSIGN BOOST
  // ──────────────────────────────────────────────────────────────────────────
  async function assignBoost() {
    const teamId = document.getElementById('assign-team-id').value;
    const qId    = document.getElementById('assign-q-id').value;
    if (!teamId || !qId) { showAlert('assign-err','Select a team and enter a question ID.','error'); return; }

    const btn = document.getElementById('btn-assign');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Assigning…';

    const { status, data } = await apiPost(`/api/admin/teams/${teamId}/assign-boost`, { question_id: parseInt(qId) });
    btn.disabled = false; btn.textContent = 'Assign Boost';

    if (status === 200) {
      showAlert('assign-ok', `Time boost question #${qId} assigned to team #${teamId}.`, 'success');
      toast('Boost assigned!', 'success');
    } else {
      showAlert('assign-err', '' + (data.detail || 'Error assigning boost'), 'error');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CHALLENGE
  // ──────────────────────────────────────────────────────────────────────────
  async function createChallenge() {
    const qId   = parseInt(document.getElementById('ch-q-id').value);
    const team1 = parseInt(document.getElementById('ch-team1').value);
    const team2 = parseInt(document.getElementById('ch-team2').value);
    const team3 = document.getElementById('ch-team3').value ? parseInt(document.getElementById('ch-team3').value) : null;

    if (!qId || !team1 || !team2) { showAlert('challenge-err','Question ID, Team 1 and Team 2 are required.','error'); return; }
    if (team1 === team2 || (team3 && (team3===team1||team3===team2))) {
      showAlert('challenge-err','Teams must be different.','error'); return;
    }

    const btn = document.getElementById('btn-create-challenge');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Starting…';

    const payload = { question_id: qId, team1_id: team1, team2_id: team2, team3_id: team3 };
    const { status, data } = await apiPost('/api/admin/challenge/create', payload);
    btn.disabled = false; btn.textContent = 'Start Challenge';

    if (status === 200) {
      showAlert('challenge-ok', `Challenge session #${data.id} started! Teams will auto-unlock.`, 'success');
      toast('Challenge started! Teams can see it now.', 'success');
    } else {
      showAlert('challenge-err', '' + (data.detail || 'Error creating challenge'), 'error');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REVIEW
  // ──────────────────────────────────────────────────────────────────────────
  async function markSolved() {
    const teamId = document.getElementById('review-team-id').value;
    const qId    = document.getElementById('review-q-id').value;
    if (!teamId || !qId) { showAlert('review-err','Select a team and enter a question ID.','error'); return; }

    const btn = document.getElementById('btn-review');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Awarding…';

    const { status, data } = await apiPost('/api/admin/review/mark-solved', {
      team_id: parseInt(teamId), question_id: parseInt(qId)
    });
    btn.disabled = false; btn.textContent = 'Mark Solved & Award Reward';

    if (status === 200) {
      showAlert('review-ok', `${data.message}`, 'success');
      toast(data.message, 'success');
      loadDashboard(); // refresh leaderboard
    } else {
      showAlert('review-err', '' + (data.detail || 'Error marking solved'), 'error');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // QUESTION PREVIEW (inline)
  // ──────────────────────────────────────────────────────────────────────────
  const previewDebounce = {};
  async function previewQuestion(inputId, previewId) {
    const qId = document.getElementById(inputId).value;
    const el  = document.getElementById(previewId);
    if (!qId) { el.classList.remove('show'); return; }
    clearTimeout(previewDebounce[inputId]);
    previewDebounce[inputId] = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/api/questions/${qId}`);
        if (!r.ok) { el.classList.remove('show'); return; }
        const q = await r.json();
        const typeClass = { MAIN:'badge-purple', TIME_BOOST:'badge-cyan', CHALLENGE:'badge-red' };
        const diffClass = { EASY:'badge-easy', MEDIUM:'badge-medium', HARD:'badge-hard' };
        el.innerHTML = `
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <span class="badge ${typeClass[q.type]||'badge-gold'}">${q.type}</span>
            ${q.difficulty ? `<span class="badge ${diffClass[q.difficulty]||''}">${q.difficulty}</span>` : ''}
            ${q.reward_value ? `<span class="badge badge-gold">+${q.reward_value} ${q.type==='TIME_BOOST'?'sec':'pts'}</span>` : ''}
          </div>
          <h4>${escHtml(q.title)}</h4>
          <p>${escHtml(q.description.slice(0,120))}${q.description.length>120?'…':''}</p>`;
        el.classList.add('show');
      } catch { el.classList.remove('show'); }
    }, 500);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UTILS
  // ──────────────────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Auto-init if session restored
  if (savedPass) { /* init called via DOMContentLoaded above */ }
  else { /* wait for login */ }