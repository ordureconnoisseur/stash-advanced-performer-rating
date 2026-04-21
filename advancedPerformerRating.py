import sys
import re
import json

try:
    import stashapi.log as log
    from stashapi.stashapp import StashInterface
except ModuleNotFoundError:
    print(
        "You need to install the stashapi module. (pip install stashapp-tools)",
        file=sys.stderr,
    )
    sys.exit(1)

# TAGS
TAG_PATTERN = re.compile(r"^(.+?)\s*:\s*([0-5])$")
SVG_TAG_IMG = (
    "data:image/svg+xml;base64,PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIi"
    "AiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KDTwhLS0gVXBsb2FkZW"
    "QgdG86IFNWRyBSZXBvLCB3d3cuc3ZncmVwby5jb20sIFRyYW5zZm9ybWVkIGJ5OiBTVkcgUmVwbyBNaXhlciBUb2"
    "9scyAtLT4KPHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD"
    "0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KDTxnIGlkPSJTVkdSZXBvX2JnQ2Fycm"
    "llciIgc3Ryb2tlLXdpZHRoPSIwIi8+Cg08ZyBpZD0iU1ZHUmVwb190cmFjZXJDYXJyaWVyIiBzdHJva2UtbGluZW"
    "NhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KDTxnIGlkPSJTVkdSZXBvX2ljb25DYXJyaWVyIj"
    "4gPHBhdGggZD0iTTUuNjM2MDUgNS42MzYwNUwxOC4zNjQgMTguMzY0TTUuNjM2MDUgMTguMzY0TDE4LjM2NCA1Lj"
    "YzNjA1TTIxIDEyQzIxIDE2Ljk3MDYgMTYuOTcwNiAyMSAxMiAyMUM3LjAyOTQ0IDIxIDMgMTYuOTcwNiAzIDEyQz"
    "MgNy4wMjk0NCA3LjAyOTQ0IDMgMTIgM0MxNi45NzA2IDMgMjEgNy4wMjk0NCAyMSAxMloiIHN0cm9rZT0iI2ZmZm"
    "ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPiA8L2c+Cg08L3N2Zz4="
)
TAG_RATING_PARENT = {
    "name": "Performer Ratings",
    "sort_name": "#Performer Ratings",
    "description": "Performer Rating System",
    "auto_ignore_tag": True,
    "image": SVG_TAG_IMG
}

ALL_PHYSICAL = ["Face", "Breasts", "Ass", "Body Overall", "Genitals"]
ALL_PERFORMANCE = ["Technique", "Energy & Presence", "Sluttiness"]

DISABLE_KEYS = {
    "Face":              "disable_face",
    "Breasts":           "disable_breasts",
    "Ass":               "disable_ass",
    "Body Overall":      "disable_body_overall",
    "Genitals":          "disable_genitals",
    "Technique":         "disable_technique",
    "Energy & Presence": "disable_energy_presence",
    "Sluttiness":        "disable_sluttiness",
}

# GLOBALS
settings = {
    "minimum_required_tags": 1,
    "allow_destructive_actions": False
}

def main():
    global json_input, stash, phys_cats, perf_cats, minimum_required_tags
    json_input = read_stdin_json()
    stash = connect_to_stash(json_input)
    config = load_plugin_config(stash)
    update_settings_from_config(config)
    phys_cats = [c for c in ALL_PHYSICAL  if not settings.get(DISABLE_KEYS[c], False)]
    perf_cats = [c for c in ALL_PERFORMANCE if not settings.get(DISABLE_KEYS[c], False)]
    minimum_required_tags = int(settings.get("minimum_required_tags", 1))
    handle_actions(json_input, stash, phys_cats, perf_cats)
    handle_hooks(json_input, stash)

def read_stdin_json():
    try:
        raw_input = sys.stdin.read()
        return json.loads(raw_input) if raw_input.strip() else {}
    except Exception as e:
        log.error(f"READ STDIN JSON: {e}")
        return {}

def connect_to_stash(json_input):
    try:
        server_connection = json_input["server_connection"]
        return StashInterface(server_connection)
    except Exception as e:
        log.error(f"CONNECT TO STASH: {e}")
        return None

