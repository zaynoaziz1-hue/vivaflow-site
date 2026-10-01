const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const tools = require('../lib/tools');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers.origin && !['https://vivaflow.org', 'https://www.vivaflow.org'].includes(req.headers.origin)) {
    res.statusCode = 403;
    return res.end('Origin not allowed');
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    return res.end();
  }
  if (Number(req.headers['content-length'] || 0) > 16384) {
    res.statusCode = 413;
    return res.end();
  }
  const server = new McpServer({ name: 'vivaflow', version: '1.0.0' });
  for (const tool of tools) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: {},
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}
    }, async () => ({content: [{type: 'text', text: JSON.stringify(tool.value)}]}));
  }
  const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
  res.on('close', () => { void server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error.message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({jsonrpc: '2.0', id: null, error: {code: -32603, message: 'Internal server error'}}));
    }
  }
};
