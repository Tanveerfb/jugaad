type ExportParams = {
  projectHandle: FileSystemDirectoryHandle;
  repoName: string;
  token: string;
  org?: string;
  isPrivate: boolean;
};

async function collectFiles(
  handle: FileSystemDirectoryHandle,
  path = "",
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  for await (const [name, entry] of handle.entries()) {
    const entryPath = path ? `${path}/${name}` : name;
    if (entry.kind === "directory") {
      const nested = await collectFiles(
        entry as FileSystemDirectoryHandle,
        entryPath,
      );
      files.push(...nested);
    } else {
      const file = await (entry as FileSystemFileHandle).getFile();
      const content = await file.text();
      files.push({ path: entryPath, content });
    }
  }
  return files;
}

export async function exportToGitHub(
  params: ExportParams,
): Promise<{ url: string }> {
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: params.token });

  // 1. Create repo
  const createParams = {
    name: params.repoName,
    private: params.isPrivate,
    auto_init: false,
  };
  const repoResponse = params.org
    ? await octokit.repos.createInOrg({ org: params.org, ...createParams })
    : await octokit.repos.createForAuthenticatedUser(createParams);

  const owner = repoResponse.data.owner.login;
  const repo = repoResponse.data.name;

  // 2. Collect all files
  const files = await collectFiles(params.projectHandle);

  // 3. Create blobs
  const blobs = await Promise.all(
    files.map((f) =>
      octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(f.content).toString("base64"),
        encoding: "base64",
      }),
    ),
  );

  // 4. Build tree
  const tree = files.map((f, i) => ({
    path: f.path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: blobs[i].data.sha,
  }));

  const treeResponse = await octokit.git.createTree({
    owner,
    repo,
    tree,
  });

  // 5. Create commit
  const commitResponse = await octokit.git.createCommit({
    owner,
    repo,
    message: "Initial commit from Jugaad",
    tree: treeResponse.data.sha,
    parents: [],
  });

  // 6. Update ref
  await octokit.git.createRef({
    owner,
    repo,
    ref: "refs/heads/main",
    sha: commitResponse.data.sha,
  });

  return { url: repoResponse.data.html_url };
}
