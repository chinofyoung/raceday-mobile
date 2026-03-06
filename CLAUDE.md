# RaceDay Mobile — CLAUDE.md

## Dev Commands

```bash
npx expo start          # Start dev server (scan QR with Expo Go)
npx expo run:ios        # Build and run on iOS simulator
npx expo run:android    # Build and run on Android emulator
npx expo start --web    # Run in browser (Metro bundler)
```

## Architecture

**Stack:** Expo Router (file-based routing) + Convex (backend/realtime) + Clerk (auth)

**Providers** (outermost to innermost in `app/_layout.tsx`):
`ClerkProvider` → `ConvexProviderWithClerk` → `ClerkLoaded` → Stack navigator

- Auth guard lives in `<AuthCheck>` component inside `_layout.tsx`; redirects unauthenticated users to `/(auth)/login`
- Dark-mode only (`userInterfaceStyle: "dark"` in `app.json`). No light theme exists.
- Fonts: Barlow + Barlow Condensed (loaded at root layout before splash hides)

## Key Patterns

- **Data layer:** Convex only — no Redux, no Zustand, no REST API calls from screens. Use `useQuery` / `useMutation` from `convex/react`.
- **Design tokens:** Always import from `constants/theme.ts` (`Colors`, `Spacing`, `Radius`, `FontSize`). Do not hardcode color or spacing values.
- **Background location tracking:** `lib/tracking/backgroundTask.ts` registers an `expo-task-manager` task (`raceday-background-location`) that POSTs to `EXPO_PUBLIC_CONVEX_SITE_URL/api/tracking/update` directly via `fetch` (no Convex client available in background tasks). Tracking context (`userId`, `eventId`) is stored in `AsyncStorage` under `tracking_context`.
- **convex/server mock:** Metro redirects any `import from "convex/server"` to `lib/mocks/convex-server.ts` because the shared convex schema files use server-only helpers that don't exist on the client.

## Project Structure

```
app/
  _layout.tsx          # Root layout, providers, auth guard
  index.tsx            # Entry redirect
  (auth)/              # login.tsx — unauthenticated flow
  (tabs)/              # _layout.tsx, index.tsx (home), live.tsx, settings.tsx
  events/[id]/         # Event detail screens

convex/                # SYMLINK → ../raceday-next/convex (shared with Next.js app)
  schema.ts            # Shared DB schema
  events.ts, bibs.ts, registrations.ts, tracking.ts, users.ts, ...

lib/
  hooks/               # useCurrentUser.ts
  mocks/               # convex-server.ts (Metro mock)
  tracking/            # backgroundTask.ts, trackingService.ts, gpxParser.ts
  notifications.ts     # Push notification registration
  tokenCache.ts        # Clerk token cache (expo-secure-store)

constants/
  theme.ts             # Colors, Spacing, Radius, FontSize tokens
  Colors.ts            # Legacy (prefer theme.ts)
```

## Environment

Copy `.env.local` (not committed as `.env.example`). Required vars:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `EXPO_PUBLIC_CONVEX_SITE_URL` | Convex HTTP actions base URL |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |

## Convex Symlink Setup

`convex/` is a symlink to `../raceday-next/convex`. The sibling `raceday-next` project must exist at the same directory level. Metro is configured with:
- `unstable_enableSymlinks: true` — follows the symlink
- `watchFolders` pointing at `../raceday-next/convex` — hot-reloads on schema changes
- Custom `resolveRequest` — mocks `convex/server` for the mobile client

Run `npx convex dev` from the `raceday-next` project to keep the backend in sync.
