// Group Ride Dispatch — reads your WhatsApp groups live, pools ride requests, and sends alerts.
// Run: npm start   then open http://localhost:3000

// Ride times like "5pm" are read in this time zone, even on a cloud server that runs on UTC.
process.env.TZ = process.env.TZ || 'America/Chicago';
const path = require('path');
const fs = require('fs');
const express = require('express');
const QRCode = require('qrcode');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const R = require('./lib/rides');

// WhatsApp drops the connection now and then (network change, phone offline, Mac waking up). The library can
// throw from background work when that happens; keep running so the reconnect logic below can do its job.
const HICCUP = /Connection Closed|Connection Failure|Connection Lost|Timed Out|Stream Errored|rate-overlimit|Precondition Required|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i;
process.on('unhandledRejection', e => console.error('WhatsApp hiccup, still running:', (e && e.message) || e));
process.on('uncaughtException', e => {
  if (HICCUP.test((e && e.message) || '')) return console.error('WhatsApp hiccup, still running:', e.message);
  console.error(e); process.exit(1);   // a real bug: stop so it gets noticed (pm2 restarts it)
});

const PORT = +process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');   // on a cloud server, point this at a persistent volume
fs.mkdirSync(DATA, { recursive: true });

// ---------- persistent state ----------
const file = n => path.join(DATA, n);
const load = (n, d) => { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch { return d; } };
const save = (n, v) => { try { fs.writeFileSync(file(n), JSON.stringify(v, null, 1)); } catch (e) { console.error('save failed', n, e.message); } };

const settings = Object.assign({
  groups: [],            // WhatsApp group IDs to watch; empty = none yet
  win: 30, lead: 15, home: 'San Marcos', detour: 25,
  cap: 3,                // seats in your car for passengers
  minPeople: 3,          // a ride is worth taking from this many passengers
  onTheWay: true,        // group riders whose start and destination are along the same route, both directions
  myTrips: [],           // trips you decided to take: {id, from, dest, when}
  extraCities: '',       // your own additions, one per line, e.g. "Bastrop"
  notifySelf: true,      // send alerts to your own "Message yourself" chat
  ntfyTopic: '',         // optional: phone push via the free ntfy app
  alertNewRequests: true,
  alertSkipped: false     // also alert for requests that don't fit your plan
}, load('settings.json', {}));
let messages = load('messages.json', []);
let overrides = load('overrides.json', {});
// Private member IDs (@lid) -> phone numbers, learned from messages and group member lists
let lidPhones = load('lids.json', {});
function learnPhone(lid, pn) {
  if (!lid || !pn || !/@lid$/.test(lid) || !/@s\.whatsapp\.net$/.test(pn)) return false;
  const num = pn.split('@')[0].split(':')[0];
  if (lidPhones[lid] === num) return false;
  lidPhones[lid] = num; return true;
}
const membersFetched = {};
async function loadMembers(ids) {
  let learned = false;
  for (const gid of ids) {
    if (!sock || wa.status !== 'connected' || Date.now() - (membersFetched[gid] || 0) < 6 * 3600000) continue;
    membersFetched[gid] = Date.now();
    try {
      const md = await sock.groupMetadata(gid);
      for (const p of md.participants || []) learned = learnPhone(p.lid || p.id, p.jid) || learned;
    } catch (e) { console.log('Could not read the member list of a group yet (' + e.message + '); will try again later.'); membersFetched[gid] = Date.now() - 5 * 3600000; }
    await new Promise(r => setTimeout(r, 3000));   // gentle pace so WhatsApp doesn't rate-limit
  }
  if (learned) { save('lids.json', lidPhones); recompute(); }
}
let alerted = load('alerted.json', {});
let announced = load('announced.json', {});   // rider ids already reported in a group alert
let primed = false;     // riderId -> true once a pickup reminder went out
delete settings.cities;  // older versions saved a frozen copy of the city list; always use the current one
if (settings.onTheWay === undefined) settings.onTheWay = true;   // group along the route by default
delete settings.sameDest;
const cityList = () => R.DEFAULT_CITIES + '\n' + (settings.extraCities || '');
let cities = R.buildCities(cityList());

