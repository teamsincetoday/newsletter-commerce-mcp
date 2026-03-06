# `analyze_newsletter_sponsors` — Example Output

Identify sponsored sections, estimate CPM value, and score sponsor-reader fit. Accepts a `newsletter_id` from a previous extraction (no re-processing) or raw content directly.

## Example Call

```json
{
  "tool": "analyze_newsletter_sponsors",
  "arguments": {
    "newsletter_id": "swipe-file-issue-47"
  }
}
```

## Example Output

```json
{
  "sponsors": [
    {
      "sponsor_name": "Beehiiv",
      "section_context": "Today's issue is brought to you by Beehiiv — the newsletter platform built for growth",
      "estimated_cpm_usd": 35,
      "estimated_read_through": 0.61,
      "call_to_action": "beehiiv.com/growth",
      "sponsor_fit_score": 0.88
    }
  ],
  "sponsor_count": 1,
  "avg_read_through": 0.61,
  "estimated_total_cpm_usd": 35,
  "_meta": {
    "cache_hit": true,
    "processing_time_ms": 9
  }
}
```

## What to do with this

- **`cache_hit: true`** — 9ms response. The sponsor analysis reuses the same extraction from `extract_newsletter_products`. Workflow: extract once per issue, run any analysis tool for free on the same data.
- **`sponsor_fit_score: 0.88`** — strong audience alignment. Beehiiv is pitching newsletter-building tools to a newsletter-reading audience. High fit → higher CTR → Beehiiv renews. Low fit would mean the sponsor is burning budget and won't re-book.
- **`estimated_total_cpm_usd: 35` with 1 sponsor** — single sponsor placement. Compare against the industry benchmark: newsletters at this size typically carry 1–2 sponsors at $25–$40 CPM. This placement is at the top of the range.
- For competitive analysis: run this tool against 10 competitor newsletters to benchmark their CPM rates and sponsor categories. Identify underpriced competitors or categories where demand is outpacing supply.
- An agent can call this on every new issue automatically and alert when `sponsor_fit_score` drops below 0.65 — early warning that sponsor mix is degrading.
