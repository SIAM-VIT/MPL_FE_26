const API = 'http://localhost:8000';
  let teamId = null, pollHandle = null, currentChallengeId = null;

  // ── Login ──────────────────────────────────────────────────────────────────
  async function doLogin() {
    const name = document.getElementById('team-name').value.trim();
    const pass = document.getElementById('passcode').value.trim();
    const btn  = document.getElementById('login-btn');
    const err  = document.getElementById('err-msg');
    err.classList.remove('show');

    if (!name || !pass) { showErr('Please fill in both fields.'); return; }
    btn.disabled = true; btn.textContent = 'Entering arena…';

    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({name, passcode: pass})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      teamId = data.id;
      sessionStorage.setItem('mpl_challenge_team', JSON.stringify(data));
      showChallengeView(data);
    } catch(e) {
      showErr(e.message);
      btn.disabled = false; btn.textContent = 'Enter Arena';
    }
  }

  function showErr(msg) {
    const el = document.getElementById('err-msg');
    el.textContent = msg;
    el.classList.add('show');
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('login-view').style.display !== 'none') doLogin();
  });

  // ── Show Challenge View ────────────────────────────────────────────────────
  async function showChallengeView(loginData) {
    document.getElementById('login-view').style.display     = 'none';
    document.getElementById('challenge-view').style.display = 'block';

    const initials = loginData.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('team-avatar').textContent        = initials;
    document.getElementById('team-name-display').textContent  = loginData.name;

    // Start polling for active challenge
    await pollChallenge();
    pollHandle = setInterval(pollChallenge, 5000);
  }

  // ── Poll for Challenge ─────────────────────────────────────────────────────
  async function pollChallenge() {
    if (!teamId) return;
    try {
      const res    = await fetch(`${API}/api/teams/${teamId}/status`);
      const status = await res.json();
      const cs     = status.active_challenge_session;

      if (cs && cs.id !== currentChallengeId) {
        // New challenge started!
        currentChallengeId = cs.id;
        clearInterval(pollHandle); // stop polling — we have our challenge
        await activateChallenge(cs.question_id);
      } else if (!cs && currentChallengeId) {
        // Challenge ended
        showCompleted();
      }
    } catch(e) { /* network error, keep polling */ }
  }

  // ── Activate Challenge ─────────────────────────────────────────────────────
  async function activateChallenge(questionId) {
    // Show active state
    document.getElementById('locked-state').style.display = 'none';
    document.getElementById('active-state').style.display = 'block';

    // Load question and visible sample tests
    try {
      const [qRes, testsRes] = await Promise.all([
        fetch(`${API}/api/questions/${questionId}`),
        fetch(`${API}/api/questions/${questionId}/sample-tests`)
      ]);
      const q = await qRes.json();
      if (testsRes.ok) {
        const tests = await testsRes.json();
        if (Array.isArray(tests) && tests.length) {
          q.test_cases = tests.map((t, i) => ({ id: i + 1, input: t.stdin, expected: t.expected_output }));
        }
      }
      renderQuestion(q);
    } catch(e) {
      document.getElementById('q-loading').innerHTML =
        `<p style="color:#fca5a5;padding:20px">Failed to load question: ${e.message}</p>`;
    }
  }

  // ── Render Question ────────────────────────────────────────────────────────
  function renderQuestion(q) {
    document.getElementById('q-loading').style.display = 'none';
    const card = document.getElementById('q-card');
    card.style.display = 'block';

    document.getElementById('q-title').textContent = q.title;
    document.getElementById('q-desc').textContent  = q.description;

    const diff = (q.difficulty || 'HARD').toUpperCase();
    const db   = document.getElementById('diff-badge');
    db.textContent = diff.charAt(0) + diff.slice(1).toLowerCase();
    db.className   = 'badge badge-' + diff.toLowerCase();

    // Reward value
    if (q.reward_value) {
      document.getElementById('reward-val').textContent = q.reward_value;
    }

    // Sub label
    document.getElementById('challenge-sub').textContent =
      `Question #${q.id} • ${q.reward_value} bonus points for the winner!`;

    // Test cases
    const tcList = document.getElementById('tc-list');
    try {
      const tcs = typeof q.test_cases === 'string' ? JSON.parse(q.test_cases) : q.test_cases;
      tcList.innerHTML = tcs.map((tc,i) => `
        <div class="tc-item">
          <div class="tc-label">Test Case ${tc.id ?? i+1}</div>
          <div class="tc-row">
            <div class="tc-field">
              <div class="tc-field-label">Input</div>
              <div class="tc-val">${escHtml(String(tc.input))}</div>
            </div>
            <div class="tc-field">
              <div class="tc-field-label">Expected</div>
              <div class="tc-val tc-expected">${escHtml(String(tc.expected))}</div>
            </div>
          </div>
        </div>
      `).join('');
    } catch { tcList.innerHTML = `<div class="tc-val">${escHtml(q.test_cases)}</div>`; }
  }

  function showCompleted() {
    document.getElementById('completed-banner').classList.add('show');
    document.getElementById('q-card').style.opacity = '.5';
    document.getElementById('challenge-banner').style.opacity = '.5';
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t,i) => {
      t.classList.toggle('active', i === (name === 'description' ? 0 : 1));
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
  }

  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function doLogout() {
    clearInterval(pollHandle);
    sessionStorage.removeItem('mpl_challenge_team');
    teamId = null; currentChallengeId = null;
    document.getElementById('challenge-view').style.display = 'none';
    document.getElementById('login-view').style.display     = 'flex';
    document.getElementById('locked-state').style.display  = 'flex';
    document.getElementById('active-state').style.display  = 'none';
    document.getElementById('team-name').value = '';
    document.getElementById('passcode').value  = '';
  }

  // ── Auto-restore ───────────────────────────────────────────────────────────
  const saved = sessionStorage.getItem('mpl_challenge_team');
  if (saved) {
    const data = JSON.parse(saved);
    teamId = data.id;
    showChallengeView(data);
  }