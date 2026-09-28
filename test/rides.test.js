// Run: npm test
const assert = require('assert');
const R = require('../lib/rides');
const chat = `9/27/26, 8:02 AM - Priya Shah: need a ride to Austin today around 5:30pm, pickup at LBJ Student Center
9/27/26, 8:15 AM - Marcus Lee: anyone going to austin this evening? like 5pm. me and my roommate
9/27/26, 8:40 AM - Jordan Diaz: I'm driving to Austin at 5:15 today, have 4 seats
9/27/26, 9:05 AM - Aisha Khan: Need a ride to Kyle at 5:25 pm pls
9/27/26, 9:20 AM - Ethan Brooks: looking for a ride to San Antonio tomorrow 9am
9/27/26, 9:31 AM - Sofia Ramirez: anyone heading to SA tmrw morning? 9:30ish
9/27/26, 9:48 AM - Daniel Kim: need a lift to AUS airport at 7pm today
9/27/26, 10:02 AM - Hannah Wu: going to New Braunfels tomorrow around 10am? need ride, 2 of us
9/27/26, 11:03 AM - Ethan Brooks: nvm found a ride
9/27/26, 11:10 AM - Mia Torres: Need a ride to the airport at 7:15 pm today
9/27/26, 11:20 AM - Omar Farouk: ride to Austin?
[9/27/26, 11:25:10 AM] Kevin Ortiz: need ride back from Austin to San Marcos tonight 10pm`;
const a = R.analyze(R.parseExport(chat), R.buildCities());
const by = n => a.requests.find(r => r.sender === n);
assert.strictEqual(a.requests.length, 9);
assert.strictEqual(by('Marcus Lee').seats, 2);
assert.strictEqual(new Date(by('Sofia Ramirez').when).getHours() + ':' + new Date(by('Sofia Ramirez').when).getMinutes(), '9:30');
assert.strictEqual(by('Mia Torres').dest, 'Austin Airport (AUS)');
assert.strictEqual(by('Omar Farouk').when, null);
assert.strictEqual(by('Kevin Ortiz').from, 'Austin');
assert.ok(!by('Ethan Brooks') && a.cancelled.some(c => c.sender === 'Ethan Brooks'));
const trips = R.pool(a.requests, a.drivers, { win: 30, cap: 4 });
const austin = trips.find(t => t.riders.some(r => r.sender === 'Priya Shah'));
assert.deepStrictEqual(austin.drops.map(d => d.name), ['Kyle', 'Austin']);   // Kyle is on the way
assert.strictEqual(austin.driver.sender, 'Jordan Diaz');
assert.strictEqual(trips.find(t => t.dest === 'Austin Airport (AUS)').riders.length, 2);
assert.deepStrictEqual(trips.find(t => t.riders.some(r => r.sender === 'Hannah Wu')).drops.map(d => d.name), ['New Braunfels', 'San Antonio']);
assert.ok(trips.every(t => t.seats <= t.cap));
console.log('All ride parsing and pooling checks passed (' + trips.length + ' cars for ' + a.requests.filter(r => r.dest && r.when).length + ' requests).');

// Driver passing several cities picks up riders in each, in one car
{
  const chat2 = `9/27/26, 2:10 PM - Priya: need a ride from Austin to San Marcos today at 5pm
9/27/26, 2:12 PM - Ravi: need ride from round rock to san marcos today 5:15pm, 2 of us
9/27/26, 2:14 PM - Anu: any rides available from Austin to San Marcos today at 5?
9/27/26, 2:20 PM - Md Rasheed: Ride available from Georgetown/roundrock /Austin to San Marcos at 5 pm`;
  const b = R.analyze(R.parseExport(chat2), R.buildCities());
  assert.deepStrictEqual(b.drivers.map(d => d.sender), ['Md Rasheed']);
  assert.deepStrictEqual(b.drivers[0].froms, ['Georgetown', 'Round Rock', 'Austin']);
  assert.ok(b.requests.some(r => r.sender === 'Anu'), '"any rides available?" is a passenger');
  const t2 = R.pool(b.requests, b.drivers, { win: 30, cap: 4 });
  const car = t2.find(t => t.driver && t.driver.sender === 'Md Rasheed');
  assert.ok(car.seats <= 3, 'never more riders than the driver offered');
  assert.ok(car.riders.length >= 2, 'riders from different cities share his car');
  console.log('Multi-city driver: ' + car.from + ' → ' + car.route + ' with ' + car.riders.map(r => r.sender).join(', '));
}

