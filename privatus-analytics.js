/*
 * Privatus Analytics for Mintlify docs.
 * https://github.com/Privatus-Analytics/mintlify
 *
 * Put this file next to your docs.json. Mintlify runs every .js file in that
 * folder on every page, so you need nothing else.
 *
 * Set SITE_ID to your own site id. You find it in Privatus Analytics under
 * Site settings, Tracking. It starts with pa_.
 *
 * The tracker sets no cookies and keeps no IP addresses.
 * MIT License, Copyright (c) 2026 Two Phase LLC.
 */
(function () {
  'use strict';

  var SETTINGS = {
    // Your site id, like pa_AbC123.
    SITE_ID: 'pa_YOURSITEID',
    // Extra tracker features. See https://privatusanalytics.com/docs/tracker/modules
    MODULES: 'engage,auto,vitals,clicks,ask',
    // Count only these hostnames, like 'docs.example.com'. Empty counts all.
    DOMAINS: '',
    // Paths that are never counted, like '/drafts/*'. Empty counts all.
    EXCLUDE: '',
    // Send an event when someone copies a code block.
    TRACK_CODE_COPY: true,
    // Show each hit in the browser console and send nothing. For testing.
    DEBUG: false,
    // Any other tracker attribute, like { 'data-mask': '/users/*->/users/:id' }.
    // Names that do not start with data- are left out.
    ATTRIBUTES: {}
  };

  var SITE_ID_PATTERN = /^pa_[A-Za-z0-9]+$/;
  var SCRIPT_SRC = 'https://privatusstats.com/js/pa.js';

  function warn(message) {
    if (window.console && window.console.warn) window.console.warn('[Privatus Analytics] ' + message);
  }

  function cleanList(value) {
    return String(value || '')
      .split(',')
      .map(function (item) { return item.trim(); })
      .filter(function (item) { return item.length > 0; })
      .join(',');
  }

  // Queue calls to window.privatus.track until the tracker has loaded.
  function addQueue() {
    var p = (window.privatus = window.privatus || { q: [] });
    if (!p.q) p.q = [];
    ['track', 'pageview', 'props', 'optOut', 'optIn', 'ready'].forEach(function (name) {
      p[name] = p[name] || function () { p.q.push([name, Array.prototype.slice.call(arguments)]); };
    });
  }

  function trackerAlreadyOnPage() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if ((scripts[i].getAttribute('src') || '').indexOf('/js/pa.js') !== -1) return true;
    }
    return false;
  }

  function addTracker(siteId) {
    var script = document.createElement('script');
    script.defer = true;
    script.src = SCRIPT_SRC;
    // setAttribute stores the value as text, so nothing in it can become HTML.
    script.setAttribute('data-site', siteId);
    var modules = cleanList(SETTINGS.MODULES);
    if (modules) script.setAttribute('data-modules', modules);
    var domains = cleanList(SETTINGS.DOMAINS);
    if (domains) script.setAttribute('data-domains', domains);
    var exclude = cleanList(SETTINGS.EXCLUDE);
    if (exclude) script.setAttribute('data-exclude', exclude);
    if (SETTINGS.DEBUG === true) script.setAttribute('data-debug', 'true');
    var extra = SETTINGS.ATTRIBUTES || {};
    Object.keys(extra).forEach(function (name) {
      var value = extra[name];
      if (!/^data-[a-z0-9-]+$/.test(name) || name === 'data-site') return;
      if (value === null || value === undefined) return;
      script.setAttribute(name, String(value));
    });
    document.head.appendChild(script);
  }

  // Mintlify gives every code block a copy button. Send one event per copy,
  // with the code language when Mintlify knows it.
  function watchCodeCopies() {
    document.addEventListener('click', function (event) {
      var target = event.target;
      var button = target && target.closest ? target.closest('button, [role="button"]') : null;
      if (!button) return;
      var label = (button.getAttribute('data-testid') || '') + ' ' + (button.getAttribute('aria-label') || '');
      if (!/copy/i.test(label)) return;
      var block = button.closest('.code-block');
      if (!block) {
        // Older layouts: the nearest small wrapper that holds a <pre>.
        block = button.parentElement;
        for (var depth = 0; block && depth < 3 && !block.querySelector('pre'); depth++) block = block.parentElement;
      }
      if (!block || /^(BODY|HTML|MAIN|ARTICLE)$/.test(block.tagName)) return;
      var pre = block.querySelector('pre');
      if (!pre) return;
      var language = block.getAttribute('language') || pre.getAttribute('language') || '';
      if (!language) {
        var code = pre.querySelector('code');
        var match = code && /language-([A-Za-z0-9_+-]+)/.exec(code.className || '');
        if (match) language = match[1];
      }
      language = String(language).toLowerCase().replace(/[^a-z0-9_+-]/g, '').slice(0, 40);
      window.privatus.track('Code copied', language ? { language: language } : {});
    }, true);
  }

  var siteId = String(SETTINGS.SITE_ID || '').trim();
  if (siteId === 'pa_YOURSITEID') {
    warn('Set SITE_ID in privatus-analytics.js to your own site id.');
    return;
  }
  if (!SITE_ID_PATTERN.test(siteId)) {
    warn('SITE_ID must look like pa_ followed by letters and digits. Nothing is tracked.');
    return;
  }

  addQueue();
  if (window.__privatusMintlify || trackerAlreadyOnPage()) return;
  window.__privatusMintlify = true;
  addTracker(siteId);
  if (SETTINGS.TRACK_CODE_COPY === true) watchCodeCopies();
})();
