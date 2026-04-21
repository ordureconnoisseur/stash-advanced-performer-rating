# Advanced Performer Rating

A Stash plugin that adds a multi-category rating system for performers, split across physical and performance criteria. The plugin calculates a weighted average and sets the Stash performer rating automatically.

## Requirements

- [Stash](https://stashapp.cc) v0.27+
- Python 3.x
- [stashapp-tools](https://github.com/stashapp/stash-app-tools): `pip install stashapp-tools`

## Installation

1. Download and extract the plugin into your Stash plugins directory (e.g. `~/.stash/plugins/Advanced Performer Rating/`)
2. In Stash, go to **Settings → Plugins** and click **Reload Plugins**
3. The **Advanced Performer Rating** plugin should now appear — enable it
4. Run the **Create Tags** task to generate the rating tag hierarchy

## Usage

1. Navigate to any performer's page in Stash
2. Click the **★+** button (or the floating **★+ Performer Ratings** button if it doesn't appear inline)
3. A modal opens showing all rating categories with 1–5 star selectors
4. Rate each category — the overall performer rating updates automatically when you close the modal
5. Hovering over categories shows a description of what each one rates

The overall rating is the average of physical categories and performance categories, each group averaged separately, then combined — so the two groups have equal weight regardless of how many categories are in each.

## Configuration

Go to **Settings → Plugins → Advanced Performer Rating** to configure:

| Setting | Default | Description |
|---|---|---|
| Physical Categories | `Face,Breasts,Ass,Body Overall,Genitals` | Comma-separated physical rating categories |
| Performance Categories | `Technique,Energy & Presence` | Comma-separated performance rating categories |
| Minimum Required Tags | `1` | How many categories must be rated before a score is calculated |
| Allow Destructive Actions | `false` | Must be enabled before the Remove Tags task will run |

After changing categories, re-run **Create Tags** to generate tags for any new categories.

## Tasks

- **Process All Performers** — Recalculates ratings for every performer based on their existing tags
- **Create Tags** — Creates the rating tag hierarchy under a "Performer Ratings" parent tag
- **Remove Tags** — Deletes all rating tags (requires Allow Destructive Actions to be enabled)

## How It Works

Each category gets a tag in the format `Category: N` (e.g. `Face: 4`). When a performer is updated, the hook reads those tags, calculates the weighted average across both groups, and sets the Stash rating. Tags are organised in a hierarchy: `Performer Ratings > Category > Category: N`.

### Rating Calculation

- Physical score = average of all rated physical categories
- Performance score = average of all rated performance categories  
- Final score = average of physical and performance scores (equal weight)
- Mapped to Stash's 0–100 scale (1 star = 20, 5 stars = 100)
