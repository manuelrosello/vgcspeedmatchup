#  VGC Speed Matchup

Compare your team with six opposing Pokémon.

Run locally from this directory:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). The page reads `speeds.json` in the browser; no data is sent anywhere.

The formula is `floor((base + EV + 20) * alignment)`, with alignment `1` for neutral, `1.1` for positive and `0.9` for negative.

Tailwind doubles the calculated final speed for that team, and Trick Room reverses the final ranking.

Your team can be saved to local storage and will automatically load on refresh.
