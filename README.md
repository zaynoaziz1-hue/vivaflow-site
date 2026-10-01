# Vivaflow

Static marketing pages with generated discovery documents, Markdown representations,
and public read-only MCP tools. Deploy on Vercel with the repository root as the
project root, Node 22, and the settings in `vercel.json`.

```sh
npm ci
npm test
```

The build copies the existing design into `public/` and generates alternate text
from the three real Vivaflow pages. Edit the original HTML, not generated output.
`lib/business.json` is the structured service directory; update it when services,
pricing policy or the booking link change. Portfolio businesses are fictional
concepts, so their generated pages have `noindex` and are excluded from the sitemap.

`api/page.js` serves HTML or Markdown according to the Accept header. It uses
`Vary: Accept` and `private, no-store` to avoid Cloudflare mixing HTML and Markdown.
This trades caching on the three marketing pages for reliable negotiation.
Assets and static discovery files remain cacheable. Do not override these cache
headers with a Cloudflare Cache Everything rule.

`api/mcp.js` uses the official MCP SDK with Streamable HTTP and per-request
stateless transports. The two tools are read-only: service information and a
Calendly booking link. No customer information is accepted or stored. No appointment
is booked by these tools. WebMCP exposes the same data in compatible browsers;
ordinary browsers retain the existing experience.

See [deployment and remaining readiness work](docs/agent-readiness.md).