let wa = { status: 'starting', qr: null, me: null, groups: load('groups.json', []) };
let sock = null;
let plan = { requests: [], drivers: [], trips: [], cancelled: [] };
const alertsLog = load('alerts.json', []);

// ---------- live updates to the dashboard (Server-Sent Events) ----------
const clients = new Set();
function broadcast(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}
const snapshot = () => ({ live: true, cityNames: R.cityNames(cities), wa: { status: wa.status, qr: wa.qr, me: wa.me, groups: wa.groups }, settings, plan, alerts: alertsLog.slice(0, 30), now: Date.now(), messageCount: messages.filter(m => settings.groups.includes(m.group)).length });

function recompute() {
  const watched = messages.filter(m => settings.groups.includes(m.group) && m.ts > Date.now() - 3 * 86400000)
    .map(m => (!m.senderPhone && lidPhones[m.senderJid] ? { ...m, senderPhone: lidPhones[m.senderJid] } : m));
  const a = R.analyze(watched.map(m => ({ ...m, fromMe: isMine(m) })), cities, overrides);
  const now = Date.now();
  settings.myTrips = (settings.myTrips || []).filter(t => t.when > now - 12 * 3600000);
  const F = R.findRides(a.requests, settings.myTrips, { seats: settings.cap, home: settings.home, now, win: settings.win, detour: settings.detour, minPeople: settings.minPeople, onTheWay: settings.onTheWay !== false });
  plan = { requests: a.requests, drivers: a.drivers, cancelled: a.cancelled, mine: F.mine, worth: F.worth, small: F.small, tooBig: F.tooBig,
    trips: [...F.mine, ...F.worth, ...F.small] };
  // New groups that reached your minimum, and new passengers joining them
  const fresh = R.groupAlerts(plan, announced);
  save('announced.json', announced);
  if (primed && settings.alertNewRequests) fresh.forEach(al => notify(al.title, al.body, { tripId: al.tripId }));
  primed = true;   // on startup, groups that already exist are remembered without alerting
  broadcast('state', snapshot());
}
// Is this message from you? (older saved messages didn't store it, so also compare your number)
const myNumber = () => (wa.me ? wa.me.id.split('@')[0].split(':')[0] : null);
const isMine = m => !!m.fromMe || (!!myNumber() && (m.senderJid || '').split('@')[0].split(':')[0] === myNumber()) || m.sender === 'You';

// ---------- notifications ----------
async function notify(title, body, { level = 'info', tripId = null } = {}) {
  const alert = { id: Date.now() + Math.random().toString(36).slice(2, 6), at: Date.now(), title, body, level, tripId };
  alertsLog.unshift(alert); alertsLog.splice(100); save('alerts.json', alertsLog);
  broadcast('alert', alert);
  console.log(`\n🔔 ${title}\n${body}\n`);
  if (settings.notifySelf && sock && wa.me) {
    try { await sock.sendMessage(wa.me.id, { text: `🔔 *${title}*\n${body}` }); } catch (e) { console.error('self-message failed:', e.message); }
  }
  if (settings.ntfyTopic) {
    try {
      await fetch(`https://ntfy.sh/${encodeURIComponent(settings.ntfyTopic)}`, {
        method: 'POST', body, headers: { Title: title.replace(/[^\x20-\x7E]/g, ''), Priority: level === 'urgent' ? 'high' : 'default', Tags: level === 'urgent' ? 'rotating_light,car' : 'car' }
      });
    } catch (e) { console.error('ntfy push failed:', e.message); }
  }
}

function tripFor(reqId) { return plan.trips.find(t => t.riders.some(r => r.id === reqId)); }

function onNewRequestMessages(ids) {
  if (!settings.alertNewRequests) return;
  for (const id of ids) {
    const msg = messages.find(m => m.id === id);
    const al = msg && R.alertFor(msg, plan, settings.home);
    if (al && (al.kind === 'details' || (al.kind === 'cancel' && announced[plan.cancelled.find(c => c.cancelledAt === msg.ts)?.id]))) notify(al.title, al.body);
  }
}

