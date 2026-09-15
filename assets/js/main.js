/* ════════════════════════════════════════════════════════════════════
   MPL Main Arena Script
   ════════════════════════════════════════════════════════════════════ */

const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API = (location.port === '8000' || !location.port) && !IS_LOCAL
  ? location.origin
  : (IS_LOCAL && location.port !== '8000' ? 'http://localhost:8000' : '');

const SESSION_KEY = 'mpl_team';
const DRAFT_KEY = 'mpl_drafts';          // code survives tab + language switches
const LANG_LABELS = { python: 'Python 3', c: 'C (GCC)', cpp: 'C++ (G++)', java: 'Java' };
const MONACO_LANG = { python: 'python', c: 'c', cpp: 'cpp', java: 'java' };

/* ── State ── */
let session = null;          // { id, name, token }
let questions = [];
let currentQ = null;
let language = 'python';
let editor = null;           // monaco instance, or null when using textarea
let monacoReady = false;
let clockRemaining = null;
let busy = false;
let clockSyncTimer = null;
let clockTickTimer = null;

const $ = (id) => document.getElementById(id);

/* ── Helpers ── */
function showToast(msg, kind = '') {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast ' + kind; }, 4200);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (session && session.token) headers['X-Team-Token'] = session.token;
  const res = await fetch(API + path, Object.assign({}, options, { headers }));
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (res.status === 401) { doLogout(true); throw new Error('Session expired'); }
  return { status: res.status, ok: res.ok, data };
}

function fmtTime(sec) {
  if (sec == null) return '--:--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/* ── Drafts: keep code per question + language ── */
function draftKey(qid, lang) { return `${session ? session.id : 'team'}:${qid}:${lang}`; }
function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); } catch (e) { return {}; }
}
function saveDraft() {
  if (!currentQ || !session) return;
  const d = loadDrafts();
  d[draftKey(currentQ.id, language)] = getCode();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
}
function readDraft(qid, lang) {
  const d = loadDrafts();
  const key = draftKey(qid, lang);
  if (key in d) return d[key];
  const q = questions.find(x => x.id === qid);
  let starter = {};
  try { starter = JSON.parse(q?.starter_code || '{}'); } catch (e) { starter = {}; }
  return starter[lang] || starter.python || '';
}

/* ── Monaco Editor with Textarea Fallback ── */
function initMonaco() {
  if (typeof require === 'undefined') { useFallback('Editor CDN unavailable — using plain text editor'); return; }

  setTimeout(() => {
    if (!monacoReady && !editor) {
      useFallback('Editor CDN timed out — using plain text editor');
    }
  }, 8000);

  try {
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      if (monacoReady || editor) return;
      const typed = $('code-fallback').value;
      editor = monaco.editor.create($('monaco-host'), {
        value: '',
        language: 'python',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderWhitespace: 'selection',
      });
      monacoReady = true;
      $('monaco-host').style.display = 'block';
      $('code-fallback').style.display = 'none';
      $('editor-status').style.display = 'none';
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => submitCode());
      if (currentQ) setEditorValue(typed || readDraft(currentQ.id, language), language);
    });
  } catch (e) {
    useFallback('Monaco failed to load — using plain text editor');
  }
}

function useFallback(msg) {
  if ($('code-fallback').style.display === 'block') return;
  monacoReady = false;
  $('monaco-host').style.display = 'none';
  $('code-fallback').style.display = 'block';
  $('editor-status').style.display = 'block';
  $('editor-status').textContent = msg + ' (your code still runs normally)';
  if (currentQ && !$('code-fallback').value) {
    $('code-fallback').value = readDraft(currentQ.id, language);
  }
}

function getCode() {
  return monacoReady && editor ? editor.getValue() : $('code-fallback').value;
}

function setEditorValue(value, lang) {
  if (monacoReady && editor) {
    editor.setValue(value || '');
    monaco.editor.setModelLanguage(editor.getModel(), MONACO_LANG[lang] || 'plaintext');
  } else {
    $('code-fallback').value = value || '';
  }
}

