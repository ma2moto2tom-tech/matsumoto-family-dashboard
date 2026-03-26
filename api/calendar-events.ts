export default async function handler(_req: any, res: any) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return res.status(500).json({ error: 'Google Calendar credentials not configured' });
  }

  try {
    // Refresh access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Failed to refresh token');

    // Get today's events (JST)
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const startOfDay = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()) - jstOffset);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const params = new URLSearchParams({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      timeZone: 'Asia/Tokyo',
    });

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    if (!eventsRes.ok) throw new Error(`Calendar API error: ${eventsRes.status}`);
    const eventsData = await eventsRes.json();

    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(200).json(eventsData.items || []);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