// Within-city rides stay separate; a driver's riders are close in time; the car leaves at the driver's time
{
  const at = hm => new Date('2026-09-27T' + hm + ':00').getTime();
  const msgs = [
    { id: 'l1', ts: at('15:16'), sender: 'A', text: 'Need a ride within SM rn' },
    { id: 'l2', ts: at('15:41'), sender: 'Soumik', text: 'I am driving to Austin at 4 pm, have 3 seats' },
    { id: 'l3', ts: at('15:42'), sender: 'JPG', text: 'need a ride to Austin at 4:15pm' },
    { id: 'l4', ts: at('15:43'), sender: 'Late', text: 'need a ride to Austin at 5pm' },
    { id: 'l5', ts: at('15:44'), sender: 'Night', text: 'need a ride from Austin to SM tonight 12:30 am' }];
  const c = R.analyze(msgs, R.buildCities());
  const cars = R.pool(c.requests, c.drivers, { win: 30, cap: 4, home: 'San Marcos' });
  const local = cars.find(t => t.riders.some(r => r.sender === 'A'));
  assert.strictEqual(local.route, 'Within San Marcos'); assert.strictEqual(local.riders.length, 1); assert.ok(!local.driver);
  const sc = cars.find(t => t.driver && t.driver.sender === 'Soumik');
  assert.deepStrictEqual(sc.riders.map(r => r.sender), ['JPG']);            // 5pm rider is too far from 4:15 to share
  assert.strictEqual(new Date(sc.depart).getHours(), 16);
  const night = c.requests.find(r => r.sender === 'Night');
  assert.strictEqual(new Date(night.when).getDate(), 28);                    // "tonight 12:30 am" = after midnight
  console.log('Local rides and timing: OK');
}

// One car: your trip gets passengers, trips never overlap, other drivers are ignored
{
  const at = hm => new Date('2026-09-27T' + hm + ':00').getTime();
  const msgs = [
    ['15:07', 'zzz', 'need ride to Austin at 5:15pm'],
    ['15:13', 'Other Driver', 'Ride available from San Marcos to Austin at 5 pm, 3 seats'],
    ['15:16', 'Kyle', 'need a ride to Kyle at 4:50pm'],
    ['15:20', 'P', 'Need ride from Austin to SM at 7 PM'],
    ['15:21', 'Tanu', 'need ride from Austin to SM at 7:15 PM, 2 of us'],
    ['15:33', 'Ishant', 'need ride from Austin to San Marcos at 5:30pm'],
    ['15:34', 'Big', 'need a ride to Austin at 5pm, 5 of us'],
    ['15:40', 'Me', 'I am driving to Austin at 5 pm, have 3 seats', true],
  ].map(([hm, s, x, me], i) => ({ id: 'p' + i, ts: at(hm), sender: s, text: x, fromMe: !!me }));
  const a = R.analyze(msgs, R.buildCities());
  const mine = a.drivers.filter(d => d.mine);
  assert.strictEqual(mine.length, 1);
  const P = R.planMyDay(a.requests, mine, { seats: 3, home: 'San Marcos', now: at('15:45'), win: 30 });
  const t1 = P.trips[0];
  assert.ok(t1.mine && t1.riders.map(r => r.sender).sort().join() === 'Kyle,zzz', 'your 5pm trip takes Kyle + zzz');
  assert.ok(P.trips.every(t => t.seats <= 3));
  for (let i = 1; i < P.trips.length; i++) assert.ok(P.trips[i].depart >= P.trips[i - 1].arrive, 'trips never overlap');
  assert.ok(P.trips.some(t => t.riders.some(r => r.sender === 'Tanu')), 'suggests the 7pm return that fills the car');
  assert.ok(P.skipped.some(x => x.trip.riders.some(r => r.sender === 'Ishant') && /driving Trip 1/.test(x.reason)));
  assert.ok(P.tooBig.some(r => r.sender === 'Big'));
  assert.ok(!P.trips.some(t => t.driver), 'other drivers are never used');
  console.log('One-car plan: ' + P.trips.map(t => 'Trip ' + t.order + ' ' + t.fromLabel + '→' + t.route + ' ' + t.seats + '/' + t.cap).join(' | '));
}

