const GITHUB_API = "https://api.github.com";

type DeployFile = { path: string; data: Buffer };

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubJson(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { ...authHeaders(token), ...(init?.headers || {}) } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `GitHub API error: ${res.status}`);
  }
  return data;
}

/**
 * Pushes `files` as a single new commit that becomes the repo's entire
 * tree — a full replacement, not a merge with what's already there. This
 * matches "هر دفعه کل فایل رو بدی" (every time you give me the whole
 * project): whatever isn't in this batch of files gets removed from the
 * repo, exactly like a clean re-upload.
 *
 * Works with any Git-connected host (Netlify, Vercel, Cloudflare Pages...)
 * because none of this talks to the host directly — it just pushes to
 * GitHub, and the host's own "auto-deploy on push" does the rest, which is
 * also why this file doesn't need to know or care which host is in use.
 */
export async function pushFullReplacement(
  files: DeployFile[],
  opts: { token: string; owner: string; repo: string; branch: string }
) {
  const { token, owner, repo, branch } = opts;
  const base = `${GITHUB_API}/repos/${owner}/${repo}`;

  // 1. Current branch tip, so the new commit has the right parent.
  const ref = await githubJson(`${base}/git/ref/heads/${branch}`, token);
  const parentCommitSha = ref.object.sha;

  // 2. Upload each file's content as a blob (bounded concurrency).
  const CONCURRENCY = 8;
  const blobEntries: { path: string; sha: string }[] = [];
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (f) => {
        const blob = await githubJson(`${base}/git/blobs`, token, {
          method: "POST",
          body: JSON.stringify({ content: f.data.toString("base64"), encoding: "base64" }),
        });
        return { path: f.path, sha: blob.sha as string };
      })
    );
    blobEntries.push(...results);
  }

  // 3. A brand-new tree with NO base_tree — this is what makes it a full
  // replacement rather than a merge/patch of the existing tree.
  const tree = await githubJson(`${base}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({
      tree: blobEntries.map((e) => ({ path: e.path, mode: "100644", type: "blob", sha: e.sha })),
    }),
  });

  // 4. Commit it, with the old branch tip as the parent (so history/PR
  // diffs still make sense even though the tree is a full swap).
  const commit = await githubJson(`${base}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: `Z update via admin panel ZIP upload — ${new Date().toISOString()}`,
      tree: tree.sha,
      parents: [parentCommitSha],
    }),
  });

  // 5. Move the branch pointer to the new commit — this is the moment the
  // push "happens" and the connected host (Netlify/Vercel/etc.) picks it
  // up via its webhook and starts building.
  await githubJson(`${base}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  return { commitSha: commit.sha as string, commitUrl: `https://github.com/${owner}/${repo}/commit/${commit.sha}` };
}

/**
 * Optional: if Netlify credentials are also configured, look up the most
 * recent deploy for the site so the admin UI can show live build status
 * instead of just "pushed, check your dashboard".
 */
export async function getLatestNetlifyDeployStatus(opts: { token: string; siteId: string }) {
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${opts.siteId}/deploys?per_page=1`, {
    headers: { Authorization: `Bearer ${opts.token}` },
  });
  if (!res.ok) return null;
  const deploys = await res.json();
  const latest = deploys?.[0];
  if (!latest) return null;
  return {
    state: latest.state as string, // 'building' | 'ready' | 'error' | ...
    deployUrl: latest.deploy_ssl_url || latest.deploy_url,
  };
}
