export default async function handler(_req: any, res: any) {
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'CHATWORK_API_TOKEN not set' });

  try {
    const response = await fetch('https://api.chatwork.com/v2/my/tasks?status=open', {
      headers: { 'X-ChatWorkToken': token },
    });
    if (!response.ok) throw new Error(`Chatwork API error: ${response.status}`);
    const tasks = await response.json();
    res.setHeader('Cache-Control', 's-maxage=30');
    return res.status(200).json(tasks);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
