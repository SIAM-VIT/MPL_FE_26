const API = 'http://localhost:8000';
  let teamId = null, teamStatus = null;

  // ── Login ──────────────────────────────────────────────────────────────────
  async function doLogin() {
    const name = document.getElementById('team-name').value.trim();
    const pass = document.getElementById('passcode').value.trim();
    const btn  = document.getElementById('login-btn');
    const err  = document.getElementById('err-msg');
    err.classList.remove('show');

    if (!name || !pass) { showErr('Please fill in both fields.'); return; }
    btn.disabled = true; btn.textContent = 'Loading…';

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({name, passcode: pass})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      teamId = data.id;
      sessionStorage.setItem('mpl_boost_team', JSON.stringify(data));
      showBoostView(data);
    } catch(e) {
      showErr(e.message);
      btn.disabled = false; btn.textContent = 'View My Boosts';
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

  // ── Show Boost View ────────────────────────────────────────────────────────
  async function showBoostView(loginData) {
    document.getElementById('login-view').style.display  = 'none';
    document.getElementById('boost-view').style.display  = 'block';

    const initials = loginData.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('team-avatar').textContent     = initials;
    document.getElementById('team-name-display').textContent = loginData.name;

    await loadBoosts();
  }

  // ── Load Boost Questions ───────────────────────────────────────────────────
  async function loadBoosts() {
    try {
      // 1. Get team status (includes assigned boosts + extra_time_seconds)
      const statusRes = await fetch(`${API}/api/teams/${teamId}/status`);
      const status    = await statusRes.json();
      teamStatus      = status;

      const boostIds    = status.assigned_time_boosts || [];
      const extraSecs   = status.team?.extra_time_seconds ?? 0;

      // Show earned time bar
      if (extraSecs > 0) {
        const mins = Math.floor(extraSecs/60), rem = extraSecs % 60;
        const label = mins > 0 ? `+${mins}m ${rem>0?rem+'s':''}` : `+${rem}s`;
        document.getElementById('teb-val').textContent = label;
        document.getElementById('teb').style.display = 'flex';
      }

      document.getElementById('loading-skeletons').style.display = 'none';

      if (boostIds.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        return;
      }

      // 2. Fetch each question and visible sample tests
      const questions = await Promise.all(boostIds.map(async qid => {
        try {
          const [qRes, stRes] = await Promise.all([
            fetch(`${API}/api/questions/${qid}`),
            fetch(`${API}/api/questions/${qid}/sample-tests`)
          ]);
          const q = await qRes.json();
          if (stRes.ok) {
            const samples = await stRes.json();
            if (Array.isArray(samples) && samples.length) {
              q.test_cases = samples.map((s, i) => ({ id: i + 1, input: s.stdin, expected: s.expected_output }));
            }
          }
          return q;
        } catch (e) {
          return { id: qid, title: `Question #${qid}`, description: 'Failed to load question details.', test_cases: [] };
        }
      }));

      renderBoosts(questions);
    } catch(e) {
      document.getElementById('loading-skeletons').innerHTML =
        `<p style="color:#fca5a5;padding:20px;text-align:center">Error loading boosts: ${e.message}</p>`;
    }
  }

  function renderBoosts(questions) {
    const list = document.getElementById('boost-list');
    list.innerHTML = '';

    questions.forEach((q, idx) => {
      const rewardMins = Math.floor(q.reward_value / 60);
      const rewardSecs = q.reward_value % 60;
      const rewardLabel = rewardMins > 0
        ? `+${rewardMins}m${rewardSecs > 0 ? ' '+rewardSecs+'s' : ''}`
        : `+${q.reward_value}s`;
      const diff = (q.difficulty || 'EASY').toLowerCase();

      let testCasesHtml = '';
      try {
        const tcs = typeof q.test_cases === 'string' ? JSON.parse(q.test_cases) : q.test_cases;
        testCasesHtml = tcs.slice(0,3).map((tc,i) => `
          <div class="tc-mini" style="margin-bottom:8px">
            <span style="color:var(--muted);font-size:.7rem">TC${tc.id ?? i+1} IN:</span>
            ${escHtml(String(tc.input))}
            <br><span class="tc-expected" style="font-size:.7rem">→ ${escHtml(String(tc.expected))}</span>
          </div>
        `).join('');
      } catch { testCasesHtml = `<div class="tc-mini">${escHtml(q.test_cases)}</div>`; }

      const card = document.createElement('div');
      card.className = 'boost-card';
      card.style.animationDelay = (idx * 0.1) + 's';
      card.innerHTML = `
        <div class="bc-header">
          <div class="bc-icon"><svg class="mpl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg></div>
          <div class="bc-info">
            <div class="bc-meta">
              <span class="badge badge-boost">Time Boost</span>
              <span class="badge badge-${diff}">${diff.charAt(0).toUpperCase()+diff.slice(1)}</span>
            </div>
            <div class="bc-title">${escHtml(q.title)}</div>
          </div>
          <div class="bc-reward">
            <div>
              <div class="r-val">${rewardLabel}</div>
              <div class="r-label">if solved</div>
            </div>
          </div>
        </div>
        <div class="bc-body" id="body-${q.id}">
          <pre class="bc-desc">${escHtml(q.description)}</pre>
          <div style="font-size:.78rem;font-weight:700;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px">Sample Test Cases</div>
          ${testCasesHtml}
        </div>
        <div class="bc-footer">
          <span class="expand-hint">Click to view problem <span class="chevron">▼</span></span>
          <button class="btn-expand" onclick="toggleCard(event, ${q.id}, this)">View Problem</button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  // ── Toggle card expand ─────────────────────────────────────────────────────
  function toggleCard(e, qid, btn) {
    e.stopPropagation();
    const card = btn.closest('.boost-card');
    const body = document.getElementById(`body-${qid}`);
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    card.classList.toggle('expanded', !isOpen);
    btn.textContent = isOpen ? 'View Problem' : 'Hide Problem';
  }

  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function doLogout() {
    sessionStorage.removeItem('mpl_boost_team');
    teamId = null;
    document.getElementById('boost-view').style.display  = 'none';
    document.getElementById('login-view').style.display  = 'flex';
    document.getElementById('team-name').value = '';
    document.getElementById('passcode').value  = '';
  }

  // ── Auto-restore ───────────────────────────────────────────────────────────
  const saved = sessionStorage.getItem('mpl_boost_team');
  if (saved) {
    const data = JSON.parse(saved);
    teamId = data.id;
    showBoostView(data);
  }