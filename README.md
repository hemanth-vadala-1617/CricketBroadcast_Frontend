# Cricket Broadcast Stream — UI

React 19 + Vite + TypeScript + Tailwind 4 + TanStack Query + zustand + SignalR. One app, role-based screens:

| Route | Who | What |
|---|---|---|
| `/login` | everyone | JWT sign-in (refresh handled automatically) |
| `/` and `/match/:id` | public | live matches, live score + scorecard |
| `/overlay/:id` | **OBS Browser Source** (no login) | transparent 1920×1080 TV scorebug. `?bg=1` paints the stadium/pitch for previews, `?debug=1` shows the connection state |
| `/scorer/:id` | Scorer/Admin | ball-by-ball scoring console (keyboard shortcuts: `0–6`, `W`, `D`, `N`, `B`, `L`, `S`, `Ctrl+Z`) |
| `/producer/:id` | Producer/Scorer/Admin | show/hide graphics, banner, win-probability, preview |
| `/admin/*` | staff | dashboard, matches (setup → squads → toss → start), tournaments, teams, players, venues, match rules, overlay themes |

The server owns all cricket maths. The UI renders the versioned `MatchState` it receives over SignalR (`src/lib/liveMatch.ts`: one shared connection, version guard, resync on reconnect and every 30 s).

## Run
```powershell
copy .env.example .env.local     # set VITE_API_URL if the API is not on http://localhost:5141
npm install
npm run dev                      # http://localhost:5173
npm test                         # vitest
npm run lint                     # oxlint
npm run build                    # tsc -b && vite build
```
Start the API first (see the backend README). Sign in with the seeded admin (`admin@cricketstream.com`, password from the API's `Seed:AdminPassword`).

## Streaming with OBS
1. Sources → **+ → Browser** → URL `http://<host>:5173/overlay/<matchId>` (copy it from the match hub), width **1920**, height **1080**, leave custom CSS empty.
2. Put your own video/image/camera and microphone underneath; the overlay is transparent.
3. Start Streaming to YouTube/Facebook. Commentary is simply your voice in OBS — there is no commentary feature in the app.

Use video you have the rights to show: broadcaster feeds for IPL/World Cup are rights-protected and platforms will strike them.

## Layout
`src/lib` api client, types, live connection · `src/store` auth/toast · `src/hooks` queries · `src/components` shared UI (`ui.tsx`) and overlay pieces · `src/pages` screens. Screens are lazy-loaded so the overlay never downloads the admin app. Search boxes always come first in a filter bar.
