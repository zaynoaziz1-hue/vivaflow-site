# Agent readiness: implementation and release checklist

## Implemented, pending deployment and a Cloudflare rescan

- Valid `/robots.txt` with explicit search crawler groups and a sitemap reference.
- Content Signals allowing search and AI answer use; general training preference
  remains unspecified. Google-Extended is allowed for Gemini grounding, which also
  permits the Google uses covered by that control, including training.
- `/sitemap.xml` lists the three canonical real-business pages.
- HTML/Markdown negotiation on those pages, plus direct `/index.md`,
  `/contact/index.md`, and `/services/website-design/index.md` URLs.
- Link response headers, an RFC 9727 Linkset API catalog, OpenAPI description and
  two working static JSON GET endpoints (`/data/services.json`, `/data/audit.json`).
- `/auth.md` truthfully explains public access and the absence of registration.
  This is documentation, not an implementation of agent registration; a stricter
  scanner may still fail the Auth.md check.
- A working `/mcp` service and `/.well-known/mcp/server-card.json`.
- Agent skill document and SHA-256 discovery index.
- Browser WebMCP tools with feature detection; scanner support must be verified.

The highest Cloudflare tier is NOT verified or claimed by this implementation.
Passing a technical check is not a guarantee of AI recommendations or citations.

## Deploy and verify

1. Review the changes and deploy the branch to a Vercel preview first. Confirm the
   Vercel project uses the repository root, honors `vercel.json`, runs `npm run build`,
   and serves `public` plus the two functions. A static-only upload is insufficient.
2. Verify regular pages, styles, portfolio previews and the Calendly widget.
3. Check both representations on the same URL:

   ```sh
   curl -i https://vivaflow.org/ -H 'Accept: text/html'
   curl -i https://vivaflow.org/ -H 'Accept: text/markdown'
   curl -i https://vivaflow.org/.well-known/api-catalog
   curl -i https://vivaflow.org/mcp -H 'Content-Type: application/json' \
     -H 'Accept: application/json, text/event-stream' \
     --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"check","version":"1"}}}'
   ```

4. In Cloudflare, verify AI Crawl Control and security rules permit the desired
   search crawlers. Public robots directives do not override firewall rules.
5. Check the delivered robots file after Cloudflare's managed robots processing.
   Remove contradictory injected restrictions through that feature's controls;
   do not disable unrelated security protections. Purge a stale robots cache if needed.
6. Verify Markdown requests reach the origin and no cache rule overrides no-store.
   Origin conversion avoids needing the paid Markdown for Agents feature.
7. Rescan in Agent Readiness and inspect each audit's actual response. Record the
   observed status; do not infer the final tier from a local test count.

## Still needed for the advanced checks

| Check | Actual prerequisite |
| --- | --- |
| OAuth discovery / protected resource | A genuine protected service and identity provider, with authorization, token validation and user consent. Vivaflow currently has neither a client account system nor private API. |
| Auth.md registration | A real registration or credential provisioning flow if required by the scanner. Public access instructions alone may not satisfy it. |
| A2A agent card | A working agent-to-agent endpoint with meaningful supported tasks. Do not advertise an agent that does not exist. |
| Web Bot Auth | An actual outbound bot, secure private-key storage, signed requests and published public keys. This site currently makes no outbound agent requests. |
| DNS-AID | Cloudflare DNS access, published service records for the deployed endpoint, and DNSSEC coordination with the registrar. Confirm current DNS-AID schema before configuring records. |

For a useful next phase, decide whether Vivaflow should offer authenticated audit
requests or a client portal. Direct scheduling needs an approved Calendly integration
and appropriate credentials; the existing public URL only supports booking handoff.
Never publish placeholder OAuth endpoints, fake keys or metadata claiming booking
capabilities merely to turn a check green.

## References

- https://blog.cloudflare.com/agent-readiness/
- https://blog.cloudflare.com/aeo/
- https://isitagentready.com/.well-known/agent-skills/index.json
- https://www.rfc-editor.org/rfc/rfc9727.html
- https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
