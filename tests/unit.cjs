// Runs privatus-analytics.js on an empty page in a real browser, with different settings.
const assert = require('assert/strict');
const { chromium } = require('playwright');
const { configured } = require('./helpers.cjs');

const SITE = "SITE_ID: 'pa_YOURSITEID'";

async function run(browser, code) {
  const page = await browser.newPage();
  const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  // Never load the real tracker in unit tests.
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.goto('http://example.test/docs/page');
  await page.setContent('<html><head></head><body></body></html>');
  await page.addScriptTag({ content: code });
  const result = await page.evaluate(() => ({
    scripts: [...document.querySelectorAll('script[src*="/js/pa.js"]')].map((s) => {
      const attrs = {};
      for (const a of s.attributes) attrs[a.name] = a.value;
      return attrs;
    }),
    queue: window.privatus ? typeof window.privatus.track : 'none',
  }));
  result.warnings = warnings;
  result.page = page;
  return result;
}

const tests = {
  async 'placeholder site id adds nothing and warns'(b) {
    const r = await run(b, configured([]));
    assert.equal(r.scripts.length, 0);
    assert.equal(r.queue, 'none');
    assert.match(r.warnings.join(' '), /Set SITE_ID/);
  },
  async 'bad site id adds nothing and warns'(b) {
    for (const bad of ['pa_', 'pa_abc-1', 'xx_abc', 'pa_x\\"><img src=x onerror=alert(1)>', ' ']) {
      const r = await run(b, configured([[SITE, `SITE_ID: '${bad}'`]]));
      assert.equal(r.scripts.length, 0, bad);
      assert.match(r.warnings.join(' '), /SITE_ID/, bad);
    }
  },
  async 'good site id adds one tracker with the default modules'(b) {
    const r = await run(b, configured([[SITE, "SITE_ID: 'pa_AbC123'"]]));
    assert.equal(r.scripts.length, 1);
    assert.deepEqual(r.scripts[0], {
      src: 'https://privatusstats.com/js/pa.js',
      defer: '',
      'data-site': 'pa_AbC123',
      'data-modules': 'engage,auto,vitals,clicks,ask',
    });
    assert.equal(r.queue, 'function');
    assert.deepEqual(r.warnings, []);
  },
  async 'site id with spaces around it is trimmed'(b) {
    const r = await run(b, configured([[SITE, "SITE_ID: '  pa_AbC123 '"]]));
    assert.equal(r.scripts[0]['data-site'], 'pa_AbC123');
  },
  async 'settings become tracker attributes, unsafe names are left out'(b) {
    const r = await run(b, configured([
      [SITE, "SITE_ID: 'pa_AbC123'"],
      ["MODULES: 'engage,auto,vitals,clicks,ask'", "MODULES: ' engage , clicks ,'"],
      ["DOMAINS: ''", "DOMAINS: 'docs.example.com, example.com'"],
      ["EXCLUDE: ''", "EXCLUDE: '/drafts/*'"],
      ['DEBUG: false', 'DEBUG: true'],
      ['ATTRIBUTES: {}', "ATTRIBUTES: { 'data-mask': '/u/*->/u/:id', 'data-site': 'pa_Other', onload: 'alert(1)', 'data-x\"y': 'z', 'data-empty': null }"],
    ]));
    assert.deepEqual(r.scripts[0], {
      src: 'https://privatusstats.com/js/pa.js',
      defer: '',
      'data-site': 'pa_AbC123',
      'data-modules': 'engage,clicks',
      'data-domains': 'docs.example.com,example.com',
      'data-exclude': '/drafts/*',
      'data-debug': 'true',
      'data-mask': '/u/*->/u/:id',
    });
  },
  async 'empty modules leaves the attribute off'(b) {
    const r = await run(b, configured([[SITE, "SITE_ID: 'pa_AbC123'"], ["MODULES: 'engage,auto,vitals,clicks,ask'", "MODULES: ''"]]));
    assert.equal(r.scripts[0]['data-modules'], undefined);
  },
  async 'running twice adds the tracker once'(b) {
    const code = configured([[SITE, "SITE_ID: 'pa_AbC123'"]]);
    const r = await run(b, code);
    await r.page.addScriptTag({ content: code });
    assert.equal(await r.page.locator('script[src*="/js/pa.js"]').count(), 1);
  },
  async 'a tracker already on the page is not added again'(b) {
    const page = await b.newPage();
    await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await page.goto('http://example.test/');
    await page.setContent('<html><head><script defer src="https://privatusstats.com/js/pa.js" data-site="pa_Old"></script></head><body></body></html>');
    await page.addScriptTag({ content: configured([[SITE, "SITE_ID: 'pa_AbC123'"]]) });
    assert.equal(await page.locator('script[src*="/js/pa.js"]').count(), 1);
  },
  async 'copying a code block queues a Code copied event with the language'(b) {
    const r = await run(b, configured([[SITE, "SITE_ID: 'pa_AbC123'"]]));
    await r.page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend',
        '<div class="code-block" language="TypeScript"><button data-testid="copy-code-button" aria-label="Copy the contents from the code block"><svg><path id="icon"></path></svg></button><pre language="typescript"><code>let a = 1</code></pre></div>' +
        '<div><button aria-label="Copy"><span id="plain"></span></button><pre><code class="language-bash">ls</code></pre></div>' +
        '<button aria-label="Copy page" id="page-copy"></button>' +
        '<button id="other">Next</button>');
    });
    await r.page.evaluate(() => {
      for (const id of ['icon', 'plain', 'page-copy', 'other']) {
        document.getElementById(id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    const queue = await r.page.evaluate(() => window.privatus.q);
    assert.deepEqual(queue, [
      ['track', ['Code copied', { language: 'typescript' }]],
      ['track', ['Code copied', { language: 'bash' }]],
    ]);
  },
  async 'TRACK_CODE_COPY false sends no copy events'(b) {
    const r = await run(b, configured([[SITE, "SITE_ID: 'pa_AbC123'"], ['TRACK_CODE_COPY: true', 'TRACK_CODE_COPY: false']]));
    await r.page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div class="code-block"><button data-testid="copy-code-button" id="c">c</button><pre>x</pre></div>'));
    await r.page.click('#c');
    assert.deepEqual(await r.page.evaluate(() => window.privatus.q), []);
  },
};

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try { await fn(browser); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n' + e.stack); }
  }
  await browser.close();
  console.log(`${Object.keys(tests).length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
