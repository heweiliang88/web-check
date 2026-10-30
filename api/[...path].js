/**
 * Single entry-point for every /api/* check.
 *
 * Why this exists: Vercel's Hobby plan allows at most 12 Serverless Functions
 * per deployment, but Web Check ships one function per check (~45 of them).
 * Files in /api whose name starts with an underscore are ignored by Vercel's
 * function detection, so the original handlers are kept next to this file as
 * `_<check>.js` and dispatched from here.
 *
 * This is a deployment-layer patch only: every handler keeps its original
 * (request, response) signature and its original behaviour.
 */

const routes = {
  'archives': () => import('./_archives.js'),
  'block-lists': () => import('./_block-lists.js'),
  'breaches': () => import('./_breaches.js'),
  'caa-records': () => import('./_caa-records.js'),
  'carbon': () => import('./_carbon.js'),
  'cookies': () => import('./_cookies.js'),
  'dns': () => import('./_dns.js'),
  'dns-server': () => import('./_dns-server.js'),
  'dnssec': () => import('./_dnssec.js'),
  'firewall': () => import('./_firewall.js'),
  'get-ip': () => import('./_get-ip.js'),
  'headers': () => import('./_headers.js'),
  'hsts': () => import('./_hsts.js'),
  'http-security': () => import('./_http-security.js'),
  'linked-pages': () => import('./_linked-pages.js'),
  'location': () => import('./_location.js'),
  'mail-config': () => import('./_mail-config.js'),
  'mixed-content': () => import('./_mixed-content.js'),
  'ports': () => import('./_ports.js'),
  'quality': () => import('./_quality.js'),
  'rank': () => import('./_rank.js'),
  'redirects': () => import('./_redirects.js'),
  'robots-txt': () => import('./_robots-txt.js'),
  'screenshot': () => import('./_screenshot.js'),
  'security-txt': () => import('./_security-txt.js'),
  'shodan': () => import('./_shodan.js'),
  'sitemap': () => import('./_sitemap.js'),
  'social-presence': () => import('./_social-presence.js'),
  'social-tags': () => import('./_social-tags.js'),
  'ssl': () => import('./_ssl.js'),
  'status': () => import('./_status.js'),
  'subdomains': () => import('./_subdomains.js'),
  'tech-stack': () => import('./_tech-stack.js'),
  'threats': () => import('./_threats.js'),
  'tls-connection': () => import('./_tls-connection.js'),
  'tls-labs': () => import('./_tls-labs.js'),
  'trace-route': () => import('./_trace-route.js'),
  'trackers': () => import('./_trackers.js'),
  'txt-records': () => import('./_txt-records.js'),
  'whois': () => import('./_whois.js'),
};

/** Work out which check was requested, from the catch-all path segments */
const resolveCheckName = (request) => {
  const fromQuery = request.query?.path;
  const segments = Array.isArray(fromQuery) ? fromQuery : fromQuery ? [fromQuery] : [];
  if (segments.length) return String(segments[0]).replace(/\.js$/, '').toLowerCase();
  const fromUrl = (request.url || '').split('?')[0].split('/').filter(Boolean);
  return (fromUrl[1] || '').replace(/\.js$/, '').toLowerCase();
};

export default async function handler(request, response) {
  const checkName = resolveCheckName(request);
  const loadHandler = routes[checkName];

  if (!loadHandler) {
    response.status(404).json({ error: `Unknown check: ${checkName || '(none)'}` });
    return;
  }

  try {
    const module = await loadHandler();
    const check = module.default || module.handler;
    if (typeof check !== 'function') {
      response.status(500).json({ error: `Check "${checkName}" did not export a handler` });
      return;
    }
    await check(request, response);
  } catch (error) {
    if (!response.headersSent) {
      response.status(500).json({ error: error.message });
    }
  }
}
