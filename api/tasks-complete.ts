export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'CHATWORK_API_TOKEN not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { roomId, taskId } = await request.json();

  const res = await fetch(
    `https://api.chatwork.com/v2/rooms/${roomId}/tasks/${taskId}/status`,
    {
      method: 'PUT',
      headers: {
        'X-ChatWorkToken': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'body=done',
    }
  );

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
