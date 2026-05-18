# Phase 5 — Export + Firebase Persistence

Attach alongside `#file:CONTEXT.md` for this session.
Phase 4 must be fully verified before starting this phase.

---

## Goal

Users can export their generated project as a ZIP or push it to a new GitHub repo. Past projects are saved to Firestore and reload on return visits.

---

## Tasks

### 1. Firebase Setup

Create `lib/firebase/config.ts`:

```ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

Create `.env.local` with all six `NEXT_PUBLIC_FIREBASE_*` variables as empty strings and a comment: `# Fill in from your Firebase project settings`.

---

### 2. `lib/firebase/projects.ts`

Firestore collection: `projects`

Each document stores only the `ProjectPlan` metadata — not the generated file contents (those live on disk).

```ts
// saveProject(plan: ProjectPlan): Promise<void>
//   Upserts a document at projects/{plan.id}
//   Converts plan to a plain object (JSON-safe — no undefined values)
//   Sets updatedAt to Date.now() on every save

// getProject(projectId: string): Promise<ProjectPlan | null>
//   Fetches document at projects/{projectId}
//   Returns null if not found
//   Validates with ProjectPlanSchema (Zod) before returning — return null if validation fails

// listProjects(): Promise<ProjectPlan[]>
//   Queries projects collection, orderBy("updatedAt", "desc"), limit(50)
//   Returns validated ProjectPlan[]
//   Any document that fails Zod validation is silently skipped

// deleteProject(projectId: string): Promise<void>
//   Deletes document at projects/{projectId}
```

---

### 3. `lib/export/zipExport.ts`

```ts
// exportToZip(
//   projectHandle: FileSystemDirectoryHandle,
//   projectName: string
// ): Promise<void>
//
// 1. Import JSZip: import JSZip from "jszip"
// 2. Recursively read all files from projectHandle using a DFS walk:
//    async function walk(dir: FileSystemDirectoryHandle, zip: JSZip, prefix: string)
//    For each entry via dir.values():
//      FileSystemDirectoryHandle → zip.folder(name), recurse
//      FileSystemFileHandle → file.text() → zip.file(prefix + name, content)
// 3. zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } })
// 4. import { saveAs } from "file-saver"
//    saveAs(blob, `${projectName}.zip`)
// 5. Show Sonner success toast: "Downloaded [projectName].zip"
```

---

### 4. `lib/export/githubExport.ts`

```ts
// exportToGitHub(params: {
//   projectHandle: FileSystemDirectoryHandle;
//   repoName: string;
//   description: string;
//   token: string;
//   isPrivate: boolean;
// }): Promise<{ repoUrl: string }>
//
// All Octokit usage MUST be via dynamic import:
// const { Octokit } = await import("@octokit/rest")
// const octokit = new Octokit({ auth: params.token })
//
// Step 1: Create repo
//   octokit.rest.repos.createForAuthenticatedUser({
//     name: params.repoName,
//     description: params.description,
//     private: params.isPrivate,
//     auto_init: false,
//   })
//   Store owner and repo name from response
//
// Step 2: Read all files from projectHandle (same DFS walk as zipExport but collect into Record<path, content>)
//
// Step 3: Create blobs for each file
//   octokit.rest.git.createBlob({ owner, repo, content: btoa(unescape(encodeURIComponent(fileContent))), encoding: "base64" })
//   Collect { path, sha } for each file
//
// Step 4: Create tree
//   octokit.rest.git.createTree({
//     owner, repo,
//     tree: blobs.map(b => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha }))
//   })
//
// Step 5: Create commit
//   octokit.rest.git.createCommit({ owner, repo, message: "Initial commit from Jugaad", tree: treeSha, parents: [] })
//
// Step 6: Create ref (main branch)
//   octokit.rest.git.createRef({ owner, repo, ref: "refs/heads/main", sha: commitSha })
//
// Step 7: Return { repoUrl: `https://github.com/${owner}/${repoName}` }
```

---

### 5. GitHub Export Modal

Create `components/export/GitHubExportModal.tsx`:

Props: `isOpen: boolean`, `onClose: () => void`

Fields:

- Repository name (text input, pre-filled with sanitized project name)
- Description (text input, pre-filled with `plan.description`)
- Visibility: Public / Private toggle
- GitHub Personal Access Token (password input)
  - Helper text: "Needs `repo` scope" with a link to `https://github.com/settings/tokens/new`
  - Token is stored in `localStorage` under `"jugaad-github-token"` for convenience — show a "Saved" indicator if a token is already stored
- "Push to GitHub" button (primary)
- "Cancel" button

States:

- Idle: form visible
- Loading: spinner, "Creating repository...", "Uploading files...", "Finalizing..." (update text as steps progress)
- Success: show repo URL as a clickable link, "View on GitHub" button, close button
- Error: show error message in red, allow retry

---

### 6. Wire Export Buttons into `AppShell` Top Bar

Add to the top bar (right side, before Settings icon):

- "Export ZIP" button with a download icon — calls `exportToZip` directly (no modal needed)
- "Push to GitHub" button with a GitHub icon — opens `GitHubExportModal`

Both buttons are disabled if `fsStore.projectHandle === null`.

Show a loading spinner on "Export ZIP" while the zip is being generated.

---

### 7. Save Projects to Firestore

In `app/studio/new/page.tsx`, after tasks are generated and before navigating to `/studio/[projectId]`:

- Call `saveProject(plan)`
- On error: show Sonner warning toast "Could not save project to cloud — your files are safe locally"
  Do not block navigation on Firestore errors

Also call `saveProject(plan)` whenever `projectPlanStore.updatePlan()` is called (after plan edits).

---

### 8. Project History in Sidebar

Update `components/layout/Sidebar.tsx`:

Add a "Recent Projects" section above the file tree:

- On mount: calls `listProjects()` and renders a list of project name + relative date ("2 days ago")
- Clicking a project:
  1. Loads the plan via `getProject(projectId)`
  2. Sets `projectPlanStore.setPlan(plan)`
  3. Navigates to `/studio/[projectId]`
  4. Note: the file tree will be empty unless the user reconnects their base folder — show an info banner: "Reconnect your base folder to see files"
- Each item has a delete icon (trash) — calls `deleteProject(id)` with a confirmation dialog first, then removes from the local list
- Show a loading skeleton while `listProjects()` is in flight
- If Firestore is not configured (missing env vars): hide this section entirely and show nothing — do not show an error

---

### 9. `.env.local` and `.gitignore`

Ensure `.gitignore` includes:

```
.env.local
.env*.local
```

Ensure `.env.local` template is documented with comments:

```env
# Firebase — get these from Firebase Console > Project Settings > Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Verification

1. ZIP export: clicking "Export ZIP" downloads a `.zip` file — unzipping it produces the correct directory structure matching the generated project
2. GitHub export: completing the modal creates a real GitHub repo with all project files in a single "Initial commit from Jugaad" commit
3. GitHub token persists across page reloads
4. Firestore: completing a plan flow saves a document to the `projects` collection (verify in Firebase Console)
5. Sidebar "Recent Projects" shows past projects on page reload
6. Clicking a past project loads its plan and navigates to the project workspace
7. Deleting a project removes it from Firestore and the sidebar list
8. If `.env.local` Firebase vars are empty: app still loads, ZIP and GitHub export still work, "Recent Projects" section is simply hidden — no errors
9. No TypeScript errors on `npm run dev`
