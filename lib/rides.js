// Ride-request understanding and pooling. No WhatsApp code here, so it runs in Node (server) and in the browser (offline mode).
(function (root) {
'use strict';

const DEFAULT_CITIES = [
  'Austin Airport (AUS): aus airport, aus, bergstrom, austin airport, abia, airport',
  'San Antonio Airport (SAT): sat airport, san antonio airport',
  'Houston Airport (IAH): iah, bush airport',
  'Dallas Airport (DFW): dfw airport, dfw',
  'Austin: atx, downtown austin, ut austin',
  'San Antonio: sa, satx, san antone',
  'Houston: htx, hou',
  'Dallas',
  'Fort Worth',
  'New Braunfels: nb',
  'Kyle', 'Buda', 'Round Rock', 'Seguin', 'Lockhart', 'Wimberley',
  'College Station', 'Waco', 'Georgetown', 'Pflugerville', 'Cedar Park', 'Killeen', 'Temple', 'Corpus Christi',
  'San Marcos: sm, smtx, txst, texas state'
].join('\n');

// Coordinates let the planner put cities that are on the way into one car (e.g. Kyle + Austin).
// Cities you add yourself without coordinates still pool, but only with riders going to the exact same place.
const COORDS = {
  'austin airport (aus)': [30.1975, -97.6664], 'san antonio airport (sat)': [29.5337, -98.4698],
  'houston airport (iah)': [29.9902, -95.3368], 'dallas airport (dfw)': [32.8998, -97.0403],
  'austin': [30.2672, -97.7431], 'san antonio': [29.4241, -98.4936], 'houston': [29.7604, -95.3698],
  'dallas': [32.7767, -96.797], 'fort worth': [32.7555, -97.3308], 'new braunfels': [29.703, -98.1245],
  'kyle': [29.9891, -97.8772], 'buda': [30.0852, -97.8403], 'round rock': [30.5083, -97.6789],
  'seguin': [29.5688, -97.9647], 'lockhart': [29.8849, -97.67], 'wimberley': [29.9974, -98.0986],
  'college station': [30.628, -96.3344], 'waco': [31.5493, -97.1467], 'georgetown': [30.6333, -97.677],
  'pflugerville': [30.4394, -97.62], 'cedar park': [30.5052, -97.8203], 'killeen': [31.1171, -97.7278],
  'temple': [31.0982, -97.3428], 'corpus christi': [27.8006, -97.3964], 'san marcos': [29.8833, -97.9414]
};

function buildCities(text) {
  const index = [];
  String(text || DEFAULT_CITIES).split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const i = line.indexOf(':');
    const n = (i < 0 ? line : line.slice(0, i)).trim();
    const rest = i < 0 ? '' : line.slice(i + 1);
    const aliases = [n.toLowerCase().replace(/\s*\(.*\)/, '')]
      .concat(rest.split(',').map(a => a.trim().toLowerCase()).filter(Boolean));
    aliases.forEach(a => { index.push({ alias: a, name: n }); if (a.includes(' ')) index.push({ alias: a.replace(/ /g, ''), name: n }); });
  });
  return index.sort((a, b) => b.alias.length - a.alias.length);
}
const cityNames = cities => [...new Set(cities.map(c => c.name))].sort((a, b) => a.localeCompare(b));

