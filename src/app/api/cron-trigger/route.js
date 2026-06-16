/**
 * Vercel Cron trigger — runs every minute per vercel.json schedule.
 * Forwards the call to the Railway Express /api/cron/send-emails endpoint.
 * Secured by CRON_SECRET so only Vercel (and you) can trigger it.
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBase = process.env.EXPRESS_API_URL;
  if (!apiBase) {
    return Response.json({ error: 'EXPRESS_API_URL not set' }, { status: 503 });
  }

  try {
    const res = await fetch(`${apiBase}/api/cron/send-emails?secret=${secret ?? ''}`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret ?? '' },
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
