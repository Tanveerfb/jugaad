# Phase 6 — Polish + SaaS Prep

Attach alongside `#file:CONTEXT.md` for this session.
Phase 5 must be fully verified before starting this phase.

---

## Goal

The app is production-ready: Firebase Auth gates cloud features, the landing page introduces Jugaad to new users, browser compatibility is handled gracefully, and performance is optimized with lazy loading and Suspense boundaries.

---

## Tasks

### 1. Firebase Auth Setup

Add to `lib/firebase/config.ts`:

```ts
import { getAuth } from "firebase/auth";
export const auth = getAuth(app);
```

Create `lib/firebase/authHelpers.ts`:

```ts
// signInWithGoogle(): Promise<User>
//   import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
//   const provider = new GoogleAuthProvider()
//   const result = await signInWithPopup(auth, provider)
//   return result.user

// signInAnonymously(): Promise<User>
//   import { signInAnonymously as firebaseSignInAnon } from "firebase/auth"
//   const result = await firebaseSignInAnon(auth)
//   return result.user

// signOut(): Promise<void>
//   import { signOut as firebaseSignOut } from "firebase/auth"
//   await firebaseSignOut(auth)

// getCurrentUser(): User | null
//   return auth.currentUser
```

---

### 2. Auth Store

Create `stores/authStore.ts`:

```ts
// State:
//   user: FirebaseUser | null
//   isLoading: boolean
// Actions:
//   setUser(user: FirebaseUser | null): void
//   setIsLoading(val: boolean): void
// No persistence — auth state is managed by Firebase SDK
//
// On module load, call auth.onAuthStateChanged and sync to store:
// auth.onAuthStateChanged(user => useAuthStore.getState().setUser(user))
```

---

### 3. Auth UI

Create `components/auth/AuthModal.tsx`:

Props: `isOpen: boolean`, `onClose: () => void`

Layout — a centered dialog (shadcn `Dialog`) with:

- App logo and name at the top
- "Continue with Google" button (primary) — calls `signInWithGoogle()`
- Divider: "or"
- "Continue as Guest" button (secondary) — calls `signInAnonymously()`
- Small print: "Guest projects are saved locally only. Sign in to sync across devices."
- On success (either path): close modal, show Sonner success toast "Welcome to Jugaad"
- On error: show inline error message below the buttons

---

### 4. Gate Firestore Behind Auth

Update `lib/firebase/projects.ts`:

Wrap all Firestore operations with an auth check:

```ts
function requireAuth(): string {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.uid;
}
```

Update all queries to scope by `uid`:

- Collection path: `users/{uid}/projects` (not top-level `projects`)
- `saveProject`: uses `requireAuth()` to get uid, writes to `users/{uid}/projects/{plan.id}`
- `listProjects`: queries `users/{uid}/projects`
- `deleteProject`: deletes from `users/{uid}/projects/{id}`
- `getProject`: reads from `users/{uid}/projects/{id}`

Anonymous users (`user.isAnonymous === true`): still get a uid from Firebase — they can save projects but those projects are lost if they clear browser data. This is acceptable behavior.

Update sidebar `listProjects` call: only call it if `authStore.user !== null`. If user is null, hide "Recent Projects" and show a "Sign in to sync projects" link instead.

---

### 5. Auth Entry Point in App Shell

Update `components/layout/AppShell.tsx` top bar:

Right side (before Settings icon):

- If `authStore.user === null`: show "Sign in" button → opens `AuthModal`
- If `authStore.user` is anonymous: show "Guest" badge + "Sign in" button
- If authenticated: show user avatar (Google photo URL or initials fallback) + dropdown menu with:
  - User email
  - "Sign out" option → calls `signOut()`, shows Sonner toast "Signed out"

---

### 6. Landing Page (`app/page.tsx`)

Replace the current redirect with a real landing page. Only redirect to `/studio/new` if the user actively clicks a CTA.

Layout (single page, no scroll sections needed — keep it focused):

**Hero section**:

- Large heading: reads `appConfig.name` and `appConfig.tagline`
- Subheading: reads `appConfig.description`
- Two CTAs:
  - "Start Building" (primary) → navigates to `/studio/new`
  - "View on GitHub" (secondary, outline) → reads `appConfig.links.github`
- Small note below CTAs: "Works with Ollama and LM Studio — no cloud AI required"

**How it works section** — 4 steps in a horizontal layout:

1. "Describe your app" — chat with the planning agent
2. "Choose your stack" — pick from curated libraries
3. "Generate tasks" — AI breaks it into files
4. "Build on disk" — files land directly in your chosen folder

