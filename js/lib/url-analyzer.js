/*
 * url-analyzer.js — Heuristic, text-only analysis of a link.
 * It NEVER opens, fetches or modifies the link. It returns language-neutral
 * indicator ids; the page translates them with the active language.
 */
(function (global) {
  'use strict';

  var MAX_LEN = 2048;
  var SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc', 'buff.ly', 'rebrand.ly', 'v.gd', 's.id'];
  var KEYWORDS = ['login', 'log-in', 'signin', 'sign-in', 'verify', 'verification', 'update', 'account', 'secure', 'security', 'bank', 'password', 'passwd', 'wallet', 'confirm', 'suspend', 'unlock', 'billing', 'invoice', 'gift', 'prize', 'winner', 'free', 'bonus', 'reset'];
  var BRANDS = ['paypal', 'google', 'microsoft', 'apple', 'amazon', 'facebook', 'instagram', 'whatsapp', 'netflix', 'outlook', 'office365', 'linkedin', 'icloud', 'dhl', 'aramex'];
  var SUSPICIOUS_TLDS = ['zip', 'mov', 'xyz', 'top', 'click', 'country', 'gq', 'tk', 'ml', 'cf', 'ga', 'work', 'rest', 'loan', 'cam', 'monster', 'support', 'icu'];
  var EXEC_EXT = ['exe', 'scr', 'bat', 'cmd', 'msi', 'apk', 'jar', 'vbs', 'js', 'ps1', 'com', 'pif', 'hta', 'dmg', 'iso'];
  var SECOND_LEVEL = ['com', 'org', 'net', 'gov', 'edu', 'co', 'ac', 'mil', 'sch'];
  var WEIGHTS = {
    dangerousScheme: 45, noHttps: 12, ipHost: 25, atSymbol: 25, punycode: 20, nonAscii: 20,
    manySubdomains: 10, longUrl: 6, shortener: 15, keywords: 10, hyphens: 8, port: 10,
    executable: 25, encoded: 8, redirectParam: 12, brandLookalike: 30, suspiciousTld: 10
  };
  function severity(w) { return w >= 25 ? 'high' : w >= 12 ? 'medium' : 'low'; }

  function registrable(host) {
    var labels = host.split('.').filter(Boolean);
    if (labels.length <= 2) return labels.join('.');
    var sl = labels[labels.length - 2];
    var take = (SECOND_LEVEL.indexOf(sl) !== -1 && labels[labels.length - 1].length === 2) ? 3 : 2;
    return labels.slice(-take).join('.');
  }

  function deLeet(s) {
    return s.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/4/g, 'a').replace(/7/g, 't').replace(/\$/g, 's');
  }

  function analyze(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return { ok: false, error: 'empty' };
    if (raw.length > MAX_LEN) return { ok: false, error: 'tooLong', max: MAX_LEN };

    var found = [];
    function add(id, evidence) { found.push({ id: id, weight: WEIGHTS[id], severity: severity(WEIGHTS[id]), evidence: evidence || '' }); }

    var schemeMatch = raw.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    var scheme = schemeMatch ? schemeMatch[1].toLowerCase() : '';
    var assumedScheme = false;

    if (['javascript', 'data', 'vbscript', 'file'].indexOf(scheme) !== -1) {
      add('dangerousScheme', scheme + ':');
      return finish({ raw: raw, scheme: scheme, host: '', port: '', path: '', query: '' }, false);
    }

    var toParse = raw;
    if (!scheme || (scheme !== 'http' && scheme !== 'https' && !/^[a-z]+:\/\//i.test(raw))) {
      if (/^[^\s/:]+\.[^\s]+/.test(raw) || /^(\d{1,3}\.){3}\d{1,3}/.test(raw)) { toParse = 'http://' + raw; assumedScheme = true; }
    }

    var u;
    try { u = new URL(toParse); } catch (e) { return { ok: false, error: 'invalid' }; }
    if (!u.hostname) return { ok: false, error: 'invalid' };

    var host = u.hostname.toLowerCase().replace(/\.$/, '');
    var parts = {
      raw: raw, scheme: u.protocol.replace(':', ''), host: host, port: u.port,
      path: decodeSafe(u.pathname), query: u.search ? u.search.slice(1) : ''
    };

    if (parts.scheme === 'http') { if (!assumedScheme) add('noHttps', 'http://'); }
    else if (parts.scheme !== 'https') add('dangerousScheme', parts.scheme + ':');

    var isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
    var isIPv6 = /^\[.*\]$/.test(host);
    if (isIPv4 || isIPv6 || /^0x[0-9a-f]+$/i.test(host) || /^\d{8,10}$/.test(host)) add('ipHost', host);

    // userinfo (@) — check the raw authority part, since URL() strips it from hostname
    var authority = (raw.split('://')[1] || raw).split(/[/?#]/)[0];
    if (authority.indexOf('@') !== -1 || u.username) add('atSymbol', authority.slice(0, authority.lastIndexOf('@') + 1) || '@');

    if (/(^|\.)xn--/.test(host)) add('punycode', host);
    var rawHost = authority.split('@').pop().split(':')[0];
    if (/[^\x00-\x7F]/.test(rawHost)) add('nonAscii', rawHost);

    if (!isIPv4 && !isIPv6) {
      var labels = host.split('.');
      if (labels.length >= 5) add('manySubdomains', String(labels.length - 2));
      var reg = registrable(host);
      var tld = labels[labels.length - 1];
      if (SUSPICIOUS_TLDS.indexOf(tld) !== -1) add('suspiciousTld', '.' + tld);
      var hy = (host.replace(/xn--/g, '').match(/-/g) || []).length;
      if (hy >= 3) add('hyphens', String(hy));
      if (SHORTENERS.indexOf(host.replace(/^www\./, '')) !== -1) add('shortener', host);

      // brand look-alike: brand appears in host but registrable domain is not that brand,
      // or digits replaced letters (paypa1, g00gle, micr0soft…)
      var regName = reg.split('.')[0];
      var hostNoDigitsSwap = deLeet(host);
      for (var b = 0; b < BRANDS.length; b++) {
        var brand = BRANDS[b];
        var inHost = host.indexOf(brand) !== -1;
        var inLeet = !inHost && hostNoDigitsSwap.indexOf(brand) !== -1;
        if ((inHost && regName !== brand) || inLeet) { add('brandLookalike', host); break; }
      }
    }

    if (u.port && u.port !== '80' && u.port !== '443') add('port', u.port);
    if (raw.length > 100) add('longUrl', String(raw.length));

    var lower = (parts.path + '?' + parts.query + ' ' + host).toLowerCase();
    var kw = KEYWORDS.filter(function (k) { return new RegExp('(^|[^a-z])' + k.replace('-', '\\-') + '([^a-z]|$)').test(lower); });
    if (kw.length) add('keywords', kw.slice(0, 5).join(', '));

    var last = parts.path.split('/').pop().toLowerCase();
    var extMatch = last.match(/\.([a-z0-9]{1,4})$/);
    var double = last.match(/\.(pdf|docx?|xlsx?|jpe?g|png|txt|zip)\.([a-z0-9]{2,4})$/);
    if ((extMatch && EXEC_EXT.indexOf(extMatch[1]) !== -1) || (double && EXEC_EXT.indexOf(double[2]) !== -1)) add('executable', last);

    var encCount = (raw.match(/%[0-9a-f]{2}/gi) || []).length;
    if (encCount >= 6 || /%[0-9a-f]{2}/i.test(authority)) add('encoded', String(encCount));

    var redir = parts.query.match(/(?:^|&)(url|redirect|redirect_uri|next|goto|return|returnurl|dest|destination|continue|target)=([^&]*)/i);
    if (redir && /^(https?:|%68%74%74%70|\/\/|www\.)/i.test(decodeSafe(redir[2]))) add('redirectParam', redir[1] + '=');

    return finish(parts, assumedScheme);

    function finish(p, assumed) {
      var score = Math.min(100, found.reduce(function (s, f) { return s + f.weight; }, 0));
      var level = score >= 45 ? 'high' : score >= 20 ? 'medium' : 'low';
      found.sort(function (a, b) { return b.weight - a.weight; });
      return { ok: true, input: raw, parts: p, assumedScheme: assumed, indicators: found, score: score, level: level };
    }
  }

  function decodeSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  var api = { analyze: analyze, MAX_LEN: MAX_LEN, WEIGHTS: WEIGHTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.RabadhUrl = api;
})(typeof window !== 'undefined' ? window : globalThis);
