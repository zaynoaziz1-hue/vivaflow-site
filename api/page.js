const pages = require('../lib/pages.json');

function quality(accept, mime) {
  let best = {specificity: -1, q: 0};
  for (const item of accept.toLowerCase().split(',')) {
    const [type, ...params] = item.trim().split(';');
    const specificity = type === mime ? 2 : type === 'text/*' ? 1 : type === '*/*' ? 0 : -1;
    const qParam = params.map(p => p.trim()).find(p => p.startsWith('q='));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (specificity > best.specificity) best = {specificity, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0};
  }
  return best.q;
}

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    return res.end();
  }
  const name = req.query?.page;
  const page = Object.hasOwn(pages, name) ? pages[name] : undefined;
  if (!page) {res.statusCode = 404; return res.end('Not found');}
  const accept = req.headers.accept || '*/*';
  const htmlQ = quality(accept, 'text/html');
  const mdQ = quality(accept, 'text/markdown');
  // Wildcards alone should preserve the ordinary website experience.
  const markdown = /(?:^|,)\s*text\/markdown(?:\s*;|\s*,|\s*$)/i.test(accept) && mdQ > 0 && mdQ >= htmlQ;
  if (!markdown && htmlQ === 0) {res.statusCode = 406; return res.end('Not acceptable');}
  res.setHeader('Vary', 'Accept');
  // Cloudflare does not generally vary its cache by Accept; avoid mixed representations.
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', markdown ? 'text/markdown; charset=utf-8' : 'text/html; charset=utf-8');
  res.setHeader('Content-Signal', 'search=yes, ai-input=yes');
  res.setHeader('Link', '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </sitemap.xml>; rel="sitemap"');
  return res.end(req.method === 'HEAD' ? undefined : markdown ? page.markdown : page.html);
};