// Rides worth taking: same place, same time, at least N people; alerts once per group and per new passenger
{
  const at = hm => new Date('2026-09-27T' + hm + ':00').getTime();
  const msgs = [['15:07', 'zzz', 'need ride to Austin at 5:15pm'], ['15:10', 'Asha', 'need ride to Austin at 5pm'], ['15:16', 'Kyle', 'need a ride to Kyle at 4:50pm'],
    ['15:20', 'P', 'Need ride from Austin to SM at 7 PM'], ['15:21', 'Tanu', 'need ride from Austin to SM at 7:15 PM, 2 of us'], ['15:33', 'Ishant', 'need ride from Austin to San Marcos at 9pm'],
    ['15:34', 'Dave', 'need ride to Austin 5:05pm']].map(([hm, s, x], i) => ({ id: 'w' + i, ts: at(hm), sender: s, text: x }));
  const a = R.analyze(msgs, R.buildCities());
  const F = R.findRides(a.requests, [], { seats: 3, now: at('15:45'), minPeople: 3, onTheWay: false });
  const names = t => t.riders.map(r => r.sender).sort().join(',');
  assert.deepStrictEqual(F.worth.map(names), ['Asha,Dave,zzz', 'P,Tanu']);                       // Kyle is not "same place"
  assert.ok(F.small.some(t => names(t) === 'Kyle') && F.small.some(t => names(t) === 'Ishant'));
  const F4 = R.findRides(a.requests, [], { seats: 4, now: at('15:45'), minPeople: 4, onTheWay: false });
  assert.strictEqual(F4.worth.length, 0, 'nobody reaches 4 people');
  const Fw = R.findRides(a.requests, [], { seats: 4, now: at('15:45'), minPeople: 4, onTheWay: true });
  assert.deepStrictEqual(Fw.worth.map(names), ['Asha,Dave,Kyle,zzz'], 'with "cities on the way", Kyle joins');
  const ann = {};
  assert.strictEqual(R.groupAlerts(F, ann).length, 2);
  assert.strictEqual(R.groupAlerts(F, ann).length, 0, 'no repeat alerts');
  const mine = R.findRides(a.requests, [{ id: 'T', from: 'San Marcos', dest: 'Austin', when: at('17:00') }], { seats: 3, now: at('15:45'), onTheWay: false });
  assert.deepStrictEqual(mine.mine.map(names), ['Asha,Dave,zzz'], 'a trip you take gets the matching passengers');
  console.log('Rides worth taking: OK');
}

// Along the route, both directions: pickups and drop-offs on the way, seats reused, opposite direction kept apart
{
  const at = hm => new Date('2026-09-27T' + hm + ':00').getTime();
  const msgs = [['14:00', 'Asha', 'need ride to Austin at 5pm'], ['14:01', 'Kiran', 'need ride from Kyle to Austin at 5:15pm'],
    ['14:02', 'Maya', 'need a ride to Kyle at 5pm'], ['14:03', 'Dev', 'need ride from Buda to Austin 5:20pm'],
    ['14:04', 'Nora', 'need ride from New Braunfels to Austin at 4:45pm'], ['14:05', 'Ravi', 'need ride from Austin to SM at 7pm'],
    ['14:06', 'Tina', 'need ride from Austin to Kyle at 7:05pm'], ['14:07', 'Om', 'need ride from Buda to San Marcos at 7:20pm'],
    ['14:08', 'Zed', 'need ride from Austin to San Antonio at 5pm'], ['14:09', 'Late', 'need ride from Kyle to Austin at 9pm']]
    .map(([hm, s, x], i) => ({ id: 'c' + i, ts: at(hm), sender: s, text: x }));
  const a = R.analyze(msgs, R.buildCities());
  const F = R.findRides(a.requests, [], { seats: 3, now: at('14:30'), minPeople: 3 });
  const names = t => t.riders.map(r => r.sender).sort().join(',');
  const south = F.worth.find(t => t.riders.some(r => r.sender === 'Asha'));
  assert.strictEqual(south.path, 'New Braunfels → San Marcos → Kyle → Austin');
  assert.strictEqual(names(south), 'Asha,Kiran,Maya,Nora');          // Maya gets out at Kyle, Kiran gets in there
  assert.strictEqual(south.peak, 3);
  const north = F.worth.find(t => t.riders.some(r => r.sender === 'Ravi'));
  assert.strictEqual(north.path, 'Austin → Buda → Kyle → San Marcos');
  assert.strictEqual(names(north), 'Om,Ravi,Tina');
  assert.ok(![...F.worth, ...F.small].some(t => t.riders.some(r => r.sender === 'Zed') && t.riders.length > 1), 'opposite direction stays apart');
  assert.ok(F.small.some(t => names(t) === 'Late'), 'different time stays apart');
  const F4 = R.findRides(a.requests, [], { seats: 4, now: at('14:30'), minPeople: 3 });
  assert.ok(F4.worth.some(t => names(t) === 'Asha,Dev,Kiran,Maya,Nora'), 'with 4 seats Dev from Buda fits too');
  const T = R.findRides(a.requests, [{ id: 'T', from: 'San Marcos', dest: 'Austin', when: at('17:00') }], { seats: 3, now: at('14:30') });
  assert.ok(T.mine[0].riders.some(r => r.sender === 'Kiran') && T.mine[0].riders.some(r => r.sender === 'Maya'), 'your trip picks up on the way');
  console.log('Along the route: ' + south.path + ' (' + names(south) + ') | ' + north.path + ' (' + names(north) + ')');
}

