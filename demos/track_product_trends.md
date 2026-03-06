# `track_product_trends` — Example Output

Compare product mentions across multiple newsletter issues to identify rising, stable, and falling product trends. Requires issues to be previously extracted and cached via `extract_newsletter_products`.

## Example Call

```json
{
  "tool": "track_product_trends",
  "arguments": {
    "newsletter_ids": [
      "swipe-file-issue-43",
      "swipe-file-issue-44",
      "swipe-file-issue-45",
      "swipe-file-issue-46",
      "swipe-file-issue-47",
      "swipe-file-issue-48"
    ]
  }
}
```

## Example Output

```json
{
  "trends": [
    {
      "name": "Notion AI",
      "category": "saas",
      "trend": "rising",
      "issues_present": 4,
      "total_mentions": 7
    },
    {
      "name": "Claude (Anthropic)",
      "category": "saas",
      "trend": "rising",
      "issues_present": 3,
      "total_mentions": 4
    },
    {
      "name": "Obsidian",
      "category": "saas",
      "trend": "falling",
      "issues_present": 2,
      "total_mentions": 2
    },
    {
      "name": "Beehiiv",
      "category": "saas",
      "trend": "stable",
      "issues_present": 6,
      "total_mentions": 6
    },
    {
      "name": "Readwise",
      "category": "saas",
      "trend": "stable",
      "issues_present": 5,
      "total_mentions": 8
    },
    {
      "name": "Roam Research",
      "category": "saas",
      "trend": "falling",
      "issues_present": 1,
      "total_mentions": 1
    }
  ],
  "newsletter_ids": [
    "swipe-file-issue-43",
    "swipe-file-issue-44",
    "swipe-file-issue-45",
    "swipe-file-issue-46",
    "swipe-file-issue-47",
    "swipe-file-issue-48"
  ],
  "analysis_window_issues": 6,
  "_meta": {
    "processing_time_ms": 44,
    "cache_hit": true
  }
}
```

## What to do with this

- **Notion AI + Claude both `rising`** — AI writing tools dominating the organic mention space over the last 6 issues. This audience is clearly adopting AI tools fast. Strong signal to prioritise AI tool sponsors or affiliate deals over the next quarter.
- **Obsidian + Roam Research both `falling`** — PKM note-taking apps losing traction. If you have affiliate deals with either, now is the time to renegotiate or replace. Don't renew annual deals in a falling category.
- **Readwise `stable` × 5 issues** — consistent mention without being a sponsor. This is a missed monetisation opportunity. Readwise has an affiliate programme; the organic authority is already there.
- **Beehiiv `stable` × 6 issues** — already a paid sponsor and still appearing organically. High alignment sponsor. Proof point for renewals and for prospecting similar platforms (ConvertKit, Ghost, Kit).
- For an automated content strategy agent: hook this tool into a weekly cron, alert when any category goes 3 issues without a `rising` product — signals content topic drift before audience metrics show it.