const CANCEL_WORDS = /\b(nvm|never ?mind|cancel(l?ed)?|no longer need|don'?t need (a |the )?ride( anymore)?|found a ride|got a ride|already got (a )?ride|sorted now|not going anymore)\b/i;
const RIDE_WORDS = /\b(ride|rides|lift|carpool|car pool|going to|heading to|goin to|headed to|anyone (going|driving|headed|heading)|drop(ping)? (me|off)|pick ?up|need (a )?(way|someone) to|to the airport|leaving for)\b/i;
const DRIVER_WORDS = /\b(i'?m|i am|im|we'?re|am)\s+(driving|heading|leaving|going)\b.*\b(seats?|spots?|room|can take|space)\b|\b(have|got)\s+(\d+|a|one|two|three|four)\s+(open\s+)?(seats?|spots?)\b|\bcan (take|fit|carry)\s+(\d+|two|three|four)\b|\boffering (a )?ride|\bwho needs a ride\b|\b(rides?|seats?|spots?)\s+(is\s+|are\s+)?available\b|\bavailable\s+(rides?|seats?|spots?)\b|\bgiving (a )?ride|\bcan (give|offer) (a |you a )?ride|\banyone (need|want)s? (a )?ride\b|\bwho (wants|needs) (a )?ride\b/i;
const ASKING_FOR_RIDE = /\b(is there|are there|does anyone have|anyone have|any)\s+(a\s+)?(rides?|seats?|spots?)\b/i;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const NUMW = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every city mentioned, with whether it follows "to" or "from".
function cityMentions(text, cities) {
  let t = ' ' + text.toLowerCase().replace(/[^a-z0-9()' ]+/g, ' ') + ' ';
  const found = [];
  for (const c of cities) {             // longest aliases first; blank out matches so "austin airport" isn't also "austin"
    const re = new RegExp('(^|[^a-z])' + reEsc(c.alias) + '(?=[^a-z]|$)', 'g');
    let m;
    while ((m = re.exec(t))) {
      const start = m.index + m[1].length;
      const before = t.slice(Math.max(0, start - 14), start);
      found.push({ name: c.name, pos: start,
        to: /\b(to|for|towards?|into|in)\s*(the\s*)?$/.test(before) || /->\s*$|→\s*$/.test(before),
        from: /\b(from|leaving|out of|back from)\s*(the\s*)?$/.test(before) });
      t = t.slice(0, start) + ' '.repeat(c.alias.length) + t.slice(start + c.alias.length);
    }
  }
  return found.sort((a, b) => a.pos - b.pos);
}

function findRoute(text, cities) {
  const ms = cityMentions(text, cities);
  if (!ms.length) return { dest: null, from: null, froms: [] };
  const from = ms.find(m => m.from);
  const to = ms.find(m => m.to && m !== from) || ms.find(m => m !== from && !m.from);
  // "Austin to Kyle" with no markers: first is origin, second is destination
  if (!from && ms.length >= 2 && !ms[0].to && ms[1].to) return { from: ms[0].name, froms: [ms[0].name], dest: ms[1].name };
  let froms = from ? [from.name] : [];
  if (from && to && to.pos > from.pos) froms = [...new Set(ms.filter(m => m.pos >= from.pos && m.pos < to.pos).map(m => m.name))];
  return { from: from ? from.name : null, froms, dest: to ? to.name : null };
}
function findCity(text, cities) { return findRoute(text, cities).dest; }

function findPickup(text) {
  const m = text.match(/\b(?:pick(?:\s|-)?up(?:\s+(?:at|from|@))?|pickup spot(?:\s+is)?|from)\s+(?:the\s+)?([A-Za-z0-9'&.\- ]{2,40}?)(?=\s*(?:[,.!?;]|\bat\b|\bto\b|\baround\b|\bby\b|\btoday\b|\btomorrow\b|\btonight\b|\bpls\b|\bplease\b|\bon\b|\d{1,2}(?::\d{2})?\s*(?:am|pm)|$))/i);
  return m ? m[1].trim() : null;
}

function findSeats(text) {
  const m = text.match(/\b(\d+|two|three|four|five|six)\s*(?:of us|people|ppl|persons|riders|friends|seats)\b/i);
  if (m) return NUMW[m[1].toLowerCase()] || Math.min(+m[1] || 1, 8);
  if (/\b(me and (my )?\w+|me \+ ?1|plus one|\+1)\b/i.test(text)) return 2;
  return 1;
}

function driverSeats(text) {
  const m = text.match(/\b(\d+|a|one|two|three|four|five|six)\s+(?:open\s+)?(?:seats?|spots?)\b/i) || text.match(/(?:can (?:take|fit|carry)|room for)\s+(\d+|two|three|four)/i);
  return m ? (NUMW[m[1].toLowerCase()] || +m[1] || 3) : 3;
}

function parseWhen(text, msgTs) {
  const t = text.toLowerCase();
  const day = new Date(msgTs); day.setHours(0, 0, 0, 0);
  let explicitDay = false, m;
  if ((m = t.match(/\bin\s+(\d+|an?|half an?)\s*(min|mins|minutes|hr|hrs|hour|hours)\b/))) {
    const n = /half/.test(m[1]) ? 0.5 : (+m[1] || 1);
    return msgTs + n * (/^h/.test(m[2]) ? 60 : 1) * 60000;
  }
  if (/\b(tomorrow|tmrw|tmr|tmrrw|tomm?or?row)\b/.test(t)) { day.setDate(day.getDate() + 1); explicitDay = true; }
  else if (/\b(today|tonight|tonite|this (morning|afternoon|evening))\b/.test(t)) explicitDay = true;
  else {
    const wd = WEEKDAYS.findIndex(w => new RegExp('\\b' + w + '\\b|\\b(on|this|next|by)\\s+' + w.slice(0, 3) + '\\b').test(t));
    if (wd >= 0) { let diff = (wd - day.getDay() + 7) % 7; if (/\bnext\s+\w+day\b/.test(t) && diff === 0) diff = 7; day.setDate(day.getDate() + diff); explicitDay = true; }
    const md = t.match(/\b(\d{1,2})\/(\d{1,2})(?![\d:])/);
    if (md && +md[1] <= 12 && +md[2] <= 31) { day.setFullYear(day.getFullYear(), +md[1] - 1, +md[2]); explicitDay = true; }
    const mn = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (mn) { day.setFullYear(day.getFullYear(), MONTHS.indexOf(mn[1].slice(0, 3)), +mn[2]); explicitDay = true; }
  }

  let h = null, mi = 0;
  if ((m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(?:ish\s*)?(a\.?m\.?|p\.?m\.?)(?![a-z])/))) {
    h = +m[1]; mi = +(m[2] || 0); const pm = m[3][0] === 'p';
    if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0;
  }
  if (h == null && (m = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?!\d)/))) { h = +m[1]; mi = +m[2]; if (h >= 1 && h <= 7) h += 12; }
  if (h == null && (m = t.match(/\b(?:at|around|by|@|abt|about|~)\s*(\d{1,2})(?!\s*(?:people|ppl|seats?|of us|min|\/|\d))\b/))) {
    h = +m[1]; if (h >= 1 && h <= 7) h += 12;
    if (h < 12 && /\b(evening|night|tonight|afternoon)\b/.test(t)) h += 12;
  }
  if (h == null) {
    if (/\bnoon\b/.test(t)) h = 12;
    else if (/\bmidnight\b/.test(t)) h = 0;
    else if (/\bearly morning\b/.test(t)) h = 6;
    else if (/\bmorning\b/.test(t)) h = 9;
    else if (/\bafternoon\b/.test(t)) h = 14;
    else if (/\bevening\b/.test(t)) h = 18;
    else if (/\b(tonight|tonite)\b/.test(t)) h = 20;
    else if (/\b(asap|right now|rn)\b/.test(t)) return msgTs + 15 * 60000;
  }
  if (h == null) return null;
  const d = new Date(day); d.setHours(h, mi, 0, 0);
  if (!explicitDay && d.getTime() < msgTs - 30 * 60000) d.setDate(d.getDate() + 1);
  else if (explicitDay && /\b(tonight|tonite)\b/.test(t) && h < 5) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// The sender's phone number: from their WhatsApp ID, or from the name when WhatsApp shows a number instead of a name.
// Newer WhatsApp groups can hide numbers behind private IDs (@lid); then there is no number to show.
function phoneOf(m) {
  const fromJid = j => (j && /@s\.whatsapp\.net$/.test(j) ? j.split('@')[0].split(':')[0] : null);
  const p = m.senderPhone || fromJid(m.senderJid) || (/^\+?[\d\s().-]{8,}$/.test(m.sender || '') ? m.sender.replace(/\D/g, '') : null);
  return p && p.length >= 8 ? p : null;
}
function fmtPhone(p) {
  if (!p) return '';
  const d = String(p).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return '+' + d;
}

// msgs: [{id, ts, sender, text, group, groupName}] in time order
function analyze(msgs, cities, overrides = {}) {
  const requests = [], drivers = [], cancelled = [];
  const sorted = [...msgs].sort((a, b) => a.ts - b.ts);
  for (const m of sorted) {
    const ov = overrides[m.id] || {};
    if (ov.ignore) continue;
    const txt = m.text || '';
    const route = findRoute(txt, cities);
    if (CANCEL_WORDS.test(txt) && !ov.dest) {
      // Cancels this person's open request (to the named city, if they named one)
      for (const list of [requests, drivers]) for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        if (r.sender === m.sender && (!route.dest || r.dest === route.dest)) { cancelled.push({ ...r, cancelledBy: txt, cancelledAt: m.ts }); list.splice(i, 1); }
      }
      continue;
    }
    const when = parseWhen(txt, m.ts);
    const isDriver = DRIVER_WORDS.test(txt) && !ASKING_FOR_RIDE.test(txt);
    const isRide = ov.dest || ov.when || RIDE_WORDS.test(txt) || (route.dest && when);
    if (!isDriver && !isRide) continue;
    const item = {
      id: m.id, mine: !!m.fromMe, sender: m.sender, senderJid: m.senderJid, phone: phoneOf(m), text: txt, sentAt: m.ts, group: m.group, groupName: m.groupName,
      local: /\b(within|around|inside|in town|local|across town)\b/i.test(txt),
      dest: ov.dest || route.dest, from: ov.from || route.from, froms: ov.from ? [ov.from] : route.froms, when: ov.when || when, pickup: findPickup(txt),
      seats: isDriver ? driverSeats(txt) : findSeats(txt)
    };
    if (item.from && item.pickup && item.pickup.toLowerCase() === item.from.toLowerCase()) item.pickup = null;
    if (isDriver) { drivers.push(item); continue; }
    // A newer message from the same person to the same city (or with no city yet) replaces the older one
    for (let i = requests.length - 1; i >= 0; i--) {
      const r = requests[i];
      if (r.sender === m.sender && (!r.dest || !item.dest || r.dest === item.dest)) {
        if (!item.dest) item.dest = r.dest;
        if (!item.when) item.when = r.when;
        if (!item.pickup) item.pickup = r.pickup;
        if (item.seats === 1 && r.seats > 1) item.seats = r.seats;
        requests.splice(i, 1);
      }
    }
    requests.push(item);
  }
  return { requests, drivers, cancelled };
}

// ---------- geometry ----------
const coordOf = name => name ? COORDS[String(name).toLowerCase()] || null : null;
function miles(a, b) {
  const R = 3958.8, toR = x => x * Math.PI / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.2;   // 1.2 = typical road-vs-straight-line factor
}

// Order drop-offs nearest-first and check nobody rides much further than going direct.
function planDrops(from, riders, detourPct) {
  const byDest = new Map();
  riders.forEach(r => { if (!byDest.has(r.dest)) byDest.set(r.dest, []); byDest.get(r.dest).push(r); });
  const o = coordOf(from);
  if (byDest.size === 1) {
    const [name, rs] = [...byDest][0];
    const c = coordOf(name);
    const mi = o && c ? miles(o, c) : null;
    return { drops: [{ name, riders: rs, mi }], miles: mi || 0, dest: name };
  }
  if (!o || [...byDest.keys()].some(n => !coordOf(n))) return null;
  const stops = [...byDest].map(([name, rs]) => ({ name, riders: rs, c: coordOf(name), direct: miles(o, coordOf(name)) }))
    .sort((a, b) => a.direct - b.direct);
  let cum = 0, prev = o;
  for (const s of stops) {
    cum += miles(prev, s.c); prev = s.c;
    if (cum > s.direct * (1 + detourPct / 100) + 3) return null;
    s.mi = cum;
  }
  return { drops: stops.map(s => ({ name: s.name, riders: s.riders, mi: s.mi })), miles: cum, dest: stops[stops.length - 1].name };
}

// Groups riders into cars: same starting city, requested times within `win` minutes,
// same destination or destinations on the way (within `detour` %), never over `cap` seats.
function pool(requests, drivers, { win = 30, cap = 4, home = 'San Marcos', detour = 25, sameDest = false } = {}) {
  const winMs = win * 60000;
  const trips = [];
  const list = requests.filter(r => r.dest && r.when).sort((a, b) => a.when - b.when);
  for (const r of list) {
    const from = r.from || home;
    if (from === r.dest && !r.local) continue;   // no starting city given; shown under "needs details"
    let best = null, bestCost = Infinity;
    for (const t of trips) {
      if (t.from !== from || r.when - t.depart > winMs || t.cap - t.seats < r.seats) continue;
      if (!!t.local !== !!(r.local && r.dest === from)) continue;
      if (sameDest && t.dest !== r.dest) continue;              // only riders going to exactly the same place   // rides within a city stay separate from out-of-town trips
      const plan = planDrops(from, [...t.riders, r], detour);
      if (!plan) continue;
      const cost = (plan.miles - t.miles) + (t.drops.some(d => d.name === r.dest) ? 0 : 2) + (r.when - t.depart) / 600000;
      if (cost < bestCost) { best = { t, plan }; bestCost = cost; }
    }
    if (best) {
      Object.assign(best.t, { drops: best.plan.drops, miles: best.plan.miles, dest: best.plan.dest });
      best.t.riders.push(r); best.t.seats += r.seats;
    } else {
      const plan = planDrops(from, [r], detour);
      trips.push({ local: !!(r.local && r.dest === from), from, dest: r.dest, depart: r.when, riders: [r], seats: r.seats, cap: Math.max(cap, r.seats), drops: plan.drops, miles: plan.miles });
    }
  }

  // Drivers: each driver takes the trips that start in any city they pass, go their way, and fit their seats.
  // Trips from different pickup cities that share one driver become one car.
  const slack = Math.max(winMs, 60 * 60000);
  let out = [...trips].sort((a, b) => a.depart - b.depart);
  for (const d of [...drivers].filter(d => d.dest && d.when).sort((a, b) => a.when - b.when)) {
    const origins = d.froms && d.froms.length ? d.froms : [d.from || home];
    const fits = out.filter(t => !t.driver && (!t.local || d.dest === t.dest) && origins.includes(t.from) && Math.abs(d.when - t.depart) <= slack
        && (d.dest === t.dest || !!planDrops(t.from, [...t.riders, { dest: d.dest }], detour)))
      .sort((a, b) => origins.indexOf(a.from) - origins.indexOf(b.from) || Math.abs(a.when - d.when) - Math.abs(b.when - d.when));
    // Fill the driver's seats rider by rider (closest requested time first); leftovers keep their own car.
    const taken = [], touched = new Map(); let seats = 0;
    for (const t of fits) for (const r of [...t.riders].sort((x, y) => Math.abs(x.when - d.when) - Math.abs(y.when - d.when)))
      if (seats + r.seats <= d.seats && Math.abs(r.when - d.when) <= slack
          && (!taken.length || Math.max(r.when, ...taken.map(x => x.when)) - Math.min(r.when, ...taken.map(x => x.when)) <= winMs)) {
        taken.push(r); seats += r.seats; touched.set(t, (touched.get(t) || []).concat(r));
      }
    if (!taken.length) continue;
    for (const [t, rs] of touched) {
      t.riders = t.riders.filter(r => !rs.includes(r));
      if (!t.riders.length) continue;
      const p = planDrops(t.from, t.riders, detour);
      Object.assign(t, { seats: t.riders.reduce((n, r) => n + r.seats, 0), depart: Math.min(...t.riders.map(r => r.when)), drops: p.drops, miles: p.miles, dest: p.dest });
    }
    out = out.filter(t => t.riders.length);
    const pickups = origins.filter(o => taken.some(r => (r.from || home) === o));
    let drops, total = 0;
    const single = pickups.length === 1 && planDrops(pickups[0], taken, detour);
    if (single) { drops = single.drops; total = single.miles; }
    else {
      const byName = new Map();
      taken.forEach(r => { if (!byName.has(r.dest)) byName.set(r.dest, { name: r.dest, riders: [], mi: null }); byName.get(r.dest).riders.push(r); });
      const last = coordOf(pickups[pickups.length - 1]);
      const dist = n => (last && coordOf(n) ? miles(last, coordOf(n)) : 0);
      drops = [...byName.values()].sort((x, y) => dist(x.name) - dist(y.name));
      let prev = null;
      for (const c of [...pickups, ...drops.map(x => x.name)].map(coordOf)) { if (!c) { total = 0; break; } if (prev) total += miles(prev, c); prev = c; }
    }
    out.push({ from: pickups[0], pickupCities: pickups, dest: drops[drops.length - 1].name, depart: d.when,
      riders: taken, seats, cap: Math.max(seats, d.seats), drops, miles: total, driver: d });
  }
  for (const t of out) finishTrip(t, home);
  return out.sort((a, b) => a.depart - b.depart);
}

function finishTrip(t, home) {
  const multi = t.pickupCities && t.pickupCities.length > 1;
  const order = [], idx = {};
  const byCity = multi ? [...t.riders].sort((a, b) => t.pickupCities.indexOf(a.from || home) - t.pickupCities.indexOf(b.from || home)) : t.riders;
  for (const r of byCity) {
    r.pickupLabel = r.pickup || (multi ? (r.from || home) + ', spot TBD' : null);
    const k = (r.pickupLabel || 'Pickup spot not given').toLowerCase();
    if (!(k in idx)) { idx[k] = order.length; order.push([]); }
    order[idx[k]].push(r);
  }
  t.stops = order;
  t.fromLabel = multi ? t.pickupCities.join(' → ') : t.from;
  t.local = t.local || (t.drops.length === 1 && t.drops[0].name === t.from);
  t.route = t.local ? 'Within ' + t.from : t.drops.map(d => d.name).join(' → ');
  t.latest = t.riders.length ? Math.max(...t.riders.map(r => r.when)) : t.depart;
  t.id = (t.mine ? 'mine:' + t.mine + '|' : '') + t.from + '|' + t.depart + '|' + t.riders.map(r => r.id).sort().join(',');
  return t;
}

// ================= ONE-CAR PLANNER =================
// You drive one car. The planner fills your own trips with passengers, suggests extra trips that
// carry the most people, and keeps everything on one timeline you can actually drive.
const AVG_MPH = 50;
function driveMin(a, b) {
  if (!a || !b || a === b) return 0;
  const ca = coordOf(a), cb = coordOf(b);
  return ca && cb ? Math.round(miles(ca, cb) / AVG_MPH * 60) : 45;
}
const emptyMiles = (a, b) => (a === b ? 0 : coordOf(a) && coordOf(b) ? miles(coordOf(a), coordOf(b)) : 30);
function tripMinutes(t) {
  const pts = [...(t.pickupCities || [t.from]), ...t.drops.map(d => d.name)];
  let m = 0; for (let i = 1; i < pts.length; i++) m += driveMin(pts[i - 1], pts[i]);
  return m + 5 * Math.max(0, t.stops.length - 1) + 3 * Math.max(0, t.drops.length - 1) + (t.local ? 20 : 0);
}
const endCity = t => (t.local ? t.from : t.drops[t.drops.length - 1].name);

// Riders on the way: their start city is one of the trip's pickup cities, and their destination is
// the trip's destination or on the way to it.
function fitsTrip(r, origins, dest, detour, home) {
  if (!origins.includes(r.from || home)) return false;
  if (r.dest === dest) return true;
  if (r.local || origins.includes(dest)) return false;
  return !!planDrops(r.from || home, [{ dest: r.dest }, { dest }], detour);
}
function buildTrip(base, riders, home) {
  const pickups = base.origins.filter(o => o === base.origins[0] || riders.some(r => (r.from || home) === o));
  const byName = new Map();
  riders.forEach(r => { if (!byName.has(r.dest)) byName.set(r.dest, { name: r.dest, riders: [], mi: null }); byName.get(r.dest).riders.push(r); });
  if (!byName.has(base.dest)) byName.set(base.dest, { name: base.dest, riders: [], mi: null });
  const last = coordOf(pickups[pickups.length - 1]);
  const dist = n => (last && coordOf(n) ? miles(last, coordOf(n)) : n === base.dest ? 1e6 : 0);
  const drops = [...byName.values()].sort((x, y) => dist(x.name) - dist(y.name));
  let total = 0, prev = null;
  for (const n of [...pickups, ...drops.map(x => x.name)]) { const c = coordOf(n); if (!c) { total = 0; break; } if (prev) total += miles(prev, c); prev = c; }
  return { ...base, from: pickups[0], pickupCities: pickups, dest: base.dest, riders, seats: riders.reduce((n, r) => n + r.seats, 0), drops, miles: total };
}

function planMyDay(requests, myTrips, { seats = 3, home = 'San Marcos', carAt, now = Date.now(), win = 30, detour = 25 } = {}) {
  carAt = carAt || home;
  const winMs = win * 60000, grace = 10 * 60000;
  const open = requests.filter(r => !isIncomplete(r, home) && r.when >= now - grace);
  const tooBig = open.filter(r => r.seats > seats);
  const used = new Set();

  // 1. Your own trips (posted by you in the group, or added on the dashboard) come first
  const fixed = myTrips.filter(m => m.dest && m.when && m.when >= now - 60 * 60000).sort((a, b) => a.when - b.when).map(m => {
    const origins = m.froms && m.froms.length ? m.froms : [m.from || home];
    const cap = Math.min(seats, m.seats || seats);
    const riders = []; let n = 0;
    open.filter(r => !used.has(r.id) && r.seats <= cap && Math.abs(r.when - m.when) <= winMs && fitsTrip(r, origins, m.dest, detour, home))
      .sort((a, b) => Math.abs(a.when - m.when) - Math.abs(b.when - m.when))
      .forEach(r => { if (n + r.seats <= cap) { riders.push(r); n += r.seats; used.add(r.id); } });
    return finishTrip({ ...buildTrip({ origins, dest: m.dest }, riders, home), depart: m.when, cap, mine: m.id, source: m.source || 'added', note: m.text || null }, home);
  });

  // 2. Suggested trips: everyone else grouped by route and time, at most your seats per trip
  const rest = open.filter(r => !used.has(r.id) && r.seats <= seats);
  const suggested = pool(rest, [], { win, cap: seats, home, detour }).map(t => Object.assign(t, { source: 'suggested', cap: seats }));

  // 3. One car: choose the set of trips (all of yours + the best suggestions) you can drive back to back
  const items = [...fixed, ...suggested].sort((a, b) => a.depart - b.depart);
  const slackMs = 10 * 60000;
  const endAt = t => t.depart + tripMinutes(t) * 60000;
  const canFollow = (a, b) => endAt(a) + driveMin(endCity(a), b.from) * 60000 <= b.depart + slackMs;
  const reachFromStart = b => now + driveMin(carAt, b.from) * 60000 <= b.depart + slackMs || b.depart <= now + slackMs && b.from === carAt;
  const value = t => (t.mine ? 1e6 : 0) + t.seats * 100;
  const best = [], prev = [];
  items.forEach((b, i) => {
    best[i] = reachFromStart(b) || b.mine ? value(b) - emptyMiles(carAt, b.from) : -Infinity; prev[i] = -1;
    for (let j = 0; j < i; j++) {
      if (best[j] === -Infinity || !canFollow(items[j], b)) continue;
      const v = best[j] + value(b) - emptyMiles(endCity(items[j]), b.from);
      if (v > best[i]) { best[i] = v; prev[i] = j; }
    }
  });
  let k = -1; best.forEach((v, i) => { if (v > 0 && (k < 0 || v > best[k])) k = i; });
  const chain = []; for (let i = k; i >= 0; i = prev[i]) chain.unshift(items[i]);

  // 4. Describe the plan, including empty drives between trips, and say why other trips don't fit
  let at = carAt, free = now;
  chain.forEach((t, i) => {
    t.order = i + 1;
    t.emptyBefore = at !== t.from ? { from: at, to: t.from, min: driveMin(at, t.from), mi: Math.round(emptyMiles(at, t.from)) } : null;
    t.arrive = endAt(t); t.endCity = endCity(t);
    at = t.endCity; free = t.arrive;
  });
  const skipped = items.filter(t => !chain.includes(t)).map(t => {
    const before = [...chain].reverse().find(c => c.depart <= t.depart);
    const after = chain.find(c => c.depart > t.depart);
    let reason;
    const full = chain.find(c => c.seats + t.seats > c.cap && Math.abs(c.depart - t.depart) <= winMs
      && t.riders.every(r => fitsTrip(r, c.pickupCities || [c.from], c.dest, detour, home)));
    if (full) reason = `Your Trip ${full.order} (${full.fromLabel} → ${full.route}, ${fmtTime(full.depart)}) is full`;
    else if (before && t.depart < before.arrive) reason = `You're driving Trip ${before.order} (${before.fromLabel} → ${before.route}) until ${fmtTime(before.arrive)}`;
    else if (before && !canFollow(before, t)) reason = `After Trip ${before.order} you're in ${before.endCity} at ${fmtTime(before.arrive)}; you can't reach ${t.from} by ${fmtTime(t.depart)}`;
    else if (!before && !reachFromStart(t)) reason = `You can't reach ${t.from} by ${fmtTime(t.depart)} from ${carAt}`;
    else if (after && !canFollow(t, after)) reason = `You'd be late for Trip ${after.order} (${after.from} at ${fmtTime(after.depart)})`;
    else reason = 'Carries fewer people than the trips in your plan';
    return { trip: t, reason };
  });
  return { trips: chain, skipped, tooBig, carAt };
}

// ================= FIND RIDES WORTH TAKING =================
// Groups passengers going the same way at about the same time (up to your seats). Groups with at
// least `minPeople` are worth taking. Trips you decided to take ("taken") are filled first.
function findRides(requests, taken, { seats = 3, home = 'San Marcos', now = Date.now(), win = 30, detour = 25, minPeople = 3, sameDest = true } = {}) {
  const winMs = win * 60000;
  const open = requests.filter(r => !isIncomplete(r, home) && r.when >= now - 10 * 60000);
  const tooBig = open.filter(r => r.seats > seats);
  const used = new Set();
  const mine = taken.filter(m => m.dest && m.when && m.when >= now - 60 * 60000).sort((a, b) => a.when - b.when).map(m => {
    const origins = [m.from || home];
    const riders = []; let n = 0;
    open.filter(r => !used.has(r.id) && r.seats <= seats && Math.abs(r.when - m.when) <= winMs && (sameDest ? (r.from || home) === origins[0] && r.dest === m.dest : fitsTrip(r, origins, m.dest, detour, home)))
      .sort((a, b) => Math.abs(a.when - m.when) - Math.abs(b.when - m.when))
      .forEach(r => { if (n + r.seats <= seats) { riders.push(r); n += r.seats; used.add(r.id); } });
    const t = finishTrip({ ...buildTrip({ origins, dest: m.dest }, riders, home), depart: m.when, cap: seats, mine: m.id, source: 'taken' }, home);
    t.arrive = t.depart + tripMinutes(t) * 60000;
    return t;
  });
  const groups = pool(open.filter(r => !used.has(r.id) && r.seats <= seats), [], { win, cap: seats, home, detour, sameDest })
    .map(t => {
      t.cap = seats; t.arrive = t.depart + tripMinutes(t) * 60000;
      const clash = mine.find(m => t.depart < m.arrive && m.depart < t.arrive);
      if (clash) t.clash = `Overlaps your ${fmtTime(clash.depart)} trip (${clash.fromLabel} → ${clash.route})`;
      return t;
    });
  return {
    mine,
    worth: groups.filter(t => t.seats >= minPeople).sort((a, b) => a.depart - b.depart),
    small: groups.filter(t => t.seats < minPeople).sort((a, b) => a.depart - b.depart),
    tooBig
  };
}

// Alerts for groups that reached the minimum, or got another passenger. `announced` remembers rider ids
// already reported, so a group is announced once and each new passenger once.
function groupAlerts(plan, announced) {
  const out = [];
  const ph = x => (x.phone ? ' ' + fmtPhone(x.phone) : '');
  for (const t of plan.worth || []) {
    const fresh = t.riders.filter(r => !announced[r.id]);
    if (!fresh.length) continue;
    const route = t.local ? t.route : t.fromLabel + ' → ' + t.route;
    const first = fresh.length === t.riders.length;
    out.push({ title: first ? `${t.seats} people going ${route} · ${fmtDay(t.depart)} ${fmtTime(t.depart)}` : `Another passenger: ${route} ${fmtTime(t.depart)} (${t.seats}/${t.cap})`,
      body: t.riders.map(r => `${fresh.includes(r) && !first ? 'NEW ' : ''}${r.sender}${r.seats > 1 ? ' +' + (r.seats - 1) : ''}${ph(r)} · wants ${fmtTime(r.when)}${r.pickup ? ' · ' + r.pickup : ''}`).join('\n') + (t.clash ? '\n' + t.clash : ''),
      tripId: t.id });
    t.riders.forEach(r => (announced[r.id] = 1));
  }
  for (const t of plan.mine || []) {
    const fresh = t.riders.filter(r => !announced[r.id]);
    if (!fresh.length) continue;
    out.push({ title: `New passenger for your ${fmtTime(t.depart)} trip (${t.seats}/${t.cap})`, body: fresh.map(r => `${r.sender}${ph(r)} → ${r.dest} · wants ${fmtTime(r.when)}`).join('\n'), tripId: t.id });
    t.riders.forEach(r => (announced[r.id] = 1));
  }
  return out;
}

function offerMessage(t) {
  const left = t.cap - t.seats;
  const lines = [`🚗 I'm driving ${t.local ? t.route : t.fromLabel + ' → ' + t.route} · ${fmtDay(t.depart)} ${fmtTime(t.depart)}`];
  if (t.riders.length) lines.push(`Riding: ${t.riders.map(r => r.sender + (r.seats > 1 ? ` (+${r.seats - 1})` : '')).join(', ')}`);
  lines.push(left > 0 ? `${left} seat${left > 1 ? 's' : ''} left — message me to join.` : 'Car is full.');
  return lines.join('\n');
}

const fmtTime = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function fmtDay(ms) {
  const a = new Date(ms).setHours(0, 0, 0, 0), b = new Date().setHours(0, 0, 0, 0);
  const diff = Math.round((a - b) / 86400000);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow'; if (diff === -1) return 'Yesterday';
  return new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function tripMessage(t) {
  const lines = [`🚗 ${/^Within /.test(t.route) ? '' : (t.fromLabel || t.from) + ' → '}${t.route} · ${fmtDay(t.depart)} ${fmtTime(t.depart)}`];
  lines.push(t.driver ? `Driver: ${t.driver.sender}` : 'Driver: still needed');
  t.stops.forEach((grp, i) => lines.push(`Pickup ${i + 1}: ${grp[0].pickupLabel || grp[0].pickup || 'spot TBD'} — ${grp.map(r => r.sender + (r.seats > 1 ? ` (+${r.seats - 1})` : '')).join(', ')}`));
  if (t.drops.length > 1) t.drops.forEach((d, i) => lines.push(`Drop ${i + 1}: ${d.name} — ${d.riders.map(r => r.sender).join(', ')}`));
  lines.push(`${t.seats} of ${t.cap} seats filled. Please be at your pickup 5 min early.`);
  return lines.join('\n');
}

// Reads a WhatsApp "Export chat" .txt (Android or iPhone format, either date order).
function parseExport(text, { dayFirst = null, group = 'export', groupName = 'Exported chat' } = {}) {
  const lines = String(text).replace(/\r/g, '').replace(/[‎‏‪-‮]/g, '').split('\n');
  const head = /^\[?(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap]\.?\s?[Mm]\.?)?\]?\s*(?:-|–)?\s*(.{1,60}?):\s([\s\S]*)$/;
  const raw = [];
  for (const line of lines) {
    const m = line.replace(/[  ]/g, ' ').match(head);
    if (m) raw.push({ m, text: m[9] });
    else if (raw.length && line.trim()) raw[raw.length - 1].text += '\n' + line;
  }
  if (dayFirst == null) dayFirst = raw.some(r => +r.m[1] > 12 && +r.m[1] <= 31) && !raw.some(r => +r.m[2] > 12);
  const out = [];
  raw.forEach((r, i) => {
    const m = r.m;
    let a = +m[1], b = +m[2], y = +m[3];
    let mo, d;
    if (a > 31) { y = a; mo = b; d = +m[3]; } else if (dayFirst) { d = a; mo = b; } else { mo = a; d = b; }
    if (y < 100) y += 2000;
    let h = +m[4];
    if (m[7]) { const pm = /p/i.test(m[7]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    const ts = new Date(y, mo - 1, d, h, +m[5], +(m[6] || 0)).getTime();
    const txt = r.text.trim();
    if (!txt || /^<media omitted>$|omitted$|^this message was deleted$/i.test(txt)) return;
    out.push({ id: 'x' + ts.toString(36) + i + hash(m[8] + txt), ts, sender: m[8].trim(), text: txt, group, groupName });
  });
  return out;
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

// Pickup brief for you, the driver: who to collect where, with numbers
function driverBrief(t) {
  const lines = [`Leave ${t.fromLabel} ${fmtDay(t.depart)} ${fmtTime(t.depart)} · ${t.seats}/${t.cap} seats`];
  t.stops.forEach((grp, i) => lines.push(`Pickup ${i + 1}: ${grp[0].pickupLabel || grp[0].pickup || 'spot TBD'} — ` +
    grp.map(r => r.sender + (r.seats > 1 ? ` (+${r.seats - 1})` : '') + (r.phone ? ' ' + fmtPhone(r.phone) : '')).join(', ')));
  if (t.drops.length > 1) t.drops.forEach((d, i) => d.riders.length && lines.push(`Drop ${i + 1}: ${d.name} — ${d.riders.map(r => r.sender).join(', ')}`));
  return lines.join('\n');
}

// Alert text for a new message, about YOUR car. Used by the server and the offline page alike.
function alertFor(msg, plan, home) {
  const ph = x => (x && x.phone ? ' · ' + fmtPhone(x.phone) : '');
  const when = ms => fmtDay(ms) + ' ' + fmtTime(ms);
  const label = t => `Trip ${t.order}: ${t.local ? t.route : t.fromLabel + ' → ' + t.route}, leaves ${fmtTime(t.depart)} (${t.seats}/${t.cap} seats)`;
  const c = (plan.cancelled || []).find(x => x.cancelledAt === msg.ts && x.sender === msg.sender);
  if (c) return { kind: 'cancel', title: `Cancelled: ${c.sender}`, body: `No longer needs the ride to ${c.dest || 'their city'}. Your plan was updated.` };
  const mine = (plan.mine || []).find(x => x.id === msg.id);
  if (mine) {
    const t = plan.trips.find(x => x.mine === mine.id);
    return { kind: 'mine', title: 'Your ride offer is in your plan', body: t ? label(t) + '\n' + (t.riders.length ? 'Passengers: ' + t.riders.map(r => r.sender + ph(r)).join(', ') : 'No passengers yet. You will be alerted when someone fits.') : 'It overlaps another trip in your plan.' };
  }
  const r = plan.requests.find(x => x.id === msg.id);
  if (!r) return null;                                   // other drivers' offers and chatter: no alert
  if (isIncomplete(r, home)) return { kind: 'details', title: `Needs details: ${r.sender}${ph(r)}`, body: `"${r.text}"\nMissing ${missingParts(r, home).join(' and ')}. Add it on the dashboard or ask them.` };
  const head = `${r.sender}${ph(r)} → ${r.local ? 'within ' + (r.from || home) : r.dest}`;
  const wants = `Wants ${when(r.when)} from ${r.from || home}${r.pickup ? ' (' + r.pickup + ')' : ''}${r.seats > 1 ? ' · ' + r.seats + ' seats' : ''}`;
  const t = plan.trips.find(x => x.riders.some(y => y.id === r.id));
  if (t) return { kind: 'fit', title: `${t.mine ? 'New passenger' : 'Possible passenger'} for Trip ${t.order}: ${head}`, body: `${wants}\n${label(t)}` + (t.mine ? '' : '\nSuggested trip — post it in the group if you want to do it.'), tripId: t.id };
  if ((plan.tooBig || []).some(x => x.id === r.id)) return { kind: 'skip', title: `Too many people for your car: ${head}`, body: `${wants}\nNeeds ${r.seats} seats.` };
  const sk = (plan.skipped || []).find(x => x.trip.riders.some(y => y.id === r.id));
  return { kind: 'skip', title: `Doesn't fit your plan: ${head}`, body: `${wants}\n${sk ? sk.reason : 'Already past.'}` };
}

// A request is incomplete when it has no city, no time, or goes to the start city without saying from where.
const missingParts = (r, home) => [!r.dest && 'a destination', !r.when && 'a time', r.dest && !r.local && (r.from || home) === r.dest && 'where they start from'].filter(Boolean);
const isIncomplete = (r, home) => !r.dest || !r.when || (!r.local && (r.from || home) === r.dest);

const api = { findRides, groupAlerts, driverBrief, planMyDay, offerMessage, tripMinutes, driveMin, alertFor, missingParts, isIncomplete, phoneOf, fmtPhone, DEFAULT_CITIES, COORDS, buildCities, cityNames, findCity, findRoute, findPickup, findSeats, parseWhen, analyze, pool, planDrops, tripMessage, fmtTime, fmtDay, parseExport, hash };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Rides = api;
})(typeof window !== 'undefined' ? window : globalThis);
