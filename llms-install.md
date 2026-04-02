# Installing newsletter-commerce-mcp with Cline

This is a **remote MCP server** running on Cloudflare Workers. No local installation, no npm install, no build step required.

## Quick Setup (Free Tier)

Free tier: **200 calls/day, no API key required.**

Add to your Cline MCP settings (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "newsletter-commerce": {
      "url": "https://newsletter-commerce-mcp.sincetoday.workers.dev/mcp",
      "type": "streamableHttp",
      "timeout": 60
    }
  }
}
```

Cline → Extensions (⊞) → Remote Servers → paste URL: `https://newsletter-commerce-mcp.sincetoday.workers.dev/mcp`

## Paid Tier (optional)

Unlimited calls at $0.01/call. Add `X-API-Key` header with your key:

```json
{
  "mcpServers": {
    "newsletter-commerce": {
      "url": "https://newsletter-commerce-mcp.sincetoday.workers.dev/mcp",
      "type": "streamableHttp",
      "headers": {
        "X-API-Key": "your-api-key"
      },
      "timeout": 60
    }
  }
}
```

## Available Tools

- **`extract_newsletter_products`** — Extract product mentions from newsletter editions with brand, category, and affiliate link slots. Input: newsletter text/HTML. Output: structured product list.
- **`analyze_newsletter_sponsors`** — Analyze sponsor fit scores, editorial tone, and sponsor relationship quality for a newsletter edition.
- **`track_product_trends`** — Track product and brand trends across multiple newsletter editions over time.
- **`generate_newsletter_products_section`** — Format extracted products into a "Products in this edition" section (markdown or HTML) ready to embed in newsletters.

## Verify Connection

After adding the server, ask Cline: *"What tools does newsletter-commerce provide?"*

Test with: *"Extract products from this newsletter: [paste newsletter text]"*

## Specs

- Endpoint: `https://newsletter-commerce-mcp.sincetoday.workers.dev/mcp`
- Transport: Streamable HTTP (MCP spec 2025-11-05)
- Auth: None (free tier) or `X-API-Key` header (paid)
- Free tier: 200 calls/day per IP
- Paid tier: $0.01/call (x402 micropayments)
- Tests: 643 passing, F1=100%, OWASP-compliant
- Source: https://github.com/teamsincetoday/newsletter-commerce-mcp
