// K♡T stats page: downloads, installs and iPhone opens per app (today, 7 days, all time).
// Visitors (who opened the page, country, device) are in Cloudflare Web Analytics.
const APPS = [["captain", "أبناء الشمال · الكابتن"], ["rider", "أبناء الشمال · العميل"], ["mytouch", "My-touch"], ["rafeeq", "رفيق دربك"]];

export async function onRequestGet({ env }) {
  const now = new Date(Date.now() + 3 * 3600e3);
  const today = now.toISOString().slice(0, 10);
  const week = new Date(now - 6 * 864e5).toISOString().slice(0, 10);
  let rows = [];
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, app TEXT NOT NULL, ev TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, app, ev))").run();
    rows = (await env.DB.prepare(
      "SELECT app, ev, SUM(n) AS t, SUM(CASE WHEN day = ?1 THEN n ELSE 0 END) AS d, SUM(CASE WHEN day >= ?2 THEN n ELSE 0 END) AS w FROM hits GROUP BY app, ev"
    ).bind(today, week).all()).results || [];
  } catch (_) {}
  const get = (app, ev, k) => (rows.find(r => r.app === app && r.ev === ev) || {})[k] || 0;
  const sum = (ev, k) => APPS.reduce((a, [id]) => a + get(id, ev, k), 0);
  const cell = (app, ev) => `<td><b>${get(app, ev, "d")}</b><span>${get(app, ev, "w")}</span><i>${get(app, ev, "t")}</i></td>`;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>K♡T · الإحصائيات</title><style>
body{margin:0;min-height:100vh;background:radial-gradient(80% 50% at 50% 0,#2a1b0e,#0b0806 70%);color:#fbf3e4;font:15px/1.6 system-ui,sans-serif;padding:22px 14px}
h1{margin:0 0 4px;text-align:center;font-size:26px;color:#ffd98a;letter-spacing:.04em;direction:ltr}
p.s{margin:0 0 18px;text-align:center;color:#cdbfa8;font-size:13px}
.tot{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
.tot div{padding:12px 6px;border-radius:18px;text-align:center;background:rgba(40,27,16,.8);box-shadow:0 0 0 1.5px rgba(255,201,105,.7),0 0 16px rgba(255,180,60,.25)}
.tot b{display:block;font-size:28px;color:#ffd98a}.tot small{color:#cdbfa8}
table{width:100%;border-collapse:separate;border-spacing:0 8px}
th{font-size:12px;color:#cdbfa8;font-weight:500}td,th{text-align:center;padding:8px 4px}
td:first-child{text-align:right;font-weight:600}
tr.r td{background:rgba(22,15,10,.7)}tr.r td:first-child{border-radius:0 14px 14px 0}tr.r td:last-child{border-radius:14px 0 0 14px}
td b{display:block;font-size:20px;color:#ffd98a}td span,td i{display:block;font-size:11px;color:#cdbfa8;font-style:normal}
.key{margin:14px 0;text-align:center;font-size:12px;color:#cdbfa8}
a.btn{display:block;margin:18px auto 0;max-width:320px;padding:12px;border-radius:30px;text-align:center;font-weight:700;color:#2a1704;text-decoration:none;background:linear-gradient(180deg,#ffd98a,#f2b84b 55%,#b97a1f)}
</style></head><body>
<h1>K♡T ABO TALA K♡R</h1><p class="s">الإحصائيات · ${today}</p>
<div class="tot"><div><b>${sum("download", "t")}</b><small>تنزيل</small></div><div><b>${sum("install", "t")}</b><small>تثبيت / تحديث</small></div><div><b>${sum("open", "t")}</b><small>فتح على آيفون</small></div></div>
<table><tr><th></th><th>تنزيل</th><th>تثبيت</th><th>آيفون</th></tr>
${APPS.map(([id, name]) => `<tr class="r"><td>${name}</td>${cell(id, "download")}${cell(id, "install")}${cell(id, "open")}</tr>`).join("")}
</table>
<p class="key">بكل خانة: <b style="color:#ffd98a">اليوم</b> · آخر ٧ أيام · من البداية</p>
<a class="btn" href="https://dash.cloudflare.com/?to=/:account/web-analytics">الزوار (من وين، وأي جهاز)</a>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
