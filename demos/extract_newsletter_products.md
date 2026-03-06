# `extract_newsletter_products` — Example Output

Extract product mentions, recommendations, and affiliate links from a newsletter. Supports HTML (Substack, Ghost, Beehiiv) and plain text. Returns product names, categories, recommendation strength, affiliate links, and whether each product appears in a sponsored section.

## Example Call

```json
{
  "tool": "extract_newsletter_products",
  "arguments": {
    "content": "**This week's tools** — I've been running my entire writing workflow through Notion AI for three months now. Genuinely the best $10/month I spend... [SPONSOR] Today's issue is brought to you by Beehiiv — the newsletter platform built for growth. Start free at beehiiv.com/growth... Back to tools: I finally switched to Linear for project management. No affiliate link, just a real recommendation. The Kanban view alone is worth it...",
    "newsletter_id": "swipe-file-issue-47",
    "format": "markdown"
  }
}
```

## Example Output

```json
{
  "newsletter_id": "swipe-file-issue-47",
  "products": [
    {
      "name": "Notion AI",
      "category": "saas",
      "mention_context": "running my entire writing workflow through Notion AI for three months now. Genuinely the best $10/month",
      "recommendation_strength": "strong",
      "affiliate_link": null,
      "confidence": 0.94,
      "is_sponsored": false
    },
    {
      "name": "Beehiiv",
      "category": "saas",
      "mention_context": "newsletter platform built for growth. Start free at beehiiv.com/growth",
      "recommendation_strength": "endorsed",
      "affiliate_link": "beehiiv.com/growth",
      "confidence": 0.99,
      "is_sponsored": true
    },
    {
      "name": "Linear",
      "category": "saas",
      "mention_context": "switched to Linear for project management. No affiliate link, just a real recommendation. The Kanban view alone is worth it",
      "recommendation_strength": "strong",
      "affiliate_link": null,
      "confidence": 0.96,
      "is_sponsored": false
    }
  ],
  "sponsor_sections": [
    {
      "sponsor_name": "Beehiiv",
      "section_context": "Today's issue is brought to you by Beehiiv",
      "estimated_cpm_usd": 35,
      "estimated_read_through": 0.61,
      "call_to_action": "beehiiv.com/growth",
      "sponsor_fit_score": 0.88
    }
  ],
  "_meta": {
    "processing_time_ms": 1620,
    "ai_cost_usd": 0.0028,
    "cache_hit": false
  }
}
```

## What to do with this

- **Notion AI + Linear: `is_sponsored: false`, `recommendation_strength: "strong"`** — organic endorsements. Both have affiliate programs (Notion has a referral programme; Linear does not at time of writing). This is a monetisation gap: Notion affiliate link could replace the organic mention at zero credibility cost.
- **Beehiiv `sponsor_fit_score: 0.88`** — high fit between sponsor and newsletter audience. This is the score to benchmark future sponsors against. A fit score below 0.6 signals audience mismatch and risks unsubscribes.
- **`estimated_cpm_usd: 35`** — Beehiiv is paying ~$35 CPM. Use this to set a floor for future sponsor negotiations. If a new sponsor proposes $20 CPM, you have data to push back.
- Run `track_product_trends` across the last 12 issues to see which SaaS tools are organically mentioned most consistently — those are your best partnership targets.
