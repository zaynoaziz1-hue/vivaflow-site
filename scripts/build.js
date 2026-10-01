const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cheerio = require('cheerio');
const Turndown = require('turndown');
const business = require('../lib/business.json');
const tools = require('../lib/tools');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'public');
const origin = business.url;
const pages = {};
function write(name, value) {
  const target = path.join(out, name);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
}
fs.mkdirSync(out, {recursive: true});
for (const dir of ['assets', 'portfolio']) fs.cpSync(path.join(root, dir), path.join(out, dir), {recursive: true});
const entries = [{key:'home', file:'index.html', url:'/'}, {key:'contact',file:'contact/index.html',url:'/contact/'}, {key:'website-design',file:'services/website-design/index.html',url:'/services/website-design/'}];
const td = new Turndown({headingStyle:'atx'});
for (const entry of entries) {
  const $ = cheerio.load(fs.readFileSync(path.join(root, entry.file), 'utf8'));
  $('head').append(`<link rel="canonical" href="${origin}${entry.url}"><link rel="alternate" type="text/markdown" href="${origin}/markdown/${entry.key}.md"><link rel="api-catalog" href="/.well-known/api-catalog">`);
  $('body').append('<script src="/assets/js/agent-tools.js" defer></script>');
  const html = $.html();
  const main = $('main').clone();
  main.find('script, style, svg, canvas, iframe, [aria-hidden="true"]').remove();
  main.find('a[href]').each((_, node) => {const a = $(node); a.attr('href', new URL(a.attr('href'), origin + entry.url).href);});
  const markdown = `# ${$('title').text()}\n\nSource: ${origin}${entry.url}\n\n${td.turndown(main.html())}\n`;
  pages[entry.key] = {html, markdown};
  // Vercel serves existing files before applying rewrites. Keep HTML in the
  // function's generated data only, so every page reaches negotiation.
  const staleHtml = path.join(out, entry.file);
  if (fs.existsSync(staleHtml)) fs.unlinkSync(staleHtml);
  const staleMarkdown = path.join(out, entry.url.slice(1), 'index.md');
  if (fs.existsSync(staleMarkdown)) fs.unlinkSync(staleMarkdown);
  write('markdown/' + entry.key + '.md', markdown);
}
// Fictional concepts must not be indexed as real home-service businesses.
for (const name of fs.readdirSync(path.join(out, 'portfolio'))) {
  const file = path.join(out, 'portfolio', name, 'index.html');
  if (!fs.existsSync(file)) continue;
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  $('head').append('<meta name="robots" content="noindex, follow">');
  fs.writeFileSync(file, $.html());
}
fs.writeFileSync(path.join(root, 'lib/pages.json'), JSON.stringify(pages));
write('robots.txt', `# Public content may be indexed and used to answer questions.\n# Training preferences are intentionally unspecified.\nUser-agent: *\nContent-Signal: search=yes, ai-input=yes\nAllow: /\n\n${['OAI-SearchBot','Claude-SearchBot','Claude-User','Googlebot','Google-Extended'].map(bot => `User-agent: ${bot}\nAllow: /\n`).join('\n')}\nSitemap: ${origin}/sitemap.xml\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(e => `  <url><loc>${origin}${e.url}</loc></url>`).join('\n')}\n</urlset>\n`);
write('data/services.json', business);
write('data/audit.json', business.audit);
write('auth.md', '# Vivaflow auth.md\n\nVivaflow’s public content, service directory and read-only MCP tools require no account, API key, token or registration.\n\nNo registration, credential provisioning, OAuth authorization server or protected customer API is offered on this site. Do not send credentials or personal information to the public tools.\n\nBooking is completed by the customer on Calendly: https://calendly.com/zaynoaziz1/30min . Its access and privacy policies apply. The public tools only return a link; they do not book, cancel or modify appointments.\n');
write('openapi.json', {openapi:'3.1.0',info:{title:'Vivaflow public information API',version:'1.0.0',description:'Read-only service information and audit booking link. No booking or customer-data API.'},servers:[{url:origin}],security:[],paths:Object.fromEntries([['services','Vivaflow services and business information', business],['audit','Free audit details and booking link',business.audit]].map(([name,summary,example]) => [`/data/${name}.json`,{get:{operationId:`get_${name}`,summary,responses:{200:{description:'Public information',content:{'application/json':{schema:{type:'object'},example}}}}}}]))});
write('.well-known/api-catalog', {linkset:[{anchor:`${origin}/.well-known/api-catalog`,item:[{href:`${origin}/data/services.json`,type:'application/json'},{href:`${origin}/data/audit.json`,type:'application/json'}],'service-desc':[{href:`${origin}/openapi.json`,type:'application/vnd.oai.openapi+json'}],'service-doc':[{href:`${origin}/auth.md`,type:'text/markdown'}]}]});
write('.well-known/mcp/server-card.json', {serverInfo:{name:'vivaflow',version:'1.0.0'},description:'Public read-only service information and audit booking link. No appointment creation.',capabilities:{tools:{}},transport:{type:'streamable-http',endpoint:`${origin}/mcp`},tools:tools.map(t=>({name:t.name,description:t.description,inputSchema:{type:'object',properties:{},additionalProperties:false}}))});
const skill = '---\nname: vivaflow-services\ndescription: Explain Vivaflow services and help a home service business find the free audit booking page.\n---\n\n# Vivaflow services and audit\n\nRead https://vivaflow.org/data/services.json for current services, audience and pricing approach. Read https://vivaflow.org/data/audit.json for the free audit and booking link. Both are public GET endpoints; no credentials are needed.\n\nThe read-only MCP endpoint https://vivaflow.org/mcp offers get_services and get_audit_booking_link. Neither tool creates a booking.\n\nOffer the Calendly link when the user wants an audit. The user must select a slot and complete booking there. Do not claim an appointment is confirmed merely because you returned a link. Implementation pricing requires a business review. Portfolio businesses are fictional concepts, not customer testimonials.\n';
write('.well-known/agent-skills/vivaflow-services/SKILL.md', skill);
write('.well-known/agent-skills/index.json', {$schema:'https://schemas.agentskills.io/discovery/0.2.0/schema.json',skills:[{name:'vivaflow-services',type:'skill-md',description:'Read Vivaflow services and find the free audit booking link.',url:'/.well-known/agent-skills/vivaflow-services/SKILL.md',digest:'sha256:'+crypto.createHash('sha256').update(skill).digest('hex')}]});
write('llms.txt', `# Vivaflow\n\n> Websites and automation for home service businesses. Miami-based, working nationwide.\n\n## Information\n${entries.map(e=>`- [${e.key}](${origin}/markdown/${e.key}.md)`).join('\n')}\n- [Public API](${origin}/openapi.json)\n- [Access instructions](${origin}/auth.md)\n\nPortfolio sites are fictional concepts, not customer case studies.\n`);
write('assets/js/agent-tools.js', `(() => {\n const context = document.modelContext || navigator.modelContext;\n if (!context || typeof context.registerTool !== 'function') return;\n const tools = ${JSON.stringify(tools)};\n for (const tool of tools) {\n  Promise.resolve(context.registerTool({name:tool.name,description:tool.description,inputSchema:{type:'object',properties:{},additionalProperties:false},execute:async () => ({content:[{type:'text',text:JSON.stringify(tool.value)}]})})).catch(() => {});\n }\n})();\n`);
console.log('Built public site, Markdown, discovery documents and agent tools.');