// Search: your trip + the window you're free
{
  const at = hm => new Date('2026-09-27T' + hm + ':00').getTime();
  const msgs = [['14:00', 'Asha', 'need ride to Austin at 5pm'], ['14:01', 'Kiran', 'need ride from Kyle to Austin at 5:15pm'], ['14:02', 'Maya', 'need a ride to Kyle at 5pm'],
    ['14:03', 'Dev', 'need ride from Buda to Austin 6:40pm'], ['14:04', 'Nora', 'need ride to Austin at 6:30pm'], ['14:05', 'Ravi', 'need ride from Austin to SM at 7pm'],
    ['14:06', 'Sam', 'need ride to Austin at 6:45pm'], ['14:07', 'Late', 'need ride to Austin at 11pm'], ['14:08', 'Zed', 'need ride to Houston at 6pm']]
    .map(([hm, s, x], i) => ({ id: 'q' + i, ts: at(hm), sender: s, text: x }));
  const a = R.analyze(msgs, R.buildCities());
  const q = { id: 'S1', from: 'San Marcos', dest: 'Austin', start: at('16:30'), end: at('19:30') };
  const res = R.searchRides(a.requests, q, { seats: 3, now: at('14:30') });
  const names = t => t.riders.map(r => r.sender).sort().join(',');
  assert.deepStrictEqual(res.options.map(names), ['Asha,Kiran,Maya', 'Dev,Nora,Sam']);
  assert.ok(!res.matches.some(r => ['Late', 'Zed', 'Ravi'].includes(r.sender)), 'outside the window, wrong route or wrong direction are left out');
  const back = R.searchRides(a.requests, { from: 'Austin', dest: 'San Marcos', start: at('18:30'), end: at('20:00') }, { seats: 3, now: at('14:30') });
  assert.deepStrictEqual(back.options.map(names), ['Ravi'], 'the return trip finds the return rider');
  const ann = {};
  assert.strictEqual(R.searchAlerts([{ q, result: res }], ann, 3).length, 1);
  assert.strictEqual(R.searchAlerts([{ q, result: res }], ann, 3).length, 0, 'no repeat alert');
  console.log('Search: ' + res.options.map(t => R.fmtTime(t.depart) + ' ' + t.path + ' (' + names(t) + ')').join(' | '));
}

// Search shows passengers on the way, and riders partly on the way
{
  const at = hm => new Date('2026-09-27T' + hm + ':00').getTime();
  const msgs = [['14:00', 'Asha', 'need ride to Austin at 5pm'], ['14:01', 'Kiran', 'need ride from Kyle to Austin at 5:15pm'], ['14:02', 'Maya', 'need a ride to Kyle at 5pm'],
    ['14:03', 'Bo', 'need ride from Kyle to Buda at 5:15pm'], ['14:04', 'Rocky', 'need ride from Kyle to Round Rock at 5:15pm'], ['14:05', 'Nina', 'need ride from New Braunfels to Austin at 4:40pm'],
    ['14:06', 'Opp', 'need ride from Austin to Kyle at 5pm'], ['14:07', 'Hou', 'need ride to Houston at 5pm'], ['14:08', 'Wim', 'need ride to Wimberley at 5pm']]
    .map(([hm, s, x], i) => ({ id: 'p' + i, ts: at(hm), sender: s, text: x }));
  const a = R.analyze(msgs, R.buildCities());
  const res = R.searchRides(a.requests, { from: 'San Marcos', dest: 'Austin', start: at('16:30'), end: at('18:00') }, { seats: 3, now: at('14:30'), onTheWay: false });
  const w = n => (res.matches.find(r => r.sender === n) || {}).where;
  assert.strictEqual(w('Asha'), 'Same trip'); assert.strictEqual(w('Maya'), 'Gets out at Kyle'); assert.strictEqual(w('Kiran'), 'Gets in at Kyle');
  assert.strictEqual(w('Bo'), 'Kyle → Buda (both on the way)');
  assert.deepStrictEqual(res.partial.map(r => r.sender).sort(), ['Nina', 'Rocky']);
  assert.ok(!res.matches.concat(res.partial).some(r => ['Opp', 'Hou', 'Wim'].includes(r.sender)));
  console.log('Search on the way: OK');
}
