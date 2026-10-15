# Silver-BevOS frontend

Plain HTML, CSS and vanilla JavaScript. No build step.

- `index.html` — landing page / session check
- `pages/` — deals, analytics, login
- `js/api.js` — fetch wrapper (session cookie + CSRF header)
- `css/styles.css` — shared styles

## API endpoints the frontend expects

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/me/` | current session |
| POST | `/api/auth/login/` | log in |
| POST | `/api/auth/logout/` | log out |
| GET | `/api/deals/` | list deals |
| GET | `/api/analytics/summary/` | metric key/values |

## Serve locally

    cd frontend && python3 -m http.server 5173

Use the proxy (Vite/Nginx/Compose) so `/api/` reaches Django on port 8000 —
that keeps cookies same-origin and avoids CORS entirely.