function checkReminders() {
  const lead = settings.lead * 60000, now = Date.now();
  for (const t of plan.mine || []) {
    if (!t.riders.length || now < t.depart - lead || now > t.depart + 10 * 60000) continue;
    const fresh = t.riders.filter(r => !alerted[r.id]);
    if (!fresh.length) continue;
    fresh.forEach(r => (alerted[r.id] = true)); save('alerted.json', alerted);
    const mins = Math.max(0, Math.round((t.depart - now) / 60000));
    notify(`Leave in ${mins} min: ${t.local ? t.route : t.fromLabel + ' → ' + t.route}`, R.driverBrief(t), { level: 'urgent', tripId: t.id });
  }
}
setInterval(() => { checkReminders(); broadcast('tick', { now: Date.now() }); }, 30000);
setInterval(recompute, 60000);   // the plan depends on the clock (where you can be by when)

// ---------- WhatsApp ----------
function textOf(msg) {
  const m = msg.message || {};
  const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m;
  return inner.conversation || inner.extendedTextMessage?.text || inner.imageMessage?.caption || inner.videoMessage?.caption || '';
}

function ingest(list, live) {
  const known = new Set(messages.map(m => m.id));
  const added = [];
  for (const msg of list) {
    const jid = msg.key?.remoteJid || '';
    if (!jid.endsWith('@g.us')) continue;
    const text = textOf(msg).trim();
    if (!text) continue;
    const id = msg.key.id;
    if (known.has(id)) continue;
    const g = wa.groups.find(x => x.id === jid);
    const senderJid = msg.key.participant || msg.participant || '';
    // When the group hides numbers (@lid IDs), WhatsApp may still include the real number here
    const alt = [msg.key.participantPn, msg.key.participantAlt, msg.participantPn].find(j => j && /@s\.whatsapp\.net$/.test(j));
    const senderPhone = alt ? alt.split('@')[0].split(':')[0] : (lidPhones[senderJid] || null);
    if (alt && learnPhone(senderJid, alt)) save('lids.json', lidPhones);
    messages.push({
      id, group: jid, groupName: g ? g.name : jid,
      senderJid, senderPhone, fromMe: !!msg.key.fromMe, sender: msg.pushName || (msg.key.fromMe ? 'You' : senderJid.split('@')[0]),
      ts: Number(msg.messageTimestamp) * 1000 || Date.now(), text
    });
    known.add(id);
    if (settings.groups.includes(jid)) added.push(id);
  }
  if (!added.length && !live) return;
  const cutoff = Date.now() - 7 * 86400000;
  messages = messages.filter(m => m.ts > cutoff).sort((a, b) => a.ts - b.ts);
  save('messages.json', messages);
  recompute();
  if (live) onNewRequestMessages(added);
  checkReminders();
}