def load_plugin_config(stash):
    try: return stash.get_configuration().get("plugins", {})
    except: return {}

def update_settings_from_config(config):
    if "advancedPerformerRating" in config: settings.update(config["advancedPerformerRating"])

def handle_actions(json_input, stash, phys_cats, perf_cats):
    args = json_input.get("args", {})
    mode = args.get("mode")
    if mode == "process_performers": processPerformers(stash, phys_cats, perf_cats)
    elif mode == "create_tags": createTags(phys_cats + perf_cats)
    elif mode == "remove_tags": removeTags(ALL_PHYSICAL + ALL_PERFORMANCE)

def handle_hooks(json_input, stash):
    if not stash:
        log.error("HANDLE HOOKS: No stash connection.")
        return
    args = json_input.get("args", {})
    hook = args.get("hookContext", {})
    if hook.get("type") == "Performer.Update.Post":
        performerID = hook.get("id")
        if not performerID:
            log.error("HANDLE HOOKS: Missing performer ID in hook context.")
            return
        performer = stash.find_performer(performerID)
        if performer: calculate_rating(stash, performer, phys_cats, perf_cats)

def calculate_rating(stash, performer, phys_cats, perf_cats):
    tags = [tag['name'] for tag in performer['tags']]
    phys_scores = {}
    perf_scores = {}
    for tag in tags:
        match = TAG_PATTERN.match(tag)
        if match:
            category, score = match.groups()
            category = category.strip()
            if category in phys_cats: phys_scores[category] = int(score)
            elif category in perf_cats: perf_scores[category] = int(score)
    if (len(phys_scores) + len(perf_scores)) < minimum_required_tags: return
    avg_phys = sum(phys_scores.values()) / len(phys_scores) if phys_scores else 0
    avg_perf = sum(perf_scores.values()) / len(perf_scores) if perf_scores else 0
    if phys_scores and perf_scores: final_avg = (avg_phys + avg_perf) / 2
    elif phys_scores: final_avg = avg_phys
    elif perf_scores: final_avg = avg_perf
    else: return
    final_rating = round(final_avg * 2) / 2
    final_rating = max(1.0, min(5.0, final_rating))
    final_rating100 = round(final_rating * 20)
    if performer.get("rating100") != final_rating100:
        log.info(f"Updating Performer {performer['name']} rating to {final_rating}/5 ({final_rating100}/100)")
        stash.update_performer({"id": performer["id"], "rating100": final_rating100})

def processPerformers(stash, phys_cats, perf_cats):
    performers = stash.find_performers({}, get_count=False)
    for p in performers: calculate_rating(stash, p, phys_cats, perf_cats)

def find_tag(name, create=False, parent_id=None):
    tag = stash.find_tag(name, create=False)
    if tag is None and create:
        tag = stash.create_tag({"name": name})
        if tag:
            update_data = {"id": tag["id"], "ignore_auto_tag": True}
            if parent_id: update_data["parent_ids"] = [parent_id]
            stash.update_tag(update_data)
    return tag

def createTags(categories):
    root_tag = find_tag(TAG_RATING_PARENT["name"], create=True)
    if not root_tag: return
    parent_id = root_tag["id"]
    for cat in categories:
        cat_tag = find_tag(cat, create=True, parent_id=parent_id)
        if cat_tag:
            cat_id = cat_tag["id"]
            for i in range(0, 6): find_tag(f"{cat}: {i}", create=True, parent_id=cat_id)

def removeTags(categories):
    if not settings.get("allow_destructive_actions", False):
        log.warning("Destructive actions disabled.")
        return
    for cat in categories:
        for i in range(0, 6):
            tag = stash.find_tag(f"{cat}: {i}")
            if tag: stash.destroy_tag(tag["id"])
        tag = stash.find_tag(cat)
        if tag: stash.destroy_tag(tag["id"])
    root = stash.find_tag(TAG_RATING_PARENT["name"])
    if root: stash.destroy_tag(root["id"])

if __name__ == "__main__": main()
