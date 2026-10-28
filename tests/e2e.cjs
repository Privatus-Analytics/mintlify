// Runs the example Mintlify site with `mint dev` and checks what the tracker sends.
// Requests to privatusstats.com/api are caught here, so nothing reaches Privatus Analytics.
const assert = require('assert/strict');
const { chromium } = require('playwright');

const BASE = process.env.MINT_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  // The tracker skips automated browsers. Look like a person's browser for this test.
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  const page = await context.newPage();
  const hits = [];
  await page.route(/privatusstats\.com\/api\//, (route) => {
    const body = route.request().postData();
    if (body) hits.push(JSON.parse(body));
    route.fulfill({ status: 202, body: '' });
  });
  const waitFor = async (check, what) => {
    for (let i = 0; i < 50; i++) { if (hits.some(check)) return; await page.waitForTimeout(200); }
    throw new Error('no hit for ' + what + '. Hits: ' + JSON.stringify(hits));
  };

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const tags = await page.$$eval('script[src*="/js/pa.js"]', (s) => s.map((x) => x.outerHTML));
  assert.equal(tags.length, 1, 'one tracker tag');
  assert.match(tags[0], /data-site="pa_Test123"/);
  assert.match(tags[0], /data-modules="engage,auto,vitals,clicks,ask"/);
  console.log('ok   Mintlify ran privatus-analytics.js and added the tracker');

  await waitFor((h) => h.t === 'pageview' && h.s === 'pa_Test123' && new URL(h.u).pathname === '/', 'first page view');
  console.log('ok   first page view sent');

  await page.click('[data-testid="copy-code-button"]', { force: true });
  await waitFor((h) => h.t === 'event' && h.n === 'Code copied' && h.p && h.p.language, 'Code copied');
  console.log('ok   Code copied event sent with language ' + hits.find((h) => h.n === 'Code copied').p.language);


  await page.click('a[href="/guide"]');
  await waitFor((h) => h.t === 'pageview' && new URL(h.u).pathname === '/guide', 'page view after moving to /guide');
  console.log('ok   page view sent after moving to another page without a reload');
  assert.equal(await page.locator('script[src*="/js/pa.js"]').count(), 1, 'still one tracker tag');
  console.log('ok   still one tracker tag after moving between pages');

  await browser.close();
  console.log('e2e passed');
})().catch((e) => { console.error(e); process.exit(1); });
