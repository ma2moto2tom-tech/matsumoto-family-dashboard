export const config = { runtime: 'edge' };

const REPO = 'ma2moto2tom-tech/matsumoto-family-dashboard';
const FILE_PATH = 'data/memos.json';

async function getFile(token: string): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const raw = atob(json.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  return { content: decoded, sha: json.sha };
}

async function putFile(token: string, content: string, sha?: string): Promise<boolean> {
  const encoded = btoa(
    Array.from(new TextEncoder().encode(content))
      .map(b => String.fromCharCode(b))
      .join('')
  );
  const body: Record<string, unknown> = {
    message: `Update memos ${new Date().toISOString().slice(0, 10)}`,
    content: encoded,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export default async function handler(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not set' }), { status: 500, headers });
  }

  try {
    if (req.method === 'GET') {
      const file = await getFile(token);
      if (!file) return new Response(JSON.stringify({}), { status: 200, headers });
      return new Response(file.content, {
        status: 200,
        headers: { ...headers, 'Cache-Control': 's-maxage=30' },
      });
    }

    if (req.method === 'POST') {
      const newData = await req.json();
      const file = await getFile(token);
      const json = JSON.stringify(newData, null, 2);
      const ok = await putFile(token, json, file?.sha);
      if (!ok) throw new Error('Failed to write memos.json');
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
}