// The full group list is fetched rarely (WhatsApp rate-limits it). Changes are applied from the events themselves.
let groupsBackoff = 0, groupsTimer = null, lastGroupsFetch = 0;
function setGroups(list) {
  wa.groups = list.sort((a, b) => a.name.localeCompare(b.name));
  save('groups.json', wa.groups);
  broadcast('state', snapshot());
}
async function loadGroups(force) {
  if (groupsTimer) return;
  if (!force && Date.now() - lastGroupsFetch < 10 * 60000 && wa.groups.length) return;
  lastGroupsFetch = Date.now();
  try {
    const all = await sock.groupFetchAllParticipating();
    groupsBackoff = 0;
    setGroups(Object.values(all).map(g => ({ id: g.id, name: g.subject || g.id, size: g.participants?.length || 0 })));
  } catch (e) {
    if (/rate/i.test(e.message)) {
      groupsBackoff = Math.min((groupsBackoff || 60000) * 2, 30 * 60000);
      console.log(`WhatsApp asked to slow down. Using the saved group list; will refresh it in ${Math.round(groupsBackoff / 60000)} min.`);
      groupsTimer = setTimeout(() => { groupsTimer = null; loadGroups(true); }, groupsBackoff);
    } else console.error('could not list groups:', e.message);
  }
}
function applyGroupEvents(list) {
  const byId = new Map(wa.groups.map(g => [g.id, { ...g }]));
  for (const g of list || []) {
    if (!g || !g.id) continue;
    const cur = byId.get(g.id) || { id: g.id, name: g.id, size: 0 };
    if (g.subject) cur.name = g.subject;
    if (g.participants) cur.size = g.participants.length;
    byId.set(g.id, cur);
  }
  setGroups([...byId.values()]);
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(file('auth'));
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch { /* use built-in */ }
  sock = makeWASocket({ auth: state, version, logger: pino({ level: 'silent' }), browser: ['Ride Dispatch', 'Chrome', '1.0'], syncFullHistory: false, markOnlineOnConnect: false });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async u => {
    if (u.qr) {
      wa.status = 'scan'; wa.qr = await QRCode.toDataURL(u.qr, { margin: 1, width: 320 });
      console.log('\nScan the QR code: open http://localhost:' + PORT + '  (WhatsApp → Settings → Linked devices → Link a device)\n');
      broadcast('state', snapshot());
    }
    if (u.connection === 'open') {
      wa.status = 'connected'; wa.qr = null;
      wa.me = { id: (sock.user.id.split(':')[0]) + '@s.whatsapp.net', name: sock.user.name || '' };
      console.log('✅ Connected to WhatsApp as', wa.me.name || wa.me.id);
      await loadGroups(); recompute();
      setTimeout(() => loadMembers(settings.groups), 5000);
    }
    if (u.connection === 'close') {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        wa.status = 'logged_out'; console.log('Logged out from the phone. Deleting the saved session; restart to scan again.');
        fs.rmSync(file('auth'), { recursive: true, force: true });
        broadcast('state', snapshot());
        setTimeout(connect, 2000);
      } else {
        wa.status = 'reconnecting'; broadcast('state', snapshot());
        setTimeout(connect, 3000);
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages: list, type }) => ingest(list, type === 'notify'));
  sock.ev.on('messaging-history.set', ({ messages: list }) => ingest(list || [], false));
  sock.ev.on('groups.upsert', applyGroupEvents);
  sock.ev.on('groups.update', applyGroupEvents);
}

