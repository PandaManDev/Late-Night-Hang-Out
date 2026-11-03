import express from "express";
import session from "express-session";
import { PermissionFlagsBits } from "discord.js";
import { getGuildSettings, updateGuildSettings } from "./storage.js";

const ADMIN_ROLE_IDS = new Set([
  "1566890802943103107",
  "1566891359908929637",
  "1566891462984073276",
  "1566891555300704256"
]);
const GUILD_ID = process.env.GUILD_ID || "1566861965584764990";
const PORT = Number(process.env.DASHBOARD_PORT || 16210);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function startDashboard(client) {
  const required = ["DISCORD_CLIENT_SECRET", "DASHBOARD_SESSION_SECRET"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    console.error("Dashboard disabled. Missing environment variables:", missing.join(", "));
    return;
  }

  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.use(session({
    name: "lnho.admin",
    secret: process.env.DASHBOARD_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.DASHBOARD_HTTPS === "true", maxAge: 8 * 60 * 60 * 1000 }
  }));

  async function requireAdmin(req, res, next) {
    try {
      if (!req.session.discordUser?.id) return res.status(401).json({ error: "Please sign in with Discord." });
      const guild = await client.guilds.fetch(GUILD_ID);
      const member = await guild.members.fetch(req.session.discordUser.id).catch(() => null);
      if (!member || !member.roles.cache.some(role => ADMIN_ROLE_IDS.has(role.id))) {
        req.session.destroy(() => {});
        return res.status(403).json({ error: "You do not have an approved admin role." });
      }
      req.adminMember = member;
      req.guild = guild;
      next();
    } catch (error) {
      console.error("Dashboard authorization failed:", error);
      res.status(503).json({ error: "Could not verify server membership. Try again shortly." });
    }
  }

  app.get("/auth/login", (req, res) => {
    const state = cryptoRandom();
    req.session.oauthState = state;
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      response_type: "code",
      redirect_uri: process.env.DASHBOARD_REDIRECT_URI || `http://78.154.103.7:${PORT}/auth/callback`,
      scope: "identify",
      state
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

  app.get("/auth/callback", async (req, res) => {
    try {
      if (!req.query.code || !req.query.state || req.query.state !== req.session.oauthState) {
        return res.status(400).send("Invalid login state. Please go back and sign in again.");
      }
      delete req.session.oauthState;
      const body = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: String(req.query.code),
        redirect_uri: process.env.DASHBOARD_REDIRECT_URI || `http://78.154.103.7:${PORT}/auth/callback`
      });
      const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      if (!tokenResponse.ok) throw new Error("Discord token exchange failed");
      const token = await tokenResponse.json();
      const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      if (!userResponse.ok) throw new Error("Could not read Discord profile");
      req.session.discordUser = await userResponse.json();
      res.redirect("/");
    } catch (error) {
      console.error("Dashboard login failed:", error);
      res.status(401).send("Discord login failed. Check the OAuth settings and try again.");
    }
  });

  app.get("/api/me", requireAdmin, (req, res) => {
    res.json({ user: { id: req.adminMember.id, tag: req.adminMember.user.tag, avatar: req.adminMember.user.displayAvatarURL() }, guild: req.guild.name });
  });

  app.get("/api/overview", requireAdmin, async (req, res) => {
    const guild = req.guild;
    await guild.members.fetch().catch(() => {});
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
    const members = await req.guild.members.fetch();
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
    const why = String(reason || `Dashboard action by ${req.adminMember.user.tag}`).slice(0, 500);
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

  app.post("/auth/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

  app.get("/", (req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Late Night Hang Out | Admin</title>
<style>
:root{color-scheme:dark;--bg:#0b1020;--panel:#151d32;--line:#293550;--muted:#9aa8c2;--accent:#8b7cff;--text:#f3f5ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0,#25204a,var(--bg) 45%);color:var(--text);font:15px system-ui, sans-serif}header{padding:26px max(22px,calc((100% - 1100px)/2));border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}main{max-width:1100px;margin:32px auto;padding:0 20px}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.panel,.stat{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px}.stat strong{display:block;font-size:28px;margin-top:8px}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0}.tabs button,button{background:#302b58;color:white;border:1px solid #514a83;border-radius:9px;padding:10px 14px;cursor:pointer}button:hover{filter:brightness(1.2)}input,select,textarea{width:100%;margin:7px 0 14px;padding:11px;border-radius:8px;border:1px solid var(--line);background:#0c1427;color:white}textarea{min-height:110px}label{display:block;color:var(--muted)}.hidden{display:none}.member{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}.member img{width:34px;height:34px;border-radius:50%}.status{color:#8ee5b1}#notice{margin:14px 0;color:#ffcf8a}
</style></head><body><header><div><b>🌙 Late Night Hang Out</b><div class="muted">Bot administration</div></div><div id="identity" class="muted"></div></header>
<main><section id="login" class="panel"><h1>Admin dashboard</h1><p class="muted">Sign in with Discord. Only members with one of the server's approved admin roles can enter.</p><a href="/auth/login"><button>Sign in with Discord</button></a></section>
<section id="app" class="hidden"><h1>Dashboard overview</h1><div id="notice"></div><div class="grid" id="stats"></div>
<nav class="tabs"><button data-tab="members">Members</button><button data-tab="moderation">Moderation</button><button data-tab="settings">Settings</button><button data-tab="announce">Announcement</button><button id="logout">Log out</button></nav>
<section id="members" class="panel hidden"><h2>Members</h2><input id="memberSearch" placeholder="Search members"><div id="memberList">Loading…</div></section>
<section id="moderation" class="panel hidden"><h2>Moderation</h2><label>Member ID<input id="targetId" placeholder="Discord user ID"></label><label>Action<select id="action"><option value="timeout">Timeout</option><option value="untimeout">Remove timeout</option><option value="kick">Kick</option><option value="ban">Ban</option></select></label><label>Minutes (for timeout)<input id="minutes" type="number" min="1" max="40320" value="10"></label><label>Reason<input id="reason" maxlength="500" placeholder="Reason"></label><button id="moderate">Run moderation action</button></section>
<section id="settings" class="panel hidden"><h2>Server settings</h2><label>Welcome / goodbye channel<select id="welcome"></select></label><label>Server logs channel<select id="logs"></select></label><button id="saveSettings">Save settings</button></section>
<section id="announce" class="panel hidden"><h2>Post announcement</h2><label>Channel<select id="announceChannel"></select></label><label>Message<textarea id="announceMessage" maxlength="2000"></textarea></label><button id="sendAnnouncement">Send announcement</button></section>
</section></main>
<script>
const $=id=>document.getElementById(id);let members=[];
async function api(path,options={}){const r=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Request failed');return data}
function notice(s){$('notice').textContent=s}
function fillSelect(el,channels,selected){el.innerHTML='<option value="">Not configured</option>'+channels.map(c=>'<option value="'+c.id+'">#'+c.name.replace(/[&<>"]/g,'')+'</option>').join('');el.value=selected||''}
async function init(){try{const [me,overview,channels]=await Promise.all([api('/api/me'),api('/api/overview'),api('/api/channels')]);$('login').classList.add('hidden');$('app').classList.remove('hidden');$('identity').textContent=me.user.tag+' · '+me.guild;$('stats').innerHTML=[['Members',overview.memberCount],['Channels',overview.channelCount],['Roles',overview.roleCount],['Bot ping',overview.botPing+' ms']].map(x=>'<div class="stat"><span class="muted">'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('');for(const id of ['welcome','logs','announceChannel'])fillSelect($(id),channels,id==='welcome'?overview.settings.welcomeChannelId:id==='logs'?overview.settings.logChannelId:null);members=await api('/api/members');renderMembers();}catch(e){$('login').classList.remove('hidden');$('app').classList.add('hidden');$('identity').textContent='';$('login').insertAdjacentHTML('beforeend','<p id="loginError" class="muted">'+e.message+'</p>')}}
function renderMembers(){const q=$('memberSearch').value.toLowerCase();$('memberList').innerHTML=members.filter(m=>(m.tag+' '+m.nickname+' '+m.id).toLowerCase().includes(q)).map(m=>'<div class="member"><img src="'+m.avatar+'"><div><b>'+m.nickname.replace(/[&<>"]/g,'')+'</b><div class="muted">'+m.tag+' · '+m.id+'</div></div></div>').join('')||'No members found.'}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('main section[id]').forEach(s=>s.classList.add('hidden'));$(b.dataset.tab).classList.remove('hidden')});
$('memberSearch').oninput=renderMembers;
$('moderate').onclick=async()=>{try{const d=await api('/api/moderate',{method:'POST',body:JSON.stringify({userId:$('targetId').value,action:$('action').value,minutes:$('minutes').value,reason:$('reason').value})});notice(d.message)}catch(e){notice(e.message)}};
$('saveSettings').onclick=async()=>{try{await api('/api/settings',{method:'POST',body:JSON.stringify({welcomeChannelId:$('welcome').value,logChannelId:$('logs').value})});notice('Settings saved.')}catch(e){notice(e.message)}};
$('sendAnnouncement').onclick=async()=>{try{await api('/api/announce',{method:'POST',body:JSON.stringify({channelId:$('announceChannel').value,message:$('announceMessage').value})});notice('Announcement sent.')}catch(e){notice(e.message)}};
$('logout').onclick=async()=>{await api('/auth/logout',{method:'POST'});location.reload()};init();
</script></body></html>`);
  });

  const cryptoRandom = () => {
    const bytes = new Uint8Array(24);
    globalThis.crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  };

  app.listen(PORT, "0.0.0.0", () => console.log(`Admin dashboard listening on port ${PORT}`));
}
