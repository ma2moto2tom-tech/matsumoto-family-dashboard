export const config = { runtime: 'edge' };

const REPO = 'ma2moto2tom-tech/matsumoto-family-dashboard';
const FILE_PATH = 'TASKS.md';

// Simple string hash function for stable task IDs
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

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
  const body: any = {
    message: `Update tasks ${new Date().toISOString().slice(0, 10)}`,
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

interface Task {
  id: string;
  text: string;
  done: boolean;
  category: string;
  dueDate: string | null;
  doneDate: string | null;
}

interface ParseResult {
  categories: string[];
  tasks: Task[];
}

function parseTasksMd(content: string): ParseResult {
  const tasks: Task[] = [];
  const categoriesSet = new Set<string>();
  let currentCategory = '';

  for (const line of content.split('\n')) {
    // Skip title (single #)
    if (line.match(/^# /)) {
      continue;
    }

    // Category header (##)
    const categoryMatch = line.match(/^## (.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      if (currentCategory) {
        categoriesSet.add(currentCategory);
      }
      continue;
    }

    // Skip if no current category
    if (!currentCategory) continue;

    // Task line
    const taskMatch = line.match(/^- \[([ x])\] (.+)$/);
    if (taskMatch) {
      const done = taskMatch[1] === 'x';
      const remainder = taskMatch[2];

      // Extract due date and done date from HTML comments
      const dueMatch = remainder.match(/<!-- due:(\d{4}-\d{2}-\d{2}) -->/);
      const doneMatch = remainder.match(/<!-- done:(\d{4}-\d{2}-\d{2}) -->/);

      // Remove HTML comments from text
      const text = remainder.replace(/<!-- due:\d{4}-\d{2}-\d{2} -->/g, '').replace(/<!-- done:\d{4}-\d{2}-\d{2} -->/g, '').trim();

      const id = hashCode(currentCategory + text);

      tasks.push({
        id,
        text,
        done,
        category: currentCategory,
        dueDate: dueMatch ? dueMatch[1] : null,
        doneDate: doneMatch ? doneMatch[1] : null,
      });
    }
  }

  return {
    categories: Array.from(categoriesSet),
    tasks,
  };
}

function toTasksMd(data: ParseResult): string {
  const lines: string[] = ['# Tasks\n'];

  // Group tasks by category
  const tasksByCategory = new Map<string, Task[]>();
  for (const category of data.categories) {
    tasksByCategory.set(category, []);
  }

  for (const task of data.tasks) {
    if (!tasksByCategory.has(task.category)) {
      tasksByCategory.set(task.category, []);
    }
    tasksByCategory.get(task.category)!.push(task);
  }

  // Write each category
  for (const [category, categoryTasks] of tasksByCategory) {
    lines.push(`## ${category}`);
    for (const task of categoryTasks) {
      let line = `- [${task.done ? 'x' : ' '}] ${task.text}`;

      // Append due date comment if present
      if (task.dueDate) {
        line += ` <!-- due:${task.dueDate} -->`;
      }

      // Append done date comment if present
      if (task.doneDate) {
        line += ` <!-- done:${task.doneDate} -->`;
      }

      lines.push(line);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export default async function handler(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
      if (!file) return new Response(JSON.stringify({ categories: [], tasks: [] }), { status: 200, headers });
      const data = parseTasksMd(file.content);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...headers, 'Cache-Control': 's-maxage=30' },
      });
    }

    if (req.method === 'POST') {
      const newData = await req.json() as ParseResult;
      const md = toTasksMd(newData);
      const file = await getFile(token);
      const ok = await putFile(token, md, file?.sha);
      if (!ok) throw new Error('Failed to write TASKS.md');
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    if (req.method === 'PUT') {
      const body = await req.json() as { id: string; action: string; text?: string; category?: string; dueDate?: string };
      const file = await getFile(token);
      if (!file) throw new Error('TASKS.md not found');

      const data = parseTasksMd(file.content);
      const taskIndex = data.tasks.findIndex(t => t.id === body.id);
      if (taskIndex === -1) throw new Error('Task not found');

      const task = data.tasks[taskIndex];

      if (body.action === 'toggle') {
        task.done = !task.done;
        if (task.done && !task.doneDate) {
          task.doneDate = new Date().toISOString().slice(0, 10);
        } else if (!task.done) {
          task.doneDate = null;
        }
      } else if (body.action === 'delete') {
        data.tasks.splice(taskIndex, 1);
      } else if (body.action === 'update') {
        if (body.text !== undefined) task.text = body.text;
        if (body.category !== undefined) task.category = body.category;
        if (body.dueDate !== undefined) task.dueDate = body.dueDate;
      }

      const md = toTasksMd(data);
      const ok = await putFile(token, md, file.sha);
      if (!ok) throw new Error('Failed to write TASKS.md');
      return new Response(JSON.stringify({ ok: true, task }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