**Stack section**:

- Heading: "Works with your stack"
- Badge grid of all stack options from `stackRegistry` (just the labels, no interaction)

**Footer**:

- App name + tagline (from `appConfig`)
- Links from `appConfig.links`
- "Built with Jugaad" — a small self-referential note

Style guidelines:

- Dark background — consistent with the studio shell
- No hero image or illustration needed — keep it minimal and text-forward
- Use Framer Motion for scroll-triggered fade-in on the "How it works" steps

---

### 7. Browser Compatibility Warning

Create `components/shared/BrowserWarning.tsx`:

- Detects if `window.showDirectoryPicker` is undefined
- If unsupported: shows a persistent banner at the top of every page (above `AppShell`):
  "Your browser doesn't support the File System API. Jugaad requires Chrome or Edge 86+. Firefox is not supported."
  - Include a close button that dismisses for the session (store in `sessionStorage`)
  - Banner style: amber/warning color, full width

Render this component in `app/layout.tsx` before the main content.

---

### 8. "Continue Existing Project" Flow

Add a second option in the sidebar under "Recent Projects":

"Open Existing Folder" button — allows the user to point Jugaad at a Next.js project that was previously generated (or any folder) and re-enter the workspace for it.

Behavior:

1. Calls `openBaseFolder()` — user picks the project folder directly (not the parent base folder)
2. Calls `rebuildFileTree(handle)` to populate the file tree
3. Checks if a `jugaad.json` file exists in the root of the folder:
   - If yes: reads it, parses as `ProjectPlan`, loads into `projectPlanStore`
   - If no: creates a minimal stub plan with `name = folder.name` and empty arrays
4. Navigates to `/studio/[plan.id]`

Save a `jugaad.json` file to the project root whenever `saveProject()` is called (in addition to Firestore). This file is the local source of truth for the plan. Write it via `writeFile(projectHandle, "jugaad.json", JSON.stringify(plan, null, 2))`.

---

### 9. Performance Optimizations

Apply these across the codebase:

**Monaco Editor**: already dynamically imported — verify the `ssr: false` dynamic import is correct and there are no hydration warnings.

**Octokit**: already dynamically imported — verify it is never in a static import anywhere.

**`@/lib/export/zipExport.ts`**: add dynamic import for JSZip at the top of the `exportToZip` function:

```ts
const JSZip = (await import("jszip")).default;
```

Remove the static `import JSZip from "jszip"` if present.

**Suspense boundaries**: wrap the following in `<Suspense fallback={<LoadingSkeleton />}>`:

- `FileTree` in the sidebar
- `CodePreview` in the right panel
- The "Recent Projects" list in the sidebar

Create `components/shared/LoadingSkeleton.tsx` — a simple animated pulse skeleton that matches the shape of the component it's wrapping.

**Route-level code splitting**: verify that `/studio/[projectId]/page.tsx` and `/settings/page.tsx` are not imported anywhere that would prevent them from being lazily loaded by Next.js. App Router handles this automatically — just ensure no cross-route static imports.

---

### 10. Settings Page — Full Implementation

Update `app/settings/page.tsx` to add sections beyond the LLM config from Phase 1:

**LLM Configuration** (already built — keep as-is)

**File System**:

- Current base folder: shows `getStoredFolderName()` or "Not set"
- "Change Folder" button — calls `openBaseFolder()`

**Account** (shown only if `authStore.user !== null`):

- User email / "Guest user"
- "Sign out" button
- If anonymous: "Upgrade to full account" button → opens `AuthModal` with Google sign-in only

**Danger Zone**:

- "Clear all local data" button — clears `localStorage`, `sessionStorage`, resets all Zustand stores, reloads the page
- Styled with a red border section, requires a confirmation dialog

---

## Verification

1. Landing page loads at `/` — all three sections render, "Start Building" navigates to `/studio/new`
2. "Sign in" button opens auth modal — Google sign-in works (requires Firebase Auth configured with Google provider in Firebase Console)
3. "Continue as Guest" creates an anonymous Firebase user — recent projects load and save to Firestore under that user's uid
4. Signing out clears the user from the store, hides "Recent Projects", shows "Sign in" button
5. Chrome/Edge: no browser warning banner
6. Firefox: amber warning banner appears, dismisses on close, stays dismissed for the session
7. "Open Existing Folder" picks a previously generated project folder, loads `jugaad.json` if present, populates file tree
8. `jugaad.json` is created in the project root after a successful build
9. `npm run build` completes without errors (no TypeScript or build errors)
10. Lighthouse performance score on landing page: 85+ (verify with Chrome DevTools)
