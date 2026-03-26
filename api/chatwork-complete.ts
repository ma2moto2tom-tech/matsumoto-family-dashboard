export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'CHATWORK_API_TOKEN not set' });

  const { roomId, taskId } = req.body;
  if (!roomId || !taskId) return res.status(400).json({ error: 'roomId and taskId required' });

  try {
    const response = await fetch(
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
    if (!response.ok) throw new Error(`Chatwork API error: ${response.status}`);
    const result = await response.json();
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
