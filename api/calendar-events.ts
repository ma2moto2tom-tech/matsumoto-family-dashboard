export const config = { runtime: 'edge' };

export default async function handler() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!clientId || !clientSecret || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'Google Calendar credentials not configured' }),
      { status: 500, headers }
    );
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
    if (!tokenData.access_token) {
      throw new Error('Failed to refresh token: ' + JSON.stringify(tokenData));
    }

    // Get today's events (JST)
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const startOfDay = new Date(
      Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()) - jstOffset
    );
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

    if (!eventsRes.ok) {
      const errText = await eventsRes.text();
      throw new Error(`Calendar API error ${eventsRes.status}: ${errText}`);
    }

    const eventsData = await eventsRes.json();

    // Transform to schedule format
    const schedule = (eventsData.items || []).map((event: any) => {
      const start = event.start?.dateTime || event.start?.date || '';
      const end = event.end?.dateTime || event.end?.date || '';

      let time = '';
      if (start.includes('T')) {
        const startTime = start.slice(11, 16); // "HH:MM"
        const endTime = end.includes('T') ? end.slice(11, 16) : '';
        time = endTime ? `${startTime}-${endTime}` : startTime;
      }

      return {
        id: event.id,
        time,
        title: event.summary || '(タイトルなし)',
        allDay: !start.includes('T'),
        status: event.status,
      };
    });

    return new Response(JSON.stringify({ date: startOfDay.toISOString().slice(0, 10), schedule }), {
      status: 200,
      headers: { ...headers, 'Cache-Control': 's-maxage=60' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