/* ── Login / Logout ── */
async function doLogin() {
  const name = $('team-name').value.trim();
  const passcode = $('passcode').value.trim();
  const err = $('login-err');
  err.classList.remove('show');
  if (!name || !passcode) {
    err.textContent = 'Enter both team name and passcode.';
    err.classList.add('show');
    return;
  }

  $('btn-login').disabled = true;
  $('btn-login').textContent = 'Entering…';
  try {
    const res = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, passcode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      err.textContent = data.detail || 'Login failed.';
      err.classList.add('show');
      return;
    }
    session = { id: data.id, name: data.name, token: data.session_token };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    await enterArena();
  } catch (e) {
    err.textContent = 'Cannot reach the server. Is the API running on port 8000?';
    err.classList.add('show');
  } finally {
    $('btn-login').disabled = false;
    $('btn-login').textContent = 'Start Challenge →';
  }
}

function doLogout(silent) {
  clearInterval(clockSyncTimer);
  clearInterval(clockTickTimer);
  sessionStorage.removeItem(SESSION_KEY);
  session = null;
  $('arena-view').style.display = 'none';
  $('login-view').style.display = 'flex';
  $('team-name').value = '';
  $('passcode').value = '';
  if (!silent) showToast('Logged out.');
}

/* ── Arena View ── */
async function enterArena() {
  $('login-view').style.display = 'none';
  $('arena-view').style.display = 'block';
  $('tname').textContent = session.name;
  $('avatar').textContent = (session.name || 'T').charAt(0).toUpperCase();

  if (!monacoReady && !editor) initMonaco();
  startClock();
  await loadQuestions();
}

async function loadQuestions() {
  const res = await api('/api/main/questions');
  if (!res.ok) { showToast('Could not load questions.', 'error'); return; }
  questions = res.data;

  if (!questions.length) {
    $('q-tabs').innerHTML = '<div class="empty">No MAIN questions assigned yet.</div>';
    $('q-title').textContent = 'No Questions Assigned';
    $('q-desc').textContent = 'Please contact the event administrator.';
    return;
  }
  renderTabs();
  selectQuestion(questions[0].id);

  // Update team status / points
  try {
    const statusRes = await fetch(`${API}/api/teams/${session.id}/status`);
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.team) {
        $('points').textContent = statusData.team.points ?? 0;
        const extraSecs = statusData.team.extra_time_seconds || 0;
        if (extraSecs > 0) {
          const eb = $('extra-badge');
          const mins = Math.floor(extraSecs / 60), rem = extraSecs % 60;
          eb.textContent = `+${mins > 0 ? mins + 'm ' : ''}${rem > 0 ? rem + 's' : ''} bonus`;
          eb.classList.add('show');
        }
      }
    }
  } catch (e) { /* ignore status fetch failure */ }
}

function renderTabs() {
  $('q-tabs').innerHTML = questions.map((q, i) => {
    const cls = q.sub_type === 'DEBUGGING' ? 'badge-debug'
              : q.sub_type === 'MATH' ? 'badge-math' : 'badge-leetcode';
    const label = (q.sub_type || 'MAIN').replace('_', ' ');
    const solved = q.status === 'SOLVED';
    return `<button class="q-tab ${q.id === (currentQ && currentQ.id) ? 'active' : ''}" data-id="${q.id}">
      <div class="q-tab-top">
        <span class="q-tab-name">${i + 1}. ${escapeHtml(q.title)}</span>
        <span class="badge ${cls}">${label}</span>
      </div>
      <div class="q-tab-meta">
        <span>${q.points} pts</span>
        <span>${q.attempts} attempt${q.attempts === 1 ? '' : 's'}</span>
        <span class="${solved ? 'ok' : ''}">${solved ? '✓ solved' : 'best ' + q.best_score}</span>
      </div>
    </button>`;
  }).join('');

  $('q-tabs').querySelectorAll('.q-tab').forEach(btn => {
    btn.onclick = () => selectQuestion(parseInt(btn.dataset.id, 10));
  });
}

