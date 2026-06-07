# snapshots/

This directory holds weekly leaderboard snapshots used to compute
real rank movement deltas on the leaderboard page.

## Format

Each file is named `YYYY-WW.json` (ISO 8601 week, Monday start).

```json
{
  "week": "2026-W23",
  "generatedAt": "2026-06-09T00:00:00.000Z",
  "rankings": [
    { "handle": "anand-s", "rank": 1, "score": 347 },
    { "handle": "vishnu-k", "rank": 2, "score": 312 }
  ]
}
```

## Generation

Run manually: `node scripts/snapshot.js`
Run by CI: `.github/workflows/snapshot.yml` (weekly, Monday 00:00 UTC)

## Build output

`scripts/build.js` reads this directory, copies the 10 most recent snapshots
to `dist/data/snapshots/`, and writes `dist/data/snapshots/index.json` listing
them newest-first. The leaderboard page fetches that index at runtime and loads
the two most recent snapshots to compute rank deltas.

No snapshots = no rank movement indicators shown. That is the correct behaviour.
