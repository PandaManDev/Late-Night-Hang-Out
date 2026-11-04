import express from "express";
import session from "express-session";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getGuildSettings, updateGuildSettings } from "./storage.js";

const GUILD_ID = process.env.GUILD_ID || "1566861965584764990";
// Wispbyte may inject the assigned allocation as PORT/SERVER_PORT.
// Prefer the hosting allocation, then the explicit dashboard setting, then the project default.
// Public Wispbyte dashboard address. Keep this in sync with the Wispbyte subdomain allocation.
const DASHBOARD_PUBLIC_URL = "http://latenightout.wispbyte.org:16210/";
const PORT = Number(process.env.DASHBOARD_PORT || process.env.PORT || process.env.SERVER_PORT || 16210);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function startDashboard(client) {
  const required = ["DASHBOARD_PASSWORD", "DASHBOARD_SESSION_SECRET"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    console.error("Dashboard admin login is not fully configured. Missing:", missing.join(", "));
    console.error("The public /status page will still be available. Add both variables to enable secure admin login.");
  }

  const app = express();
  app.set("trust proxy", 1);
  app.get("/favicon.webp", (req, res) => {
    res.type("image/webp").sendFile("favicon.webp", { root: new URL("../public/", import.meta.url).pathname });
  });
  app.use(express.json({ limit: "32kb" }));
  app.use(session({
    name: "lnho.admin",
    secret: process.env.DASHBOARD_SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: "auto", maxAge: 8 * 60 * 60 * 1000 }
  }));

  async function requireAdmin(req, res, next) {
    if (!req.session.dashboardAuthenticated) return res.status(401).json({ error: "Enter the dashboard password to sign in." });
    try {
      req.guild = await client.guilds.fetch(GUILD_ID);
      req.adminMember = null;
      next();
    } catch (error) {
      console.error("Dashboard guild lookup failed:", error);
      res.status(503).json({ error: "Could not load the Discord server. Try again shortly." });
    }
  }

  const loginAttempts = new Map();
  app.post("/auth/login", (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.blockedUntil > now) return res.status(429).json({ error: "Too many attempts. Wait five minutes and try again." });
    const supplied = String(req.body?.password || "");
    const expected = String(process.env.DASHBOARD_PASSWORD || "");
    const suppliedHash = createHash("sha256").update(supplied).digest();
    const expectedHash = createHash("sha256").update(expected).digest();
    const valid = supplied.length > 0 && timingSafeEqual(suppliedHash, expectedHash);
    if (!valid) {
      const failures = (attempt?.failures || 0) + 1;
      loginAttempts.set(ip, { failures, blockedUntil: failures >= 5 ? now + 300000 : 0 });
      return res.status(401).json({ error: "Incorrect dashboard password." });
    }
    loginAttempts.delete(ip);
    req.session.regenerate(error => {
      if (error) return res.status(500).json({ error: "Could not start a secure session." });
      req.session.dashboardAuthenticated = true;
      req.session.save(saveError => {
        if (saveError) return res.status(500).json({ error: "Could not save your login. Try again." });
        res.json({ ok: true });
      });
    });
  });

  app.get("/auth/login", (req, res) => res.redirect("/"));

  // Public service status endpoint; intentionally does not require dashboard login.
  app.get("/api/status", (req, res) => {
    const online = client.isReady();
    res.set("Cache-Control", "no-store");
    res.json({
      service: "Late Night Hang Out Discord Bot",
      status: online ? "online" : "offline",
      uptimeSeconds: online ? Math.floor(process.uptime()) : 0,
      latencyMs: online && client.ws.ping >= 0 ? client.ws.ping : null,
      checkedAt: new Date().toISOString()
    });
  });

  app.get("/status", (req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Late Night Hang Out | Status</title><link rel="icon" type="image/webp" href="/favicon.webp"><meta name="theme-color" content="#0b1020">
<style>
:root{color-scheme:dark;--bg:#0b1020;--panel:#151d32;--line:#293550;--muted:#9aa8c2;--text:#f3f5ff;--accent:#9b8cff}*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 0,#29204d,var(--bg) 55%);color:var(--text);font:15px system-ui,sans-serif}
header{padding:22px max(20px,calc((100% - 850px)/2));border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:12px}
header a{color:#c9c2ff;text-decoration:none}main{max-width:850px;margin:54px auto;padding:0 20px}.eyebrow{color:#b6aaff;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}
h1{font-size:clamp(30px,6vw,44px);margin:8px 0}.muted{color:var(--muted)}.hero,.metric{background:rgba(21,29,50,.94);border:1px solid var(--line);border-radius:18px;padding:24px}
.hero{margin:26px 0}.statusline{display:flex;align-items:center;gap:12px;font-size:21px;font-weight:700}.dot{width:13px;height:13px;border-radius:50%;background:#f06b79;box-shadow:0 0 18px currentColor}.dot.online{background:#5de0a0;color:#5de0a0}.dot.offline{background:#f06b79;color:#f06b79}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.metric span{display:block;color:var(--muted);font-size:13px}.metric strong{display:block;font-size:25px;margin-top:8px;overflow-wrap:anywhere}
footer{margin-top:28px;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.refresh{border:1px solid var(--line);background:#302b58;color:white;border-radius:9px;padding:9px 13px;cursor:pointer}
@media(max-width:560px){header{padding:16px;align-items:flex-start;flex-direction:column}main{margin:30px auto;padding:0 14px}.hero,.metric{padding:18px}.grid{gap:10px}.metric strong{font-size:21px}}
</style></head><body>
<header><b>🌙 Late Night Hang Out</b><a href="/">Admin dashboard →</a></header>
<main><div class="eyebrow">Service status</div><h1>System status</h1><p class="muted">Live health information for the Late Night Hang Out Discord bot.</p>
<section class="hero"><div class="statusline"><span id="dot" class="dot"></span><span id="status">Checking status…</span></div><p id="description" class="muted">Contacting the bot service.</p></section>
<div class="grid"><section class="metric"><span>Current session uptime</span><strong id="uptime">—</strong></section><section class="metric"><span>Discord gateway latency</span><strong id="latency">—</strong></section></div>
<footer><span id="checked">Waiting for first update</span><button class="refresh" id="refresh">Refresh status</button></footer>
</main>
<script>
const el=id=>document.getElementById(id);
function duration(total){if(!Number.isFinite(total)||total<0)return "—";const d=Math.floor(total/86400),h=Math.floor(total%86400/3600),m=Math.floor(total%3600/60),s=Math.floor(total%60);return (d?d+"d ":"")+(h+"h "+m+"m "+s+"s")}
async function update(){try{const response=await fetch("/api/status",{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);const data=await response.json();const online=data.status==="online";el("dot").className="dot "+(online?"online":"offline");el("status").textContent=online?"All systems operational":"Bot is offline";el("description").textContent=online?"The Discord bot is connected and responding to status checks.":"The bot is not currently connected to Discord. The hosting process may be stopped or reconnecting.";el("uptime").textContent=online?duration(data.uptimeSeconds):"Offline";el("latency").textContent=data.latencyMs===null?"—":data.latencyMs+" ms";el("checked").textContent="Last checked: "+new Date(data.checkedAt).toLocaleTimeString();}catch(error){el("dot").className="dot offline";el("status").textContent="Status unavailable";el("description").textContent="Could not reach the status service. Please try again.";el("uptime").textContent="—";el("latency").textContent="—";el("checked").textContent="Update failed"}}
el("refresh").addEventListener("click",update);update();setInterval(update,15000);
</script></body></html>`);
  });

  app.get("/api/me", requireAdmin, (req, res) => {
    res.json({ user: { tag: "Dashboard administrator" }, guild: req.guild.name });
  });

  app.get("/api/overview", requireAdmin, async (req, res) => {
    const guild = req.guild;
    // Avoid bulk-fetching every guild member here: Discord can rate-limit
    // Gateway opcode 8 requests. memberCount comes from the guild payload.
    res.json({
      name: guild.name,
      memberCount: guild.memberCount,
      channelCount: guild.channels.cache.size,
      roleCount: guild.roles.cache.size,
      botPing: client.ws.ping,
      botUser: client.user.tag,
      settings: getGuildSettings(guild.id)
    });
  });

  app.get("/api/members", requireAdmin, async (req, res) => {
    // Use members already cached by discord.js instead of an unbounded
    // Gateway member request every time the dashboard opens.
    const members = req.guild.members.cache;
    res.json(members.filter(member => !member.user.bot).map(member => ({
      id: member.id, tag: member.user.tag, nickname: member.displayName,
      avatar: member.user.displayAvatarURL(), roles: member.roles.cache.filter(role => role.id !== req.guild.id).map(role => role.name)
    })).slice(0, 200));
  });

  app.get("/api/channels", requireAdmin, async (req, res) => {
    const channels = await req.guild.channels.fetch();
    res.json(channels.filter(channel => channel?.isTextBased() && channel.guild).map(channel => ({ id: channel.id, name: channel.name, type: channel.type })));
  });

  app.post("/api/moderate", requireAdmin, async (req, res) => {
    const { userId, action, minutes, reason } = req.body || {};
    if (!/^\d{17,20}$/.test(String(userId || ""))) return res.status(400).json({ error: "Choose a valid member." });
    const target = await req.guild.members.fetch(userId).catch(() => null);
    if (!target) return res.status(404).json({ error: "Member not found." });
    if (target.id === req.guild.ownerId || target.id === client.user.id || !target.manageable) return res.status(403).json({ error: "That member cannot be moderated by the bot." });
    const why = String(reason || "Dashboard administrator action").slice(0, 500);
    if (action === "kick") await target.kick(why);
    else if (action === "ban") await req.guild.members.ban(target.id, { reason: why });
    else if (action === "timeout") {
      const duration = Number(minutes);
      if (!Number.isInteger(duration) || duration < 1 || duration > 40320) return res.status(400).json({ error: "Timeout must be 1–40320 minutes." });
      if (!target.moderatable) return res.status(403).json({ error: "Bot cannot timeout this member." });
      await target.timeout(duration * 60000, why);
    } else if (action === "untimeout") {
      if (!target.moderatable) return res.status(403).json({ error: "Bot cannot remove this timeout." });
      await target.timeout(null, why);
    } else return res.status(400).json({ error: "Unknown moderation action." });
    res.json({ ok: true, message: `${action} completed for ${target.user.tag}.` });
  });

  app.post("/api/settings", requireAdmin, async (req, res) => {
    const { welcomeChannelId, logChannelId } = req.body || {};
    const updates = {};
    for (const [key, id] of [["welcomeChannelId", welcomeChannelId], ["logChannelId", logChannelId]]) {
      if (id === undefined) continue;
      if (id && !/^\d{17,20}$/.test(String(id))) return res.status(400).json({ error: "Invalid channel ID." });
      const channel = id ? await req.guild.channels.fetch(id).catch(() => null) : null;
      if (id && (!channel?.isTextBased() || !channel.guild || channel.guild.id !== req.guild.id)) return res.status(400).json({ error: "Select a text channel in this server." });
      updates[key] = id || null;
    }
    updateGuildSettings(req.guild.id, updates);
    res.json({ ok: true });
  });

  app.post("/api/announce", requireAdmin, async (req, res) => {
    const channel = await req.guild.channels.fetch(String(req.body?.channelId || "")).catch(() => null);
    const message = String(req.body?.message || "").trim();
    if (!channel?.isTextBased() || !channel.guild || channel.guild.id !== req.guild.id) return res.status(400).json({ error: "Choose a text channel." });
    if (!message || message.length > 2000) return res.status(400).json({ error: "Message must be 1–2000 characters." });
    await channel.send({ content: message, allowedMentions: { parse: [] } });
    res.json({ ok: true });
  });

  app.post("/auth/logout", (req, res) => req.session.destroy(() => { res.clearCookie("lnho.admin"); res.json({ ok: true }); }));

  app.get("/", (req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Late Night Hang Out | Admin</title>
<link rel="icon" type="image/webp" href="/favicon.webp">
<meta name="theme-color" content="#0b1020">
<style>
:root{color-scheme:dark;--bg:#0b1020;--panel:#151d32;--line:#293550;--muted:#9aa8c2;--accent:#8b7cff;--text:#f3f5ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0,#25204a,var(--bg) 45%);color:var(--text);font:15px system-ui, sans-serif}header{padding:26px max(22px,calc((100% - 1100px)/2));border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}main{max-width:1100px;margin:32px auto;padding:0 20px}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.panel,.stat{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px}.stat strong{display:block;font-size:28px;margin-top:8px}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0}.tabs button,button{background:#302b58;color:white;border:1px solid #514a83;border-radius:9px;padding:10px 14px;cursor:pointer}button:hover{filter:brightness(1.2)}input,select,textarea{width:100%;margin:7px 0 14px;padding:11px;border-radius:8px;border:1px solid var(--line);background:#0c1427;color:white}textarea{min-height:110px}label{display:block;color:var(--muted)}.hidden{display:none}.member{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}.member img{width:34px;height:34px;border-radius:50%}.status{color:#8ee5b1}#notice{margin:14px 0;color:#ffcf8a}.header-actions{display:flex;align-items:center;gap:16px}.discord-link{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;background:#5865f2;border-radius:9px;padding:9px 13px;font-weight:600}.discord-link svg{width:20px;height:20px}.discord-link:hover{filter:brightness(1.12)}

/* Responsive layout: phones and small tablets */
@media (max-width: 700px){
  body{font-size:14px}
  header{padding:16px;gap:10px;align-items:flex-start;flex-direction:column}.header-actions{width:100%;justify-content:space-between;flex-wrap:wrap}
  main{margin:18px auto;padding:0 12px}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .panel,.stat{padding:14px;border-radius:12px;margin-bottom:12px}
  .stat strong{font-size:23px}
  .tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0}
  .tabs button{width:100%;min-height:44px;padding:10px 8px}
  button{min-height:44px}
  input,select,textarea{font-size:16px;padding:12px}
  h1{font-size:1.55rem}
  h2{font-size:1.2rem}
  .member{align-items:flex-start;min-width:0}
  .member>div{min-width:0;overflow-wrap:anywhere}
  .member img{flex:0 0 34px}
  #login{margin-top:12px}
}
@media (max-width: 380px){
  .grid{grid-template-columns:1fr}
  header{padding:14px 12px}
  main{padding:0 10px}
  .tabs{grid-template-columns:1fr 1fr}
}
</style></head><body><header><div><b>🌙 Late Night Hang Out</b><div class="muted">Bot administration</div></div><div class="header-actions"><a class="discord-link" href="https://discord.gg/WPshNz87pZ" target="_blank" rel="noopener noreferrer" aria-label="Join our Discord server" title="Join our Discord server"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.7 5.3A18.6 18.6 0 0 0 15.1 4l-.6 1.2a17 17 0 0 0-5 0L8.9 4a18.6 18.6 0 0 0-4.6 1.3C1.4 9.6.6 13.8 1 18a18.8 18.8 0 0 0 5.7 2.9l1.2-2a12 12 0 0 1-1.9-.9l.5-.4a13.4 13.4 0 0 0 11 0l.5.4a12 12 0 0 1-1.9.9l1.2 2A18.8 18.8 0 0 0 23 18c.5-4.9-.8-9-3.3-12.7ZM8.5 15.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg><span>Join Discord</span></a><div id="identity" class="muted"></div></div></header>
<main><section id="login" class="panel"><h1>Admin dashboard</h1><p class="muted">Enter the private dashboard password to continue.</p><form id="loginForm"><label>Dashboard password<input id="dashboardPassword" type="password" autocomplete="current-password" required></label><button type="submit">Sign in</button></form><p id="loginError" class="muted" role="alert"></p></section>
<section id="app" class="hidden"><h1>Dashboard overview</h1><div id="notice"></div><div class="grid" id="stats"></div>
<nav class="tabs"><button data-tab="members">Members</button><button data-tab="moderation">Moderation</button><button data-tab="settings">Settings</button><button data-tab="announce">Announcement</button><button id="logout">Log out</button></nav>
<section id="members" class="panel hidden"><h2>Members</h2><input id="memberSearch" placeholder="Search members"><div id="memberList">Loading…</div></section>
<section id="moderation" class="panel hidden"><h2>Moderation</h2><label>Member ID<input id="targetId" placeholder="Discord user ID"></label><label>Action<select id="action"><option value="timeout">Timeout</option><option value="untimeout">Remove timeout</option><option value="kick">Kick</option><option value="ban">Ban</option></select></label><label>Minutes (for timeout)<input id="minutes" type="number" min="1" max="40320" value="10"></label><label>Reason<input id="reason" maxlength="500" placeholder="Reason"></label><button id="moderate">Run moderation action</button></section>
<section id="settings" class="panel hidden"><h2>Server settings</h2><label>Welcome / goodbye channel<select id="welcome"></select></label><label>Server logs channel<select id="logs"></select></label><button id="saveSettings">Save settings</button></section>
<section id="announce" class="panel hidden"><h2>Post announcement</h2><label>Channel<select id="announceChannel"></select></label><label>Message<textarea id="announceMessage" maxlength="2000"></textarea></label><button id="sendAnnouncement">Send announcement</button></section>
</section></main>
<script>
const $=id=>document.getElementById(id);let members=[];
async function api(path,options={}){let r;try{r=await fetch(path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})}})}catch(e){throw Error('Could not contact the dashboard server. Refresh the page and check the Wispbyte console.')};const raw=await r.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{data={}}if(!r.ok)throw Error(data.error||('Dashboard request failed (HTTP '+r.status+'). Check the Wispbyte console.'));return data}
function notice(s){$('notice').textContent=s}
function showLogin(message=''){ $('login').classList.remove('hidden');$('app').classList.add('hidden');$('identity').textContent='';$('loginError').textContent=message; }
function fillSelect(el,channels,selected){el.innerHTML='<option value="">Not configured</option>'+channels.map(c=>'<option value="'+c.id+'">#'+c.name.replace(/[&<>"]/g,'')+'</option>').join('');el.value=selected||''}
async function init(){try{const me=await api('/api/me');const [overview,channels]=await Promise.all([api('/api/overview'),api('/api/channels')]);$('login').classList.add('hidden');$('app').classList.remove('hidden');$('identity').textContent=me.user.tag+' · '+me.guild;$('stats').innerHTML=[['Members',overview.memberCount],['Channels',overview.channelCount],['Roles',overview.roleCount],['Bot ping',overview.botPing+' ms']].map(x=>'<div class="stat"><span class="muted">'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('');for(const id of ['welcome','logs','announceChannel'])fillSelect($(id),channels,id==='welcome'?overview.settings.welcomeChannelId:id==='logs'?overview.settings.logChannelId:null);members=await api('/api/members');renderMembers();}catch(e){if(String(e.message).includes('HTTP 401'))showLogin('Enter the dashboard password to sign in.');else showLogin(e.message);}}
function renderMembers(){const q=$('memberSearch').value.toLowerCase();$('memberList').innerHTML=members.filter(m=>(m.tag+' '+m.nickname+' '+m.id).toLowerCase().includes(q)).map(m=>'<div class="member"><img src="'+m.avatar+'"><div><b>'+m.nickname.replace(/[&<>"]/g,'')+'</b><div class="muted">'+m.tag+' · '+m.id+'</div></div></div>').join('')||'No members found.'}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{['members','moderation','settings','announce'].forEach(id=>$(id).classList.add('hidden'));$(b.dataset.tab).classList.remove('hidden')});
$('memberSearch').oninput=renderMembers;
$('moderate').onclick=async()=>{try{const d=await api('/api/moderate',{method:'POST',body:JSON.stringify({userId:$('targetId').value,action:$('action').value,minutes:$('minutes').value,reason:$('reason').value})});notice(d.message)}catch(e){notice(e.message)}};
$('saveSettings').onclick=async()=>{try{await api('/api/settings',{method:'POST',body:JSON.stringify({welcomeChannelId:$('welcome').value,logChannelId:$('logs').value})});notice('Settings saved.')}catch(e){notice(e.message)}};
$('sendAnnouncement').onclick=async()=>{try{await api('/api/announce',{method:'POST',body:JSON.stringify({channelId:$('announceChannel').value,message:$('announceMessage').value})});notice('Announcement sent.')}catch(e){notice(e.message)}};
$('loginForm').onsubmit=async event=>{event.preventDefault();$('loginError').textContent='';try{await api('/auth/login',{method:'POST',body:JSON.stringify({password:$('dashboardPassword').value})});$('dashboardPassword').value='';await init()}catch(e){$('loginError').textContent=e.message}};
$('logout').onclick=async()=>{await api('/auth/logout',{method:'POST'});location.reload()};init();
</script></body></html>`);
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Admin dashboard listening on 0.0.0.0:${PORT}`);
    console.log(`Dashboard URL: ${DASHBOARD_PUBLIC_URL}`);
  });
  server.on("error", error => {
    console.error(`Admin dashboard failed to listen on 0.0.0.0:${PORT}:`, error);
  });
}
