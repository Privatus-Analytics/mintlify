# Privatus Analytics for Mintlify

**Real visitor numbers for your Mintlify docs. No cookies, no cookie pop-up, no bots.**

You want to know which docs pages people read. But many analytics tools use
cookies, so in many countries you must show a cookie pop-up first (the box that
asks visitors to say yes to cookies). Many people click no, so they never show
up in your numbers. Bots add fake visits on top.

This is one small file. Drop it next to your `docs.json` and set your site id.
Mintlify runs it on every page, so Privatus Analytics starts counting. The
script sets no cookies and keeps no IP addresses. Bots are filtered out before
they are counted.

So you see how many real people read your docs, which pages they read, how far
they scroll and where they came from, on one simple dashboard. You also see
which code samples people copy, so you know which ones matter most.

**Free plan, no card:** 10,000 events a month (an event is a page view or an
action you track) on up to 3 sites. [Start free at privatusanalytics.com](https://privatusanalytics.com).

- **No cookies.** No cookies and no hidden IDs on your visitors' devices, and no
  IP addresses are kept. Laws differ by country, so check your own legal advice.
- **Real people, not bots.** Known bots, data centers and spam visits are left
  out on every plan.
- **Small and fast.** The tracker is about 3 KB when compressed.

## Install

1. Get your site id. It starts with `pa_`. You find it in Privatus Analytics
   under Site settings, Tracking.
2. Download [`privatus-analytics.js`](privatus-analytics.js) and put it in the
   folder that holds your `docs.json`:

   ```sh
   curl -O https://raw.githubusercontent.com/Privatus-Analytics/mintlify/v1.0.0/privatus-analytics.js
   ```

3. Open the file and set your site id:

   ```js
   SITE_ID: 'pa_YOURSITEID',
   ```

4. Commit and push. Mintlify adds every `.js` file in that folder to every page
   (see [Custom scripts](https://www.mintlify.com/docs/customize/custom-scripts)
   in the Mintlify docs).

That's it. The file adds this tag to your pages:

```html
<script defer src="https://privatusstats.com/js/pa.js" data-site="pa_YOURSITEID" data-modules="engage,auto,vitals,clicks,ask"></script>
```

Mintlify changes pages without a full reload. The tracker sees each change and
counts it as a new page view.

## What you get

| Module | What it does |
|---|---|
| `engage` | Time on page and how far people scroll |
| `auto` | Clicks on outbound links, file downloads and email links |
| `vitals` | Page speed numbers from real visitors |
| `clicks` | Click maps, so you see where people click |
| `ask` | Short on-page surveys you set up in Privatus Analytics |

On top of that, the file sends a `Code copied` event each time someone copies
a code block, with the code language (like `bash` or `python`). You find it
under Events in your dashboard.

## Settings

Every setting sits at the top of `privatus-analytics.js`. Only `SITE_ID` is
needed.

| Setting | Default | What it does |
|---|---|---|
| `SITE_ID` | `'pa_YOURSITEID'` | Your site id. Nothing is tracked until you set it |
| `MODULES` | `'engage,auto,vitals,clicks,ask'` | Extra tracker features, with commas. Empty loads none |
| `DOMAINS` | `''` | Count only these hostnames, like `'docs.example.com'`, so preview copies are left out |
| `EXCLUDE` | `''` | Paths that are never counted, like `'/drafts/*'` |
| `TRACK_CODE_COPY` | `true` | Send a `Code copied` event when someone copies a code block |
| `DEBUG` | `false` | Show each hit in the browser console and send nothing |
| `ATTRIBUTES` | `{}` | Any other [tracker attribute](https://privatusanalytics.com/docs/tracker/attributes), like `{ 'data-mask': '/users/*->/users/:id' }`. Names that do not start with `data-` are left out |

A site id that does not look like `pa_` followed by letters and digits is
never used. You see a warning in the browser console in its place.

### Testing on `mint dev`

The tracker does not count `localhost`. To see it work while you write, set
`DEBUG: true`. Each hit then shows in the browser console and nothing is sent.
To send real hits from `localhost`, use `ATTRIBUTES: { 'data-allow-local': 'true' }`.
Set both back before you push.

## Track your own events

Add `data-privatus-event` to any link in your MDX pages. Each click sends an
event:

```mdx
<a href="https://example.com/signup" data-privatus-event="Signup clicked" data-privatus-prop-plan="pro">Start free</a>
```

Or send an event from your own `.js` file:

```js
window.privatus.track('Search used', { section: 'api' })
```

Calls made before the tracker has loaded wait in a queue, so they are never
lost. Never put names, emails or anything that points to one person in an
event. See [Custom events](https://privatusanalytics.com/docs).

## Read your numbers from code or AI tools

- JSON API: [privatusanalytics.com/docs/api](https://privatusanalytics.com/docs/api)
- MCP server for AI tools: [github.com/Privatus-Analytics/mcp-server](https://github.com/Privatus-Analytics/mcp-server)

## Tests

`./run-docker.sh` runs every test in Docker:

1. Unit tests in a real Chromium browser: site id checks, settings, the copy
   event and adding the tracker only once.
2. A real Mintlify site: it starts `mint dev` with the [example](example) site,
   opens it in Chromium and checks the page view, the `Code copied` event and
   the page view after moving to another page. Requests to Privatus Analytics
   are caught by the test, so nothing is sent.

Set `MINT_VERSION` to test one Mintlify CLI version, like
`MINT_VERSION=4.2.1157 ./run-docker.sh`.

## License

MIT, Copyright (c) 2026 Two Phase LLC. See [LICENSE](LICENSE).
