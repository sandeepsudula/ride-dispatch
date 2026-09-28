// Ride-request understanding and pooling. No WhatsApp code here, so it runs in Node (server) and in the browser (offline mode).
(function (root) {
'use strict';

const DEFAULT_CITIES = [
  'Austin Airport (AUS): aus airport, aus, bergstrom, austin airport, abia, airport',
  'San Antonio Airport (SAT): sat airport, san antonio airport',
  'Houston Airport (IAH): iah, bush airport',
  'Dallas Airport (DFW): dfw airport, dfw',
  'Austin: atx, downtown austin, downtown atx',
  'San Antonio: sa, satx, san antone',
  'Houston: htx, hou',
  'Dallas',
  'Fort Worth',
  'New Braunfels: nb',
  'Kyle', 'Buda', 'Round Rock', 'Seguin', 'Lockhart', 'Wimberley',
  'College Station', 'Waco', 'Georgetown', 'Pflugerville', 'Cedar Park', 'Killeen', 'Temple', 'Corpus Christi',
  'San Marcos: sm, smtx, txst, texas state',
  // Areas of Austin and nearby towns, so "North Austin" or "the Domain" is its own pickup point
  'North Austin: n austin, north atx, north side austin',
  'Northwest Austin: nw austin, north west austin',
  'South Austin: s austin, south atx, soco, south congress',
  'East Austin: e austin, east atx, east side austin',
  'West Austin: w austin, westlake',
  'UT Austin: ut campus, university of texas, ut austin campus',
  'The Domain: domain, domain austin',
  'Mueller', 'Riverside: riverside austin', 'Hyde Park', 'Oak Hill', 'Circle C', 'Tech Ridge', 'Parmer: parmer lane',
  'Leander', 'Manor', 'Hutto', 'Lakeway', 'Dripping Springs', 'Bee Cave'
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
  'temple': [31.0982, -97.3428], 'corpus christi': [27.8006, -97.3964], 'san marcos': [29.8833, -97.9414],
  'north austin': [30.396, -97.72], 'northwest austin': [30.42, -97.77], 'south austin': [30.21, -97.78],
  'east austin': [30.265, -97.715], 'west austin': [30.295, -97.79], 'ut austin': [30.2849, -97.7341],
  'the domain': [30.4021, -97.7253], 'mueller': [30.2984, -97.7059], 'riverside': [30.238, -97.728],
  'hyde park': [30.306, -97.728], 'oak hill': [30.2346, -97.8619], 'circle c': [30.1905, -97.885],
  'tech ridge': [30.405, -97.671], 'parmer': [30.43, -97.7], 'leander': [30.5788, -97.8531], 'manor': [30.3405, -97.5569],
  'hutto': [30.5427, -97.5467], 'lakeway': [30.3639, -97.9795], 'dripping springs': [30.1902, -98.0867], 'bee cave': [30.3085, -97.945]
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
      const before = t.slice(Math.max(0, start - 26), start);
      found.push({ name: c.name, pos: start,
        to: /\b(to|for|towards?|into|in)\s+(?:near\s+|the\s+|near the\s+)?$/.test(before) || /->\s*$|→\s*$/.test(before),
        from: /\b(from|leaving|out of|back from|pick ?up (?:from|at|in))\s+(?:near\s+|the\s+|near the\s+|around\s+)?$/.test(before) });
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
// true when WhatsApp shows the sender only as their number (then don't print the number twice)
const nameIsPhone = r => !!(r && r.phone && String(r.sender || '').replace(/\D/g, '') === String(r.phone));
function fmtPhone(p) {
  if (!p) return '';
  const d = String(p).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return '+' + d;
}

// msgs: [{id, ts, sender, text, group, groupName}] in time order
// One person, however their name shows: phone number first, then their WhatsApp ID, then the name
const personOf = m => phoneOf(m) || (m.senderJid ? String(m.senderJid).split('@')[0].split(':')[0] : '') || String(m.sender || '').trim().toLowerCase();

function analyze(msgs, cities, overrides = {}) {
  const requests = [], drivers = [], cancelled = [];
  const sorted = [...msgs].sort((a, b) => a.ts - b.ts);
  for (const m of sorted) {
    const ov = overrides[m.id] || {};
    if (ov.ignore) continue;
    const txt = m.text || '';
    const route = findRoute(txt, cities);
    const person = personOf(m);
    if (CANCEL_WORDS.test(txt) && !ov.dest) {
      // Cancels this person's open request (to the named city, if they named one)
      for (const list of [requests, drivers]) for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        if (r.person === person && (!route.dest || r.dest === route.dest)) { cancelled.push({ ...r, cancelledBy: txt, cancelledAt: m.ts }); list.splice(i, 1); }
      }
      continue;
    }
    const when = parseWhen(txt, m.ts);
    const isDriver = DRIVER_WORDS.test(txt) && !ASKING_FOR_RIDE.test(txt);
    const isRide = ov.dest || ov.when || RIDE_WORDS.test(txt) || (route.dest && when);
    if (!isDriver && !isRide) continue;
    const item = {
      id: m.id, person, mine: !!m.fromMe, sender: m.sender, senderJid: m.senderJid, phone: phoneOf(m), text: txt, sentAt: m.ts, group: m.group, groupName: m.groupName,
      // a ride inside one city ("around 7pm" is a time, not "around town"); never when two different cities are named
      local: /\b(within|inside|in town|local|across town|around town|around (?:the )?city)\b/i.test(txt) && !(route.from && route.dest && route.from !== route.dest),
      dest: ov.dest || route.dest, from: ov.from || route.from, froms: ov.from ? [ov.from] : route.froms, when: ov.when || when, pickup: findPickup(txt),
      seats: isDriver ? driverSeats(txt) : findSeats(txt)
    };
    if (item.from && item.pickup && item.pickup.toLowerCase() === item.from.toLowerCase()) item.pickup = null;
    if (isDriver) { drivers.push(item); continue; }
    // A newer message from the same person replaces the older one when it's the same trip: same destination,
    // no destination yet, or a time within 2 hours (a correction). A separate trip (e.g. the way back) is kept.
    for (let i = requests.length - 1; i >= 0; i--) {
      const r = requests[i];
      const sameTrip = !r.dest || !item.dest || r.dest === item.dest || (r.when && item.when && Math.abs(r.when - item.when) <= 2 * 3600000);
      if (r.person === person && sameTrip) {
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
      if (t.riders.some(x => x.person && x.person === r.person)) continue;
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
  t.path = t.local ? t.route : (t.stopOrder || [t.fromLabel, ...t.drops.map(d => d.name)]).join(' → ');
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
  const pts = t.stopOrder || [...(t.pickupCities || [t.from]), ...t.drops.map(d => d.name)];
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

// ================= ROUTE-BASED GROUPING =================
// A car drives one way along a road. Riders fit if both their start and their destination are on that
// road, in the right order. People can get out mid-way (freeing a seat) and others can get in.
const xy = c => { const p = coordOf(c); return p ? [p[1] * Math.cos(p[0] * Math.PI / 180), p[0]] : null; };
const minutesAlong = mi => Math.round(mi / AVG_MPH * 60);

// Checks a set of riders (plus optional fixed start/end) as one car. Returns the route or null.
function checkRoute(riders, { cap, detour, home, start = null, end = null, startNear = null, endNear = null }) {
  const pts = [...new Set([...(start ? [start] : []), ...riders.flatMap(r => [r.from || home, r.dest]), ...(end ? [end] : [])])];
  if (pts.length < 2 || pts.some(p => !coordOf(p))) return null;
  // the two cities farthest apart define the road; everything else is ordered along it
  let A = pts[0], B = pts[1], far = -1;
  for (const a of pts) for (const b of pts) { const d = miles(coordOf(a), coordOf(b)); if (d > far) { far = d; A = a; B = b; } }
  const [ax, ay] = xy(A), [bx, by] = xy(B), L = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
  const along = c => { const [x, y] = xy(c); return ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L; };
  for (const order of [[...pts].sort((a, b) => along(a) - along(b)), [...pts].sort((a, b) => along(b) - along(a))]) {
    const at = new Map(order.map((c, i) => [c, i]));
    if (riders.some(r => at.get(r.from || home) >= at.get(r.dest))) continue;          // wrong direction for someone
    if (start && order[0] !== start) continue;
    if (end && order[order.length - 1] !== end) continue;
    const near = (c, n) => c === n.city || (coordOf(c) && coordOf(n.city) && miles(coordOf(c), coordOf(n.city)) <= n.radius);
    if (startNear && !near(order[0], startNear)) continue;
    if (endNear && !near(order[order.length - 1], endNear)) continue;
    const cum = [0]; for (let i = 1; i < order.length; i++) cum[i] = cum[i - 1] + miles(coordOf(order[i - 1]), coordOf(order[i]));
    const total = cum[cum.length - 1];
    if (total > miles(coordOf(order[0]), coordOf(order[order.length - 1])) * (1 + detour / 100) + 3) return null;
    const bad = riders.some(r => { const ride = cum[at.get(r.dest)] - cum[at.get(r.from || home)]; return ride > miles(coordOf(r.from || home), coordOf(r.dest)) * (1 + detour / 100) + 3; });
    if (bad) return null;
    let peak = 0;
    for (let i = 0; i < order.length - 1; i++) {                                         // people in the car on each stretch
      const inCar = riders.filter(r => at.get(r.from || home) <= i && i < at.get(r.dest)).reduce((n, r) => n + r.seats, 0);
      peak = Math.max(peak, inCar);
    }
    if (peak > cap) return null;
    return { order, at, cum, total, peak };
  }
  return null;
}
// When the car should leave its first stop so each rider is picked up near the time they asked for
const startTimes = (riders, R, home) => riders.map(r => r.when - minutesAlong(R.cum[R.at.get(r.from || home)]) * 60000);

function tripFromRoute(riders, R, home, cap, extra = {}) {
  const origins = R.order.filter(c => riders.some(r => (r.from || home) === c));
  const drops = R.order.filter(c => riders.some(r => r.dest === c)).map(n => ({ name: n, riders: riders.filter(r => r.dest === n), mi: R.cum[R.at.get(n)] }));
  const t = { from: R.order[0], pickupCities: origins.length ? origins : [R.order[0]], dest: R.order[R.order.length - 1], stopOrder: R.order,
    depart: riders.length ? Math.min(...startTimes(riders, R, home)) : extra.depart, riders, seats: riders.reduce((n, r) => n + r.seats, 0),
    peak: R.peak, cap, drops: drops.length ? drops : [{ name: R.order[R.order.length - 1], riders: [], mi: R.total }], miles: R.total, ...extra };
  if (t.pickupCities.length === 1 && riders.length) t.pickupCities = origins;
  t.legs = R.order.map((c, i) => ({ city: c, mi: Math.round(R.cum[i]) }));
  finishTrip(t, home);
  t.arrive = t.depart + tripMinutes(t) * 60000;
  return t;
}

function routePool(riders, { win, cap, home, detour }) {
  const winMs = win * 60000, groups = [];
  for (const r of [...riders].sort((a, b) => a.when - b.when)) {
    let best = null;
    for (const g of groups) {
      if (g.riders.some(x => x.person && x.person === r.person)) continue;   // same person never twice in one car
      const R = checkRoute([...g.riders, r], { cap, detour, home });
      if (!R) continue;
      const st = startTimes([...g.riders, r], R, home);
      if (Math.max(...st) - Math.min(...st) > winMs) continue;                              // not "the same time"
      const cost = R.total - g.R.total;
      if (!best || cost < best.cost) best = { g, R, cost };
    }
    if (best) { best.g.riders.push(r); best.g.R = best.R; }
    else { const R = checkRoute([r], { cap, detour, home }); if (R) groups.push({ riders: [r], R }); else groups.push({ riders: [r], R: null }); }
  }
  return groups;
}

// Why two smaller groups going the same way at about the same time were not put in one car.
// Returns a short reason, or null when they are not comparable (different way, or hours apart).
function whyApart(a, b, { cap, detour, home, win, onTheWay = true }) {
  const all = [...a.riders, ...b.riders];
  if (!a.riders.length || !b.riders.length) return null;
  const dA = a.riders[0].dest, dB = b.riders[0].dest;
  const sameEnd = dA === dB, sameStart = (a.riders[0].from || home) === (b.riders[0].from || home);
  const near = (x, y, mi) => x === y || (coordOf(x) && coordOf(y) && miles(coordOf(x), coordOf(y)) <= mi);
  if (!near(dA, dB, 20) || !near(a.riders[0].from || home, b.riders[0].from || home, 40)) return null;   // only riders going the same way
  if (Math.abs(a.depart - b.depart) > Math.max(90, win * 3) * 60000) return null;
  const pa = new Set(a.riders.map(r => r.person).filter(Boolean));
  if (b.riders.some(r => r.person && pa.has(r.person))) return 'same person';
  const n = all.reduce((k, r) => k + r.seats, 0);
  if (!onTheWay) {
    if (!(sameEnd && sameStart)) return 'different start or destination (grouping along the route is off in settings)';
    if (n > cap) return `together they need ${n} seats; you set ${cap}`;
    return `more than ${win} min apart`;
  }
  const places = [...new Set(all.flatMap(r => [r.from || home, r.dest]))];
  const unmapped = places.filter(p => !coordOf(p));
  if (unmapped.length && !(sameEnd && sameStart)) return `${unmapped.join(', ')} is not on the map, so it only groups with the exact same trip`;
  const R = checkRoute(all, { cap: 99, detour, home });
  if (!R && !(sameEnd && sameStart)) return `too far off the way (more than ${detour}% extra driving)`;
  if (R && R.peak > cap || (!R && n > cap)) return `together they need ${R ? R.peak : n} seats at once; you set ${cap} seats`;
  if (R) {
    const st = startTimes(all, R, home);
    if (Math.max(...st) - Math.min(...st) > win * 60000) {
      const pos = r => R.cum[R.at.get(r.from || home)];
      const byPos = [...all].sort((x, y) => pos(x) - pos(y)), first = byPos[0];
      let worst = null, off = -1;
      for (const r of byPos.slice(1)) {
        const pass = first.when + minutesAlong(pos(r) - pos(first)) * 60000;
        if (Math.abs(pass - r.when) > off) { off = Math.abs(pass - r.when); worst = { r, pass }; }
      }
      const f = first.from || home, w = worst.r.from || home;
      if (f === w) { const [x, y] = [first.when, worst.r.when].sort((m, n) => m - n); return `times ${fmtTime(x)} and ${fmtTime(y)} are more than ${win} min apart`; }
      return `picking up ${first.sender || 'the first rider'} in ${f} at ${fmtTime(first.when)}, you'd reach ${w} about ${fmtTime(worst.pass)}, but ${worst.r.sender || 'they'} asked for ${fmtTime(worst.r.when)}`;
    }
  }
  return null;
}
function explainApart(small, opts) {
  for (const t of small) {
    t.apart = [];
    for (const u of small) {
      if (u === t) continue;
      const why = whyApart(t, u, opts);
      if (why) t.apart.push({ who: u.riders.map(r => r.sender).join(', '), path: u.path, depart: u.depart, why });
    }
    t.apart = t.apart.slice(0, 3);
  }
}

// ================= FIND RIDES WORTH TAKING =================
// Groups passengers going the same way at about the same time (up to your seats in the car at once).
// With onTheWay, riders along the route in either direction are grouped: pickups and drop-offs on the way.
function findRides(requests, taken, { seats = 3, home = 'San Marcos', now = Date.now(), win = 30, detour = 25, minPeople = 3, onTheWay = true, sameDest } = {}) {
  if (sameDest === true && onTheWay === undefined) onTheWay = false;
  const winMs = win * 60000;
  const open = requests.filter(r => !isIncomplete(r, home) && r.when >= now - 10 * 60000);
  const tooBig = open.filter(r => r.seats > seats);
  const fits = open.filter(r => r.seats <= seats);
  const used = new Set();

  // 1. Trips you're taking get matching passengers first
  const mine = taken.filter(m => m.dest && m.when && m.when >= now - 60 * 60000).sort((a, b) => a.when - b.when).map(m => {
    const from = m.from || home, riders = [];
    if (from === m.dest) {                                       // a trip within one city: take local riders near that time
      const loc = searchLocal(requests.filter(r => !used.has(r.id)), { from, dest: from, start: m.when, end: m.when }, { seats, home, now, win, radius: 12 });
      const best = loc.options.find(o => o.depart === Math.round(m.when / 300000) * 300000) || loc.options[0];
      const rs = best ? best.riders : [];
      rs.forEach(r => used.add(r.id));
      const t = finishTrip({ from, dest: from, local: true, pickupCities: [from], drops: [{ name: from, riders: rs, mi: null }], riders: rs,
        seats: rs.reduce((n, r) => n + r.seats, 0), cap: seats, depart: m.when, miles: 0, mine: m.id, source: 'taken' }, home);
      t.arrive = t.depart + tripMinutes(t) * 60000; return t;
    }
    const cands = fits.filter(r => !used.has(r.id) && !r.local).sort((a, b) => Math.abs(a.when - m.when) - Math.abs(b.when - m.when));
    for (const r of cands) {
      if (riders.some(x => x.person && x.person === r.person)) continue;
      if (!onTheWay) {
        if ((r.from || home) !== from || r.dest !== m.dest || Math.abs(r.when - m.when) > winMs || riders.reduce((n, x) => n + x.seats, 0) + r.seats > seats) continue;
        riders.push(r); used.add(r.id); continue;
      }
      const R = checkRoute([...riders, r], { cap: seats, detour, home, start: from, end: m.dest });
      if (!R) continue;
      const passBy = m.when + minutesAlong(R.cum[R.at.get(r.from || home)]) * 60000;           // when you pass their city
      if (Math.abs(r.when - passBy) > winMs) continue;
      riders.push(r); used.add(r.id);
    }
    const R = checkRoute(riders, { cap: seats, detour, home, start: from, end: m.dest }) || checkRoute([], { cap: seats, detour, home, start: from, end: m.dest });
    if (R) return tripFromRoute(riders, R, home, seats, { depart: m.when, mine: m.id, source: 'taken' });
    const t = finishTrip({ ...buildTrip({ origins: [from], dest: m.dest }, riders, home), depart: m.when, cap: seats, mine: m.id, source: 'taken' }, home);
    t.arrive = t.depart + tripMinutes(t) * 60000; return t;
  });

  // 2. Everyone else, grouped
  const rest = fits.filter(r => !used.has(r.id));
  let groups;
  if (onTheWay) {
    const local = rest.filter(r => r.local), mapped = rest.filter(r => !r.local && coordOf(r.from || home) && coordOf(r.dest));
    const unmapped = rest.filter(r => !r.local && !(coordOf(r.from || home) && coordOf(r.dest)));
    groups = routePool(mapped, { win, cap: seats, home, detour }).map(g => g.R ? tripFromRoute(g.riders, g.R, home, seats) : null).filter(Boolean)
      .concat(pool([...local, ...unmapped], [], { win, cap: seats, home, detour, sameDest: true }).map(t => { t.cap = seats; t.arrive = t.depart + tripMinutes(t) * 60000; return t; }));
  } else {
    groups = pool(rest, [], { win, cap: seats, home, detour, sameDest: true }).map(t => { t.cap = seats; t.arrive = t.depart + tripMinutes(t) * 60000; return t; });
  }
  explainApart(groups.filter(t => t.seats < minPeople), { cap: seats, detour, home, win, onTheWay });
  groups.forEach(t => {
    const clash = mine.find(m => t.depart < m.arrive && m.depart < t.arrive);
    if (clash) t.clash = `Overlaps your ${fmtTime(clash.depart)} trip (${clash.path})`;
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
  const ph = x => (x.phone && !nameIsPhone(x) ? ' ' + fmtPhone(x.phone) : '');
  for (const t of plan.worth || []) {
    const fresh = t.riders.filter(r => !announced[r.id]);
    if (!fresh.length) continue;
    const route = t.path;
    const first = fresh.length === t.riders.length;
    out.push({ title: first ? `${t.seats} people going ${route} · ${fmtDay(t.depart)} ${fmtTime(t.depart)}` : `Another passenger: ${route} ${fmtTime(t.depart)} (${t.seats}/${t.cap})`,
      body: t.riders.map(r => `${fresh.includes(r) && !first ? 'NEW ' : ''}${r.sender}${r.seats > 1 ? ' +' + (r.seats - 1) : ''}${ph(r)} · ${r.from || t.from} → ${r.dest} · wants ${fmtTime(r.when)}${r.pickup ? ' · ' + r.pickup : ''}`).join('\n') + (t.clash ? '\n' + t.clash : ''),
      tripId: t.id });
    t.riders.forEach(r => (announced[r.id] = 1));
  }
  for (const t of plan.mine || []) {
    const fresh = t.riders.filter(r => !announced[r.id]);
    if (!fresh.length) continue;
    out.push({ title: `New passenger for your ${fmtTime(t.depart)} trip (${t.seats} people)`, body: fresh.map(r => `${r.sender}${ph(r)} · ${r.from || 'start'} → ${r.dest} · wants ${fmtTime(r.when)}`).join('\n'), tripId: t.id });
    t.riders.forEach(r => (announced[r.id] = 1));
  }
  return out;
}

// ================= SEARCH: YOUR TRIP, YOUR TIME WINDOW =================
// q = { from, dest, start, end } (start/end = the window you're free to leave, in ms).
// Finds passengers for that trip and the best times to leave inside the window.
function searchRides(requests, q, { seats = 3, home = 'San Marcos', now = Date.now(), win = 30, detour = 25, onTheWay = true, radius = 12 } = {}) {
  onTheWay = true;   // a search always looks along your whole route
  const winMs = win * 60000, from = q.from || home, dest = q.dest;
  if (!dest || !(q.end >= q.start)) return { options: [], matches: [], partial: [] };
  if (from === dest) return searchLocal(requests, q, { seats, home, now, win, radius });
  const base = checkRoute([], { cap: seats, detour, home, start: from, end: dest });
  const useRoute = onTheWay && !!base;
  const mi = (a, b) => (a === b ? 0 : coordOf(a) && coordOf(b) ? miles(coordOf(a), coordOf(b)) : null);
  // exact start/end first; otherwise pickups within `radius` miles of your start and drop-offs near your end
  const route = rs => checkRoute(rs, { cap: seats, detour, home, start: from, end: dest })
    || (radius > 0 ? checkRoute(rs, { cap: seats, detour, home, startNear: { city: from, radius }, endNear: { city: dest, radius } }) : null);
  const leadIn = R => (R.order[0] === from ? 0 : mi(from, R.order[0]) || 0);            // drive from your start to the first pickup
  const fit = requests.filter(r => !isIncomplete(r, home) && !r.local && r.when >= now - 10 * 60000 && r.seats <= seats)
    .map(r => {
      if (!useRoute) return (r.from || home) === from && r.dest === dest ? { r, ideal: r.when } : null;
      const R = route([r]);
      return R ? { r, ideal: r.when - minutesAlong(leadIn(R) + R.cum[R.at.get(r.from || home)]) * 60000 } : null;   // when you'd leave `from` to meet them
    })
    .filter(x => x && x.ideal >= q.start - winMs && x.ideal <= q.end + winMs)
    .sort((a, b) => a.ideal - b.ideal);
  const r5 = ms => Math.round(ms / 300000) * 300000;
  const times = [...new Set(fit.map(x => r5(Math.min(q.end, Math.max(q.start, x.ideal)))))];
  if (!times.length) times.push(r5(q.start));
  const seen = new Set(), options = [];
  for (const T of times) {
    const riders = [];
    for (const x of [...fit].sort((a, b) => Math.abs(a.ideal - T) - Math.abs(b.ideal - T))) {
      if (Math.abs(x.ideal - T) > winMs) continue;
      if (riders.some(y => y.person && y.person === x.r.person)) continue;
      const ok = useRoute ? route([...riders, x.r]) : riders.reduce((n, y) => n + y.seats, 0) + x.r.seats <= seats;
      if (ok) riders.push(x.r);
    }
    if (!riders.length) continue;
    const key = riders.map(r => r.id).sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const R = useRoute ? route(riders) : null;
    const t = R ? tripFromRoute(riders, R, home, seats, { depart: T, search: true })
                : Object.assign(finishTrip({ ...buildTrip({ origins: [from], dest }, riders, home), depart: T, cap: seats, search: true }, home), {});
    if (R) {
      const a = R.order[0], z = R.order[R.order.length - 1];
      if (a !== from) t.leadIn = { from, to: a, mi: Math.round(mi(from, a) || 0) };
      if (z !== dest) t.leadOut = { from: z, to: dest, mi: Math.round(mi(z, dest) || 0) };
    }
    t.arrive = t.depart + (tripMinutes(t) + minutesAlong((t.leadIn || {}).mi || 0) + minutesAlong((t.leadOut || {}).mi || 0)) * 60000;
    options.push(t);
  }
  options.sort((a, b) => b.seats - a.seats || a.depart - b.depart);
  const where = r => {
    const o = r.from || home, d = r.dest;
    if (o === from && d === dest) return 'Same trip';
    if (o === from) return 'Gets out at ' + d;
    if (d === dest) return 'Gets in at ' + o;
    return o + ' → ' + d + ' (both on the way)';
  };
  // Partly on your way: rides that overlap your road but start before it or end beyond it
  const partial = [];
  if (base) {
    const P = c => { const p = coordOf(c); return p ? [p[1] * Math.cos(p[0] * Math.PI / 180), p[0]] : null; };
    const A = P(from), B = P(dest), L = (B[0] - A[0]) ** 2 + (B[1] - A[1]) ** 2 || 1, len = miles(coordOf(from), coordOf(dest));
    const along = c => { const p = P(c); return ((p[0] - A[0]) * (B[0] - A[0]) + (p[1] - A[1]) * (B[1] - A[1])) / L; };
    const offMiles = c => { const k = Math.max(0, Math.min(1, along(c))); const p = P(c); const x = A[0] + k * (B[0] - A[0]), y = A[1] + k * (B[1] - A[1]);
      return Math.hypot(p[0] - x, p[1] - y) * 69 * 1.2; };                       // rough miles from your road
    const inFit = new Set(fit.map(x => x.r.id));
    requests.filter(r => !inFit.has(r.id) && !isIncomplete(r, home) && !r.local && r.when >= now - 10 * 60000 && coordOf(r.from || home) && coordOf(r.dest))
      .forEach(r => {
        const o = r.from || home, d = r.dest, a = along(o), b = along(d);
        if (b <= a) return;                                                     // other direction
        const s0 = Math.max(0, a), s1 = Math.min(1, b);
        if ((s1 - s0) * len < 8) return;                                        // barely overlaps
        const getIn = a >= 0 ? o : from, getOut = b <= 1 ? d : dest;
        if ((a >= 0 && offMiles(o) > 10) || (b <= 1 && offMiles(d) > 10) || getIn === getOut) return;
        const via = miles(coordOf(o), coordOf(getIn)) + miles(coordOf(getIn), coordOf(getOut)) + miles(coordOf(getOut), coordOf(d));
        if (via > miles(coordOf(o), coordOf(d)) * 1.1 + 5) return;             // your road isn't really on their way
        const ideal = r.when - minutesAlong(s0 * len * 1.2) * 60000 + (a < 0 ? minutesAlong(-a * len * 1.2) * 60000 : 0);
        if (ideal < q.start - winMs || ideal > q.end + winMs) return;
        partial.push(Object.assign({}, r, { ideal, note: `Wants ${o} → ${d}. You could take them ${getIn} → ${getOut}` + (a < 0 ? `; they'd need to get to ${from}` : '') + (b > 1 ? `; they'd go on from ${dest} themselves` : '') + '.' }));
      });
    partial.sort((x, y) => x.ideal - y.ideal);
  }
  const dist = r => ({ tripMi: mi(r.from || home, r.dest), fromYouMi: mi(from, r.from || home) });
  return { options: options.slice(0, 5), matches: fit.map(x => Object.assign({}, x.r, { ideal: x.ideal, where: where(x.r) }, dist(x.r))), partial: partial.map(r => Object.assign(r, dist(r))) };
}

// In-city search (From = To): riders going within that city or between places in the same area.
function searchLocal(requests, q, { seats, home, now, win, radius }) {
  const winMs = win * 60000, city = q.from || home;
  const mi = (a, b) => (a === b ? 0 : coordOf(a) && coordOf(b) ? miles(coordOf(a), coordOf(b)) : null);
  const near = c => c === city || (mi(city, c) != null && mi(city, c) <= Math.max(radius, 3));
  const fit = requests.filter(r => r.dest && r.when && r.when >= now - 10 * 60000 && r.seats <= seats
      && near(r.from || home) && near(r.dest) && r.when >= q.start - winMs && r.when <= q.end + winMs)
    .sort((a, b) => a.when - b.when);
  const r5 = ms => Math.round(ms / 300000) * 300000;
  const times = [...new Set(fit.map(r => r5(Math.min(q.end, Math.max(q.start, r.when)))))];
  const seen = new Set(), options = [];
  for (const T of times) {
    const riders = []; let n = 0;
    for (const r of [...fit].sort((a, b) => Math.abs(a.when - T) - Math.abs(b.when - T))) {
      if (Math.abs(r.when - T) > winMs || n + r.seats > seats || riders.some(x => x.person && x.person === r.person)) continue;
      riders.push(r); n += r.seats;
    }
    if (!riders.length) continue;
    const key = riders.map(r => r.id).sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const t = finishTrip({ from: city, dest: city, local: true, pickupCities: [city], drops: [{ name: city, riders, mi: null }],
      riders, seats: n, cap: seats, depart: T, miles: 0, search: true }, home);
    t.arrive = t.depart + tripMinutes(t) * 60000;
    options.push(t);
  }
  options.sort((a, b) => b.seats - a.seats || a.depart - b.depart);
  const where = r => { const o = r.from || home, d = r.dest; return o === d ? 'Within ' + o : o + ' → ' + d + ' (in town)'; };
  return { options: options.slice(0, 5), partial: [],
    matches: fit.map(r => Object.assign({}, r, { ideal: r.when, where: where(r), tripMi: mi(r.from || home, r.dest), fromYouMi: mi(city, r.from || home) })) };
}

// Alerts for saved searches: when the best option reaches your minimum, and when new passengers join it
function searchAlerts(searches, announced, minPeople) {
  const out = [];
  for (const { q, result } of searches) {
    const best = result.options[0];
    if (!best || best.seats < minPeople) continue;
    const fresh = best.riders.filter(r => !announced['s:' + q.id + ':' + r.id]);
    if (!fresh.length) continue;
    out.push({ title: `${best.seats} people for your ${fmtTime(q.start)}–${fmtTime(q.end)} ${q.from} → ${q.dest} trip`,
      body: `Leave ${fmtTime(best.depart)} · ${best.path}\n` + best.riders.map(r => `${fresh.includes(r) ? 'NEW ' : ''}${r.sender}${r.phone && !nameIsPhone(r) ? ' ' + fmtPhone(r.phone) : ''} · ${r.from || q.from} → ${r.dest} · wants ${fmtTime(r.when)}`).join('\n') });
    best.riders.forEach(r => (announced['s:' + q.id + ':' + r.id] = 1));
  }
  return out;
}

function offerMessage(t) {
  const left = t.cap - (t.peak != null ? t.peak : t.seats);
  const lines = [`🚗 I'm driving ${t.path || (t.local ? t.route : t.fromLabel + ' → ' + t.route)} · ${fmtDay(t.depart)} ${fmtTime(t.depart)}`];
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
    grp.map(r => r.sender + (r.seats > 1 ? ` (+${r.seats - 1})` : '') + (r.phone && !nameIsPhone(r) ? ' ' + fmtPhone(r.phone) : '')).join(', ')));
  if (t.drops.length > 1) t.drops.forEach((d, i) => d.riders.length && lines.push(`Drop ${i + 1}: ${d.name} — ${d.riders.map(r => r.sender).join(', ')}`));
  return lines.join('\n');
}

// Alert text for a new message, about YOUR car. Used by the server and the offline page alike.
function alertFor(msg, plan, home) {
  const ph = x => (x && x.phone && !nameIsPhone(x) ? ' · ' + fmtPhone(x.phone) : '');
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

const api = { whyApart, personOf, nameIsPhone, searchRides, searchAlerts, checkRoute, findRides, groupAlerts, driverBrief, planMyDay, offerMessage, tripMinutes, driveMin, alertFor, missingParts, isIncomplete, phoneOf, fmtPhone, DEFAULT_CITIES, COORDS, buildCities, cityNames, findCity, findRoute, findPickup, findSeats, parseWhen, analyze, pool, planDrops, tripMessage, fmtTime, fmtDay, parseExport, hash };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Rides = api;
})(typeof window !== 'undefined' ? window : globalThis);
