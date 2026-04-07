
'use strict';

/**
 * Phase B verification script.
 * Run with: node scripts/test-phase-b.js
 */

const http = require('http');

const TOKEN = process.env.TEST_TOKEN;
if (!TOKEN) {
  console.error('Usage: TEST_TOKEN=<jwt> node scripts/test-phase-b.js');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT, 10) || 8080;
const TEST_PARTNER_ID = parseInt(process.env.TEST_PARTNER_ID, 10) || 7;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: PORT,
      path: '/api' + path,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  let pass = 0;
  let fail = 0;

  function check(label, ok, detail) {
    if (ok) { console.log(`  ✅ ${label}`); pass++; }
    else     { console.log(`  ❌ ${label}`, detail || ''); fail++; }
  }

  // 1. GET /partners/${TEST_PARTNER_ID}/interactions — should return migrated meetings data
  console.log(`\n[1] GET /partners/${TEST_PARTNER_ID}/interactions`);
  const r1 = await req('GET', `/partners/${TEST_PARTNER_ID}/interactions`);
  check('status 200', r1.status === 200, r1.status);
  check('success true', r1.body.success === true);
  check('result is array', Array.isArray(r1.body.result), typeof r1.body.result);
  check('has migrated data', r1.body.result?.length > 0, `rows: ${r1.body.result?.length}`);
  if (r1.body.result?.[0]) {
    const row = r1.body.result[0];
    check('row has interaction_type', !!row.interaction_type, row.interaction_type);
    check('row has outcome', !!row.outcome, row.outcome);
    check('row has summary', !!row.summary, row.summary);
  }

  // 2. POST /partners/:id/interactions
  console.log(`\n[2] POST /partners/${TEST_PARTNER_ID}/interactions`);
  const r2 = await req('POST', `/partners/${TEST_PARTNER_ID}/interactions`, {
    interaction_type: 'Call',
    interaction_date: '2026-03-26',
    summary: 'Test interaction from Phase B verification run',
    outcome: 'Positive',
  });
  check('status 201', r2.status === 201, r2.status);
  check('success true', r2.body.success === true, r2.body.message);
  check('result has id', !!r2.body.result?.id, r2.body.result);
  const newId = r2.body.result?.id;

  // 3. PATCH /interactions/:id (update)
  if (newId) {
    console.log('\n[3] PATCH /interactions/' + newId);
    const r3 = await req('PATCH', `/interactions/${newId}`, { next_steps: 'Follow up next week', outcome: 'Neutral' });
    check('status 200', r3.status === 200, r3.status);
    check('success true', r3.body.success === true, r3.body.message);
  }

  // 4. GET /dashboard/followups
  console.log('\n[4] GET /dashboard/followups');
  const r4 = await req('GET', '/dashboard/followups');
  check('status 200', r4.status === 200, r4.status);
  check('success true', r4.body.success === true, r4.body.message);
  check('has overdue array',   Array.isArray(r4.body.result?.overdue));
  check('has today array',     Array.isArray(r4.body.result?.today));
  check('has this_week array', Array.isArray(r4.body.result?.this_week));
  check('has total_count',     typeof r4.body.result?.total_count === 'number');

  // 5. GET /notifications/unread-count
  console.log('\n[5] GET /notifications/unread-count');
  const r5 = await req('GET', '/notifications/unread-count');
  check('status 200', r5.status === 200, r5.status);
  check('success true', r5.body.success === true, r5.body.message);
  check('has unread_count', typeof r5.body.result?.unread_count === 'number', r5.body.result);

  // 6. GET /notifications
  console.log('\n[6] GET /notifications');
  const r6 = await req('GET', '/notifications');
  check('status 200', r6.status === 200, r6.status);
  check('success true', r6.body.success === true);
  check('has notifications array', Array.isArray(r6.body.result?.notifications));

  // 7. GET /leads (school flow still works)
  console.log('\n[7] GET /leads (existing school flow)');
  const r7 = await req('GET', '/leads?page=1&limit=3');
  check('status 200', r7.status === 200, r7.status);
  check('success true', r7.body.success === true, r7.body.message);
  check('has pagination', !!r7.body.pagination, r7.body.pagination);

  // 8. GET /organizations (existing org flow)
  console.log('\n[8] GET /organizations (existing school flow)');
  const r8 = await req('GET', '/organizations?page=1&limit=3');
  check('status 200', r8.status === 200, r8.status);
  check('success true', r8.body.success === true, r8.body.message);

  // 9. PATCH /interactions/:id/followup-done (needs a follow-up interaction)
  if (newId) {
    // Create one with a follow-up date first
    const r9a = await req('POST', `/partners/${TEST_PARTNER_ID}/interactions`, {
      interaction_type: 'Online Meeting',
      interaction_date: '2026-03-26',
      summary: 'Phase B follow-up test interaction with date set',
      outcome: 'Needs Follow-up',
      follow_up_date: '2026-04-01',
      follow_up_assigned_to: '1924598',
    });
    const followupId = r9a.body.result?.id;
    if (followupId) {
      console.log('\n[9] PATCH /interactions/' + followupId + '/followup-done');
      const r9 = await req('PATCH', `/interactions/${followupId}/followup-done`);
      check('status 200', r9.status === 200, r9.status);
      check('success true', r9.body.success === true, r9.body.message);
    }
  }

  // 10. DELETE /interactions/:id
  if (newId) {
    console.log('\n[10] DELETE /interactions/' + newId);
    const r10 = await req('DELETE', `/interactions/${newId}`);
    check('status 200', r10.status === 200, r10.status);
    check('success true', r10.body.success === true, r10.body.message);
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