function selectQuestion(id) {
  if (currentQ) saveDraft();
  currentQ = questions.find(q => q.id === id) || questions[0];

  // Allowed languages
  let allowed = ['python', 'c', 'cpp', 'java'];
  try {
    const parsed = JSON.parse(currentQ.allowed_languages || 'null');
    if (Array.isArray(parsed) && parsed.length) allowed = parsed;
  } catch (e) { /* keep default */ }
  if (!allowed.includes(language)) language = allowed[0];

  $('lang-select').innerHTML = allowed
    .map(l => `<option value="${l}">${LANG_LABELS[l] || l}</option>`).join('');
  $('lang-select').value = language;

  $('q-title').textContent = currentQ.title;
  $('q-desc').textContent = currentQ.description;
  $('q-points').textContent = currentQ.points;
  $('best').textContent = currentQ.best_score;

  const samples = currentQ.visible_tests || [];
  $('q-samples').innerHTML = samples.length
    ? samples.map((t, i) => `
        <div class="sample">
          <div class="sample-row"><span class="k">Input ${i + 1}</span><span class="v">${escapeHtml(t.stdin)}</span></div>
          <div class="sample-row"><span class="k">Output</span><span class="v">${escapeHtml(t.expected_output)}</span></div>
        </div>`).join('')
    : '<div class="hint">No sample tests for this question.</div>';

  setEditorValue(readDraft(currentQ.id, language), language);
  renderTabs();
  clearResults();
}

/* ── Run / Submit ── */
async function runOrSubmit(scored) {
  if (busy || !currentQ) return;
  const source = getCode();
  if (!source.trim()) { showToast('Write some code first.', 'error'); return; }

  saveDraft();
  busy = true;
  $('btn-run').disabled = true;
  $('btn-submit').disabled = true;
  $('btn-submit').textContent = scored ? 'Judging…' : 'Running…';
  $('last-run').textContent = scored ? 'Submitting…' : 'Running samples…';

  try {
    const res = await api(scored ? '/api/main/submit' : '/api/main/run', {
      method: 'POST',
      body: JSON.stringify({ question_id: currentQ.id, language, source_code: source }),
    });

    if (res.status === 429) { showToast(res.data.detail, 'error'); return; }
    if (res.status === 403) { showToast(res.data.detail, 'error'); return; }
    if (!res.ok) {
      showToast((res.data && res.data.detail) || 'Something went wrong.', 'error');
      return;
    }
    renderResults(res.data, scored);

    if (scored) {
      const d = res.data;
      $('best').textContent = d.best_score;
      $('points').textContent = d.team_points;
      currentQ.best_score = d.best_score;
      currentQ.attempts += 1;
      if (d.verdict === 'PASSED') currentQ.status = 'SOLVED';
      renderTabs();
      if (d.score_delta > 0) showToast(`+${d.score_delta} points — best is now ${d.best_score}/${currentQ.points}`, 'success');
      else if (d.verdict === 'PASSED') showToast('All tests passed.', 'success');
      else if (d.verdict === 'PARTIAL') showToast(`${d.tests_passed}/${d.tests_total} tests passed. No change to your best score.`);
      else if (d.verdict === 'ERROR') showToast(d.error_message || 'Judge error — no score changed.', 'error');
    } else {
      showToast(res.data.tests_passed + '/' + res.data.tests_total + ' sample tests passed.');
    }
  } catch (e) {
    if (e.message !== 'Session expired') showToast('Network error: ' + e.message, 'error');
  } finally {
    busy = false;
    $('btn-run').disabled = false;
    $('btn-submit').disabled = false;
    $('btn-submit').textContent = '⚡ Submit';
    $('last-run').textContent = '';
  }
}

function runSamples() { runOrSubmit(false); }
function submitCode() { runOrSubmit(true); }

function clearResults() {
  $('verdict').style.display = 'none';
  $('results').innerHTML = '<div class="empty">Run the samples or submit your solution to see results.</div>';
}

