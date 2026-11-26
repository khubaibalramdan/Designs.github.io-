// Counts one event from the K♡T page: download finished, install tapped, or iPhone app opened.
// Stored per day in the D1 database "kt-stats" (binding DB). No personal data is kept.
const EVENTS = ["download", "install", "open"];
const APPS = ["captain", "rider", "mytouch", "rafeeq"];

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return new Response(null, { status: 403 });
  let b;
  try { b = await request.json(); } catch (_) { return new Response(null, { status: 400 }); }
  if (!b || !EVENTS.includes(b.e) || !APPS.includes(b.app)) return new Response(null, { status: 400 });
  const day = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);   // Jordan time
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, app TEXT NOT NULL, ev TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, app, ev))"),
    env.DB.prepare("INSERT INTO hits (day, app, ev, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, app, ev) DO UPDATE SET n = n + 1").bind(day, b.app, b.e)
  ]);
  return new Response(null, { status: 204 });
}
