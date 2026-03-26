export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'CHATWORK_API_TOKEN not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'open';

  const res = await fetch(`https://api.chatwork.com/v2/my/tasks?status=${status}`, {
    headers: { 'X-ChatWorkToken': token },
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