function renderResults(d, scored) {
  const map = {
    PASSED:  ['v-passed',  '#10b981', 'All tests passed'],
    PARTIAL: ['v-partial', '#fbbf24', 'Partial — some tests passed'],
    FAILED:  ['v-failed',  '#ef4444', 'Tests failed'],
    ERROR:   ['v-error',   '#fbbf24', 'Judge error — no score changed'],
    QUEUED:  ['v-error',   '#64748b', 'Queued'],
    JUDGING: ['v-error',   '#64748b', 'Judging…'],
  };
  const [cls, colour, text] = map[d.verdict] || ['v-failed', '#64748b', d.verdict];

  $('verdict').style.display = 'flex';
  $('v-dot').style.background = colour;
  $('v-text').className = 'verdict-text ' + cls;
  $('v-text').textContent = text;

  const stats = [`${d.tests_passed}/${d.tests_total} tests`];
  if (scored) stats.push(`scored ${d.score} pts`, `best ${d.best_score}`);
  if (d.error_message) stats.push(d.error_message);
  $('v-stats').textContent = stats.join('  ·  ');

  const rows = (d.results || []).map((r, i) => {
    const label = r.is_hidden ? `Hidden test ${i + 1}` : `Sample test ${i + 1}`;
    const status = r.judge_status || (r.passed ? 'Accepted' : 'Failed');
    let body = '';

    if (r.compile_output) {
      body += `<pre class="out">${escapeHtml(r.compile_output)}</pre>`;
    } else if (r.is_hidden) {
      body += `<div class="res-hidden-note">Input and expected output are hidden. ${
        r.passed ? 'Your solution produced the correct output.' : 'Your output did not match.'
      }</div>`;
      if (r.stderr) body += `<pre class="out">${escapeHtml(r.stderr)}</pre>`;
    } else {
      body += `<div class="res-io">
        <div><span class="k">input:    </span>${escapeHtml(r.stdin)}</div>
        <div><span class="k">expected: </span>${escapeHtml(r.expected_output)}</div>
        <div><span class="k">your out: </span>${escapeHtml(r.stdout || '(no output)')}</div>
      </div>`;
      if (r.stderr) body += `<pre class="out">${escapeHtml(r.stderr)}</pre>`;
    }

    return `<div class="res-row ${r.passed ? 'pass' : 'fail'}">
      <div class="res-head">
        <span class="res-name">${r.passed ? '✅' : '❌'} ${label}</span>
        <span class="res-status">${escapeHtml(status)}</span>
      </div>
      ${body}
    </div>`;
  });

  $('results').innerHTML = rows.length ? rows.join('') :
    '<div class="empty">No test results returned.</div>';
}

/* ── Clock ── */
function paintClock() {
  const el = $('timer');
  if (clockRemaining == null) { el.textContent = '--:--:--'; return; }
  el.textContent = fmtTime(clockRemaining);
  el.className = clockRemaining <= 0 ? 'timer-expired'
    : clockRemaining < 300 ? 'timer-red'
    : clockRemaining < 900 ? 'timer-yellow' : 'timer-green';
}

async function syncClock() {
  try {
    const res = await api('/api/main/clock');
    if (res.ok && res.data.started) {
      clockRemaining = res.data.seconds_remaining;
      if (res.data.extra_time_seconds > 0) {
        const eb = $('extra-badge');
        const extraSecs = res.data.extra_time_seconds;
        const mins = Math.floor(extraSecs / 60), rem = extraSecs % 60;
        eb.textContent = `+${mins > 0 ? mins + 'm ' : ''}${rem > 0 ? rem + 's' : ''} bonus`;
        eb.classList.add('show');
      }
    }
  } catch (e) { /* keep ticking locally */ }
}

function startClock() {
  syncClock();
  clearInterval(clockSyncTimer);
  clearInterval(clockTickTimer);
  clockSyncTimer = setInterval(syncClock, 15000);
  clockTickTimer = setInterval(() => {
    if (clockRemaining == null) return;
    if (clockRemaining > 0) clockRemaining -= 1;
    paintClock();
  }, 1000);
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  $('btn-login').onclick = doLogin;
  $('passcode').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('team-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('passcode').focus(); });
  $('btn-logout').onclick = () => doLogout(false);
  $('btn-run').onclick = runSamples;
  $('btn-submit').onclick = submitCode;
  $('lang-select').onchange = (e) => {
    if (!currentQ) return;
    saveDraft();
    language = e.target.value;
    setEditorValue(readDraft(currentQ.id, language), language);
  };

  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.token) {
        session = parsed;
        enterArena();
        return;
      }
    } catch (e) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
  $('login-view').style.display = 'flex';
});
