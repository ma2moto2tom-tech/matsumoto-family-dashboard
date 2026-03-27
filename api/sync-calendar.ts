export const config = { runtime: 'edge' };

const REPO = 'ma2moto2tom-tech/matsumoto-family-dashboard';

function dateKey(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

async function getTasksFromGitHub(token: string): Promise<{ tasks: any[]; goals: any[] } | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/TASKS.md`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const raw = atob(json.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const content = new TextDecoder().decode(bytes);

  const today = dateKey();
  let currentDate = '';
  let inGoals = false;
  const tasks: any[] = [];
  const goals: any[] = [];

  for (const line of content.split('\n')) {
    const dm = line.match(/^## (\d{4}-\d{2}-\d{2})/);
    if (dm) { currentDate = dm[1]; inGoals = false; continue; }
    if (currentDate !== today) continue;

    if (line.match(/^### 目標/) || line.match(/^### Goals?/i)) { inGoals = true; continue; }
    if (line.match(/^### /)) { inGoals = false; continue; }

    const tm = line.match(/^- \[([ x])\] (.+)/);
    if (tm) {
      const done = tm[1] === 'x';
      const text = tm[2].trim();
      if (inGoals) goals.push({ text, done });
      else tasks.push({ text, done });
    }
  }

  return { tasks, goals };
}

async function getCalendarAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token || null;
}

async function findBriefingEvent(accessToken: string, today: string): Promise<string | null> {
  const timeMin = `${today}T00:00:00+09:00`;
  const timeMax = `${today}T23:59:59+09:00`;
  const params = new URLSearchParams({
    timeMin, timeMax,
    singleEvents: 'true',
    q: 'ブリーフィング',
    timeZone: 'Asia/Tokyo',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const event = data.items?.find((e: any) => e.summary?.includes('ブリーフィング'));
  return event?.id || null;
}

async function updateBriefingEvent(
  accessToken: string,
  eventId: string,
  tasks: any[],
  goals: any[]
): Promise<boolean> {
  // Build description from tasks
  const lines: string[] = [];
  lines.push('📋 今日やること');
  lines.push('');
  for (const t of tasks) {
    lines.push(`${t.done ? '✅' : '⬜'} ${t.text}`);
  }
  if (goals.length > 0) {
    lines.push('');
    lines.push('🎯 目標');
    for (const g of goals) {
      lines.push(`${g.done ? '✅' : '·'} ${g.text}`);
    }
  }
  const doneCount = tasks.filter((t: any) => t.done).length;
  lines.push('');
  lines.push(`進捗: ${doneCount}/${tasks.length} 完了`);
  lines.push(`最終更新: ${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}`);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description: lines.join('\n') }),
    }
  );
  return res.ok;
}

export default async function handler() {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) throw new Error('GITHUB_TOKEN not set');

    const today = dateKey();
    const taskData = await getTasksFromGitHub(githubToken);
    if (!taskData) {
      return new Response(JSON.stringify({ message: 'No TASKS.md found' }), { status: 200, headers });
    }

    const accessToken = await getCalendarAccessToken();
    if (!accessToken) throw new Error('Failed to get calendar access token');

    const eventId = await findBriefingEvent(accessToken, today);
    if (!eventId) {
      return new Response(JSON.stringify({ message: 'No briefing event found for today' }), { status: 200, headers });
    }

    await updateBriefingEvent(accessToken, eventId, taskData.tasks, taskData.goals);

    return new Response(
      JSON.stringify({ ok: true, date: today, tasks: taskData.tasks.length }),
      { status: 200, headers }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
