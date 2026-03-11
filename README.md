# Newsletter Commerce Intelligence MCP

Extract product mentions, score sponsors, and track affiliate trends from newsletters. Supports Substack, Ghost, Beehiiv, and plain text. Built for the agent-to-agent economy.

## Tools

| Tool | Description |
|------|-------------|
| `extract_newsletter_products` | Extract products, affiliate links, and sponsor mentions from a newsletter issue |
| `analyze_newsletter_sponsors` | Score sponsor sections by CPM, read-through rate, and audience fit |
| `track_product_trends` | Compare product mentions across multiple newsletter issues |

## Quick Start

```bash
# Install
npm install newsletter-commerce-mcp

# Configure
cp .env.example .env
# Edit .env: set OPENAI_API_KEY

# Run (stdio MCP server)
npx newsletter-commerce-mcp
```

## MCP Client Config

```json
{
  "mcpServers": {
    "newsletter-commerce": {
      "command": "npx",
      "args": ["newsletter-commerce-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Tool Reference

### `extract_newsletter_products`

```json
{
  "content": "Newsletter HTML or plain text (max 200k chars)",
  "newsletter_id": "optional-cache-key",
  "format": "html",
  "api_key": "optional-paid-key"
}
```

Returns:
```json
{
  "newsletter_id": "swipe-file-issue-47",
  "products": [
    {
      "name": "Notion AI",
      "category": "saas",
      "mention_context": "running my entire writing workflow through Notion AI",
      "recommendation_strength": "strong",
      "affiliate_link": null,
      "confidence": 0.94,
      "is_sponsored": false
    }
  ],
  "sponsor_sections": [...],
  "_meta": { "processing_time_ms": 1620, "ai_cost_usd": 0.0028, "cache_hit": false }
}
```

### `analyze_newsletter_sponsors`

```json
{
  "content": "Newsletter HTML or plain text",
  "newsletter_id": "optional",
  "api_key": "optional"
}
```

Returns CPM estimate, read-through rate, and sponsor-reader fit score per sponsor section.

### `track_product_trends`

```json
{
  "newsletter_ids": ["issue-45", "issue-46", "issue-47"],
  "category_filter": ["saas", "books"]
}
```

Requires prior `extract_newsletter_products` calls for each newsletter_id.

## Example Output

Real extraction from a TLDR Tech newsletter (eval score: **F1=0.97**, $0.000428/call, 7804ms):

```json
{
  "newsletter_id": "tldr-2024-03-07",
  "products": [
    {
      "name": "Groq",
      "category": "saas",
      "mention_context": "Groq has launched public API access — runs Llama 2 at 300 tokens/second",
      "confidence": 0.94,
      "recommendation_strength": "neutral"
    },
    {
      "name": "Devin (Cognition AI)",
      "category": "saas",
      "mention_context": "first AI software engineer — benchmarks show it can complete real GitHub issues end-to-end",
      "confidence": 0.91,
      "recommendation_strength": "strong"
    }
  ]
}
```

See `/examples` endpoint for full output with value narrative: `https://newsletter-commerce-mcp.sincetoday.workers.dev/examples`

## Pricing

- Free tier: 200 calls/day per agent (no API key required)
- Paid: $0.01/call — set `MCP_API_KEYS` with valid keys

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `AGENT_ID` | No | `anonymous` | Agent identifier for rate limiting |
| `MCP_API_KEYS` | No | — | Comma-separated paid API keys |
| `CACHE_DIR` | No | `./data/cache.db` | SQLite cache path |
| `PAYMENT_ENABLED` | No | `false` | Set `true` to enforce limits |

## Development

```bash
npm install
npm run typecheck   # Zero type errors
npm test            # All tests pass
npm run build       # Compile to dist/
```

## License

MIT — Since Today Studio
