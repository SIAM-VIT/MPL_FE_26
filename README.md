# MPL Event Platform — Frontend (MPL-FE)

Plain HTML + CSS + JS. **No build step, no Node, no framework.** Every page
references `./assets/…` relatively, so the folder works identically served
from the API at `/ui`, from Live Server, or even from `file://`.

Pairs with the **MPL-BE** repo, which serves these files at `/ui` and
provides the `/api` the pages call. The API must run on **port 8000**
(the pages assume it — see §4).

---

## 1. Pages

| File | Via API (`:8000`) | Via Live Server (`:5500`) | Purpose |
|---|---|---|---|
| `landing.html` | `/ui/landing.html` | `/frontend/landing.html` | entry page — hero, font switcher; Log In → hub |
| `index.html` | `/ui/index.html` | `/frontend/index.html` | arena hub — cards for console / boost / challenge |
| `main.html` | `/ui/main.html` | `/frontend/main.html` | MAIN round coding console ← the editor |
| `boost.html` | `/ui/boost.html` | `/frontend/boost.html` | time boost page (legacy round) |
| `challenge.html` | `/ui/challenge.html` | `/frontend/challenge.html` | challenge page (legacy round) |
| `admin.html` | `/ui/admin.html` | `/frontend/admin.html` | admin panel (passcode gate) |

Flow: `landing.html` → `index.html` (login happens here) → console / boost /
challenge. The landing deliberately has **no login of its own** — the hub
owns the only authentication flow. The hub's challenge card stays locked
until an admin starts a challenge session.

Demo logins (seeded by the backend): Team Alpha / `alpha123`,
Team Beta / `beta123`, Team Gamma / `gamma123`. Admin passcode: `admin123`.

---

## 2. Running

### Option A — single origin via the backend (recommended)

```powershell
cd D:\projects
git clone <backend-repo-url> MPL-BE
git clone <frontend-repo-url> MPL-FE
```

In `MPL-BE/.env`:

```env
FRONTEND_DIR=../MPL-FE
```

Start the API (see MPL-BE §4), open `http://localhost:8000/ui/landing.html`.
One process, one URL, no CORS.

### Option B — separate static server (for editing HTML/CSS)

```powershell
cd D:\projects\MPL-FE
python -m http.server 5500        # or VS Code Live Server on the parent folder
```

then open `http://127.0.0.1:5500/landing.html` (root served) or
`http://127.0.0.1:5500/frontend/landing.html` (project folder served —
adjust to whatever your server uses as root). The API must still run on
port 8000 — the pages call it across origins.

After any change: hard-refresh (`Ctrl+Shift+R`). No server restart is ever
needed for frontend edits.

---

## 3. Structure

```
landing.html index.html main.html boost.html challenge.html admin.html
assets/                  the ONE asset folder — keep it that way
  css/
    shared-theme.css     tokens, glass/cosmic system, bg, stars (every page)
    landing.css          entry-page hero, font switcher
    hub.css              hub cards, locked state, toast
    main.css             console: editor layout, tabs, clock pills
    boost.css            boost page · challenge.css · admin.css
  js/
    cosmic-interaction.js  cursor stars/parallax (every page but landing)
    landing.js           starfield, parallax, font switcher, hub handoff
    hub.js               locked-challenge toast (page is otherwise static)
    main.js              console: login, questions, run/submit, clock, drafts
    boost.js             boost page logic · challenge.js · admin.js
  images/
    mpl-crest.png        the crest (landing badge, headers)
    cosmic-background.jpg  shared backdrop
```

One stylesheet + one script per page, plus the two shared files. If you add
a page, follow the same pattern and reference `assets/…` relatively —
never `/ui/…`, never `/frontend/…`, or the page breaks under the other
serving layout.

---

## 4. API contract (what the backend must provide)

Base URL: `hub/boost/challenge/admin.js` hardcode `http://localhost:8000`;
`main.js` uses same-origin on `:8000`, else falls back to `localhost:8000`.
`landing.js` calls no API at all.

Endpoints used, by page:

| Page | Calls |
|---|---|
| `main.html` | `POST /api/auth/login` (`X-Team-Token` after), `GET /api/main/questions`, `POST /api/main/run`, `POST /api/main/submit`, `GET /api/main/clock`, `GET /api/teams/{id}/status` |
| `boost.html` | login, `GET /api/teams/{id}/status`, `GET /api/questions/{id}`, `GET …/sample-tests` |
| `challenge.html` | login, `GET /api/teams/{id}/status`, `GET /api/questions/{id}`, `GET …/sample-tests` |
| `admin.html` | `admin-passcode` header + `/api/admin/*` (teams, questions, test-cases, challenge/create, assign-boost, mark-solved, leaderboard, judge/health) |

Sessions live in `sessionStorage` (`mpl_team`, `mpl_boost_team`,
`mpl_challenge_team`, `mpl_admin_pass`) — **per tab**, so a second tab
means logging in again. Editor drafts persist per question+language in
`localStorage`, as do the landing font choice and the admin's question
cache. Full endpoint semantics: MPL-BE README §7.

---

## 5. Editing guide

- No toolchain: edit, save, hard-refresh. If a page looks broken, press
  **F12 → Console** first — red lines name the exact missing file or
  failing API call. Fix what it says, nothing else.
- Keep asset references relative (`assets/…`). Page-to-page links are
  bare filenames (`index.html`) for the same reason.
- The Google Fonts `<link>` needs internet; offline machines fall back to
  system fonts (layout unaffected).
- `main.html` is the money page — if you touch the editor, re-verify
  login → questions load → Run → Submit scores → clock ticks against a
  live API before calling it done.
