// @octokit/rest MUST always be a dynamic import — never static

type ExportParams = {
  projectPath: string;
  repoName: string;
  description: string;
  token: string;
  isPrivate: boolean;
};

export async function exportToGitHub(
  params: ExportParams,
): Promise<{ repoUrl: string }> {
  // Fetch all files from server API
  const res = await fetch(
    `/api/fs/export?projectPath=${encodeURIComponent(params.projectPath)}`,
  );
  if (!res.ok) throw new Error("Failed to read project files for export");
  const { files } = (await res.json()) as {
    files: { path: string; content: string }[];
  };

  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: params.token });

  // Step 1: Create repo
  const repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
    name: params.repoName,
    description: params.description,
    private: params.isPrivate,
    auto_init: false,
  });

  const owner = repoResponse.data.owner.login;
  const repo = repoResponse.data.name;

  // Step 3: Create blobs
  const blobs = await Promise.all(
    files.map((f) =>
      octokit.rest.git.createBlob({
        owner,
        repo,
        content: btoa(unescape(encodeURIComponent(f.content))),
        encoding: "base64",
      }),
    ),
  );

  // Step 4: Create tree
  const treeResponse = await octokit.rest.git.createTree({
    owner,
    repo,
    tree: blobs.map((b, i) => ({
      path: files[i].path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: b.data.sha,
    })),
  });

  // Step 5: Create commit
  const commitResponse = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: "Initial commit from Jugaad",
    tree: treeResponse.data.sha,
    parents: [],
  });

  // Step 6: Create ref (main branch)
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: "refs/heads/main",
    sha: commitResponse.data.sha,
  });

  return { repoUrl: `https://github.com/${owner}/${repo}` };
}