// ---------- web dashboard + API ----------
const app = express();
// Password protection. Set DASHBOARD_PASSWORD on any server reachable from the internet.
const PASSWORD = process.env.DASHBOARD_PASSWORD || '';
if (PASSWORD) app.use((req, res, next) => {
  const [, b64 = ''] = (req.headers.authorization || '').split(' ');
  const pass = Buffer.from(b64, 'base64').toString().split(':').slice(1).join(':');
  if (pass === PASSWORD) return next();
  res.set('WWW-Authenticate', 'Basic realm="Ride Dispatch"').status(401).send('Password required.');
});
app.use(express.json());
const page = () => '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>' + fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8') + '</body></html>';
app.get(['/', '/index.html'], (req, res) => res.type('html').send(page()));
app.get('/rides.js', (req, res) => res.sendFile(path.join(__dirname, 'lib', 'rides.js')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/state', (req, res) => res.json(snapshot()));
app.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

app.post('/api/settings', (req, res) => {
  const b = req.body || {};
  if (Array.isArray(b.groups)) { settings.groups = b.groups; setTimeout(() => loadMembers(settings.groups), 1000); }
  if (typeof b.home === 'string' && b.home.trim()) settings.home = b.home.trim();
  if (b.minPeople != null && +b.minPeople >= 1) settings.minPeople = +b.minPeople;
  if (typeof b.onTheWay === 'boolean') settings.onTheWay = b.onTheWay;
  ['win', 'cap', 'lead', 'detour'].forEach(k => { if (b[k] != null && !isNaN(+b[k])) settings[k] = +b[k]; });
  ['notifySelf', 'alertNewRequests', 'alertSkipped'].forEach(k => { if (typeof b[k] === 'boolean') settings[k] = b[k]; });
  if (typeof b.ntfyTopic === 'string') settings.ntfyTopic = b.ntfyTopic.trim().replace(/[^A-Za-z0-9_-]/g, '');
  if (typeof b.extraCities === 'string') { settings.extraCities = b.extraCities; cities = R.buildCities(cityList()); }
  save('settings.json', settings);
  recompute(); checkReminders();
  res.json({ ok: true });
});

app.post('/api/override', (req, res) => {
  const { id, dest, from, when, ignore } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing message id' });
  overrides[id] = ignore ? { ignore: true } : { dest, from: from || undefined, when: +when };
  save('overrides.json', overrides); recompute();
  res.json({ ok: true });
});

app.post('/api/mytrips', (req, res) => {
  const b = req.body || {};
  if (b.remove) settings.myTrips = settings.myTrips.filter(t => t.id !== b.remove);
  else {
    if (!b.dest || !b.when || !(+b.when > 0)) return res.status(400).json({ error: 'Pick where you are going and when you leave.' });
    if ((b.from || settings.home) === b.dest) return res.status(400).json({ error: 'From and To are the same city.' });
    settings.myTrips.push({ id: 't' + Date.now().toString(36), from: b.from || settings.home, dest: b.dest, when: +b.when });
  }
  save('settings.json', settings); recompute(); res.json({ ok: true });
});

app.post('/api/join', async (req, res) => {
  const m = String(req.body?.link || '').match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{10,})/) || String(req.body?.link || '').match(/^([A-Za-z0-9]{10,})$/);
  if (!m) return res.status(400).json({ error: 'That does not look like a WhatsApp group invite link (https://chat.whatsapp.com/...).' });
  if (!sock || wa.status !== 'connected') return res.status(409).json({ error: 'Link your WhatsApp first (scan the QR code).' });
  try {
    const jid = await sock.groupAcceptInvite(m[1]);
    try { const md = await sock.groupMetadata(jid); applyGroupEvents([md]); } catch { applyGroupEvents([{ id: jid }]); }
    if (jid && !settings.groups.includes(jid)) { settings.groups.push(jid); save('settings.json', settings); }
    recompute();
    res.json({ ok: true, id: jid, name: (wa.groups.find(g => g.id === jid) || {}).name || jid });
  } catch (e) { res.status(500).json({ error: 'WhatsApp refused the invite (it may be expired, or you are already in the group): ' + e.message }); }
});

app.post('/api/test-alert', async (req, res) => {
  await notify('Test alert', 'Alerts are working. You will get one like this before every pickup.', { level: 'urgent' });
  res.json({ ok: true });
});

app.post('/api/post-plan', async (req, res) => {
  const t = plan.trips.find(x => x.id === req.body?.tripId);
  if (!t) return res.status(404).json({ error: 'That trip changed. Refresh and try again.' });
  if (!sock || wa.status !== 'connected') return res.status(409).json({ error: 'WhatsApp is not connected.' });
  const group = (t.riders[0] && t.riders[0].group) || settings.groups[0];
  if (!group) return res.status(409).json({ error: 'Pick a group to watch first.' });
  const name = (wa.groups.find(g => g.id === group) || {}).name || 'the group';
  try { await sock.sendMessage(group, { text: R.offerMessage(t) }); res.json({ ok: true, group: name }); }
  catch (e) { res.status(500).json({ error: 'WhatsApp did not accept the message: ' + e.message }); }
});

recompute();   // show saved requests right away, even before WhatsApp reconnects

// Without a password, only this computer can open the dashboard. With one, other devices can too.
const HOST = process.env.HOST || (PASSWORD ? '0.0.0.0' : '127.0.0.1');
app.listen(PORT, HOST, () => console.log(`Dashboard: http://localhost:${PORT}` + (PASSWORD ? ' (password protected)' : ' (this computer only; set DASHBOARD_PASSWORD to allow other devices)')));
connect().catch(e => { console.error('WhatsApp connection failed:', e); wa.status = 'error'; });
