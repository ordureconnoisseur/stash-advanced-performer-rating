# Advanced Performer Rating

A Stash plugin that adds a multi-category rating system for performers, split across physical and performance criteria. The plugin calculates a weighted average and sets the Stash performer rating automatically.

<!-- screenshots -->

## Credits

Inspired by the [Advanced Rating System](https://discourse.stashapp.cc/t/advanced-rating-system/3096) plugin on the Stash community forums, which introduced the concept of using tags for multi-category ratings. This plugin builds on that idea with a full interactive UI modal, weighted physical/performance scoring, and configurable categories.

## Requirements

- [Stash](https://stashapp.cc) v0.27+
- Python 3.x
- [stashapp-tools](https://github.com/stg-annon/stashapp-tools): `pip install stashapp-tools`

## Installation

1. Download this repository (Code → Download ZIP) and extract it
2. Place the extracted folder inside a category subfolder of your Stash plugins directory:
   - **Linux/Mac:** `~/.stash/plugins/Utilities/Advanced Performer Rating/`
   - **Windows:** `%USERPROFILE%\.stash\plugins\Utilities\Advanced Performer Rating\`

   > The plugin must be **two levels deep** inside the plugins directory — `plugins/Category/Plugin/`. Placing it directly under `plugins/` will cause it not to appear in Stash.

3. In Stash, go to **Settings → Plugins** and click **Reload Plugins**
4. Enable **Advanced Performer Rating**
5. Run the **Create Tags** task to generate the rating tag hierarchy

## Usage

1. Navigate to any performer's page in Stash
2. Click the **★+** button (or the floating **★+ Performer Ratings** button if it doesn't appear inline)
3. A modal opens showing all rating categories with 1–5 star selectors
4. Rate each category — the overall performer rating updates automatically when you close the modal
5. Hover over a category name to see a description of what it rates

The overall rating is the average of physical categories and performance categories, each group averaged separately then combined — so both groups carry equal weight regardless of how many categories are in each.

## Configuration

Go to **Settings → Plugins → Advanced Performer Rating** to configure:

**Physical categories** (all enabled by default):

| Setting | Description |
|---|---|
| Disable: Face | Remove Face from rating |
| Disable: Breasts | Remove Breasts from rating |
| Disable: Ass | Remove Ass from rating |
| Disable: Body Overall | Remove Body Overall from rating |
| Disable: Genitals | Remove Genitals from rating |

**Performance categories** (all enabled by default):

| Setting | Description |
|---|---|
| Disable: Technique | Remove Technique from rating |
| Disable: Energy & Presence | Remove Energy & Presence from rating |
| Disable: Sluttiness | Remove Sluttiness from rating |

**Other settings:**

| Setting | Default | Description |
|---|---|---|
| Rating Star Precision | `10` | Match to your Stash rating precision: `20` = Full, `10` = Half, `5` = Quarter, `1` = Tenth |
| Minimum Required Tags | `1` | How many categories must be rated before a score is calculated |
| Allow Destructive Actions | `false` | Must be enabled before the Remove Tags task will run |

All categories are active by default — check a box to disable that category.

After changing precision, run **Process All Performers** to retroactively recalculate existing ratings.

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
- Snapped to the nearest value matching your Rating Star Precision setting (e.g. Half precision snaps to multiples of 10: 10, 20, 30 ... 100)
