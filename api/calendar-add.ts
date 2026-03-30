export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return new Response(JSON.stringify({ error: 'Google Calendar credentials not configured' }), { status: 500, headers });
  }

  try {
    const { summary, date, startTime, endTime, allDay } = await req.json();
    if (!summary || !date) {
      return new Response(JSON.stringify({ error: 'summary and date required' }), { status: 400, headers });
    }

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
      throw new Error('Failed to refresh token');
    }

    // Build event object
    let event: any = { summary };

    if (allDay || !startTime) {
      // All-day event
      const nextDay = new Date(date + 'T00:00:00');
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      event.start = { date };
      event.end = { date: nextDayStr };
    } else {
      event.start = { dateTime: `${date}T${startTime}:00+09:00`, timeZone: 'Asia/Tokyo' };
      event.end = {
        dateTime: `${date}T${endTime || addHour(startTime)}:00+09:00`,
        timeZone: 'Asia/Tokyo',
      };
    }

    const eventsRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!eventsRes.ok) {
      const errText = await eventsRes.text();
      throw new Error(`Calendar API error ${eventsRes.status}: ${errText}`);
    }

    const created = await eventsRes.json();
    return new Response(JSON.stringify({ ok: true, id: created.id }), { status: 200, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const nh = Math.min(h + 1, 23);
  return `${String(nh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
