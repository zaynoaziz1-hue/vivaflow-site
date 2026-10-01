const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {Client} = require('@modelcontextprotocol/sdk/client/index.js');
const {StreamableHTTPClientTransport} = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const mcp = require('../api/mcp');
const page = require('../api/page');
let server, base;
before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/mcp') return void mcp(req, res);
    req.query = {page: url.searchParams.get('page') || 'home'};
    page(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
test('HTML and Markdown negotiate correctly, including q=0 and weighted preferences', async () => {
  for (const [accept, type] of [['*/*','text/html'],['text/html','text/html'],['text/markdown','text/markdown'],['text/markdown;q=0, text/html','text/html'],['text/markdown;q=0.2, text/html;q=0.9','text/html']]) {
    const response = await fetch(base, {headers:{accept}});
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), new RegExp(type));
    assert.equal(response.headers.get('vary'), 'Accept');
    assert.match(response.headers.get('cache-control'), /no-store/);
    const body = await response.text();
    assert.ok(body.includes('Vivaflow'));
    if (type === 'text/markdown') assert.doesNotMatch(body, /<script|<style|<!doctype/i);
  }
  assert.equal((await fetch(base,{headers:{accept:'application/json'}})).status,406);
  assert.equal((await fetch(base+'?page=../../etc/passwd')).status,404);
  assert.equal((await fetch(base,{method:'POST'})).status,405);
  assert.equal(await (await fetch(base,{method:'HEAD'})).text(),'');
});
test('SDK client can initialize, discover and invoke both real MCP tools', async () => {
  const client = new Client({name:'readiness-test',version:'1.0.0'});
  const transport = new StreamableHTTPClientTransport(new URL(base+'/mcp'));
  try {
    await client.connect(transport);
    const {tools} = await client.listTools();
    assert.equal(tools.length,2);
    for (const tool of tools) {
      const response = await client.callTool({name:tool.name,arguments:{}});
      assert.ok(!response.isError);
      const value = JSON.parse(response.content[0].text);
      if (tool.name === 'get_services') assert.equal(value.services.length,4);
      else {assert.match(value.bookingUrl,/calendly.com/); assert.match(value.bookingInstructions,/does not reserve/);}
    }
    const bad = await client.callTool({name:'book_appointment',arguments:{}});
    assert.equal(bad.isError,true);
  } finally {await client.close();}
});
test('MCP rejects disallowed browser origins and unsupported HTTP methods', async () => {
  assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(base+'/mcp')).status,405);
  const malformed = await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:'not json'});
  assert.equal(malformed.status,400);
});
test('discovery documents point to real artifacts; skills digest matches', () => {
  for (const file of ['index.html', 'contact/index.html', 'services/website-design/index.html']) {
    assert.equal(fs.existsSync('public/' + file), false, 'Static HTML must not shadow the Vercel page rewrite');
  }
  const index = JSON.parse(fs.readFileSync('public/.well-known/agent-skills/index.json'));
  const skill = index.skills[0];
  assert.equal(skill.digest,'sha256:'+crypto.createHash('sha256').update(fs.readFileSync('public'+skill.url)).digest('hex'));
  const catalog = JSON.parse(fs.readFileSync('public/.well-known/api-catalog'));
  for (const rel of ['item','service-desc','service-doc']) for (const link of catalog.linkset[0][rel]) {
    assert.ok(fs.existsSync('public'+new URL(link.href).pathname));
  }
  const xml = fs.readFileSync('public/sitemap.xml','utf8');
  assert.equal((xml.match(/<loc>/g)||[]).length,3);
  assert.ok(!xml.includes('/portfolio/'));
  for (const name of fs.readdirSync('public/portfolio')) assert.match(fs.readFileSync(`public/portfolio/${name}/index.html`,'utf8'),/noindex, follow/);
  assert.match(fs.readFileSync('public/contact/index.md','utf8'),/https:\/\/calendly.com\/zaynoaziz1\/30min/);
});
test('WebMCP tools register and return actual public information; unsupported browsers are unaffected', async () => {
  const script = fs.readFileSync('public/assets/js/agent-tools.js','utf8');
  vm.runInNewContext(script,{document:{},navigator:{}});
  for (const target of ['document','navigator']) {
    const registered=[];
    const context={document:{},navigator:{}};
    context[target].modelContext={registerTool(tool){registered.push(tool);}};
    vm.runInNewContext(script,context);
    assert.equal(registered.length,2);
    const result=await registered[1].execute({});
    assert.equal(JSON.parse(result.content[0].text).durationMinutes,30);
  }
});
