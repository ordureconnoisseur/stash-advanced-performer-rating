// Based on stashapp-plugin-advanced-scene-ratings by shackofnoreturn
// Original: https://github.com/shackofnoreturn/stashapp-plugin-advanced-scene-ratings
// License: AGPL v3 - https://www.gnu.org/licenses/agpl-3.0.html

(function () {
    const CATEGORY_PATTERN = /^(.+?)\s*:\s*([0-5])$/;
    let pollTimer = null;

    function tryInject(performerId) {
        if (document.querySelector('#perf-rating-trigger')) return true;
        const ratingStars = document.querySelector('.quality-group .rating-stars');
        if (ratingStars) {
            injectTrigger(ratingStars, performerId);
            return true;
        }
        return false;
    }

    function startPolling(performerId) {
        if (pollTimer) clearInterval(pollTimer);
        let attempts = 0;
        pollTimer = setInterval(() => {
            attempts++;
            if (tryInject(performerId) || attempts >= 40) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }, 100);
    }

    let lastPath = null;
    function onLocationChange() {
        const urlMatch = window.location.pathname.match(/\/performers\/(\d+)/);
        if (urlMatch && !window.location.pathname.includes('edit')) {
            const performerId = urlMatch[1];
            if (window.location.pathname !== lastPath) {
                lastPath = window.location.pathname;
                const existing = document.querySelector('#perf-rating-trigger');
                if (existing) existing.remove();
                startPolling(performerId);
            }
        } else {
            lastPath = null;
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            const existing = document.querySelector('#perf-rating-trigger');
            if (existing) existing.remove();
        }
    }

    PluginApi.Event.addEventListener('stash:location', onLocationChange);
    onLocationChange();

    async function gqlClient(query, variables) {
        const res = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables })
        });
        return res.json();
    }

    const ALL_PHYSICAL    = ["Face", "Breasts", "Ass", "Body Overall", "Genitals"];
    const ALL_PERFORMANCE = ["Technique", "Energy & Presence", "Sluttiness"];
    const DISABLE_KEYS = {
        "Face":              "disable_face",
        "Breasts":           "disable_breasts",
        "Ass":               "disable_ass",
        "Body Overall":      "disable_body_overall",
        "Genitals":          "disable_genitals",
        "Technique":         "disable_technique",
        "Energy & Presence": "disable_energy_presence",
        "Sluttiness":        "disable_sluttiness",
    };

    async function getPluginCategories() {
        const query = `query Configuration { configuration { plugins } }`;
        const res = await gqlClient(query);
        try {
            const config = res.data.configuration.plugins.advancedPerformerRating || {};
            const phys = ALL_PHYSICAL.filter(c => !config[DISABLE_KEYS[c]]);
            const perf = ALL_PERFORMANCE.filter(c => !config[DISABLE_KEYS[c]]);
            return [...phys, ...perf];
        } catch(e) {
            return [...ALL_PHYSICAL, ...ALL_PERFORMANCE];
        }
    }

    async function getPerformerTags(performerId) {
        const query = `query FindPerformer($id: ID!) { findPerformer(id: $id) { id tags { id name } } }`;
        const res = await gqlClient(query, { id: performerId });
        return res.data.findPerformer.tags;
    }

    async function getTagIdByName(name) {
        const query = `query FindTags($tag_filter: TagFilterType) {
            findTags(tag_filter: $tag_filter) { tags { id name } }
        }`;
        const res = await gqlClient(query, {
            tag_filter: { name: { value: name, modifier: "EQUALS" } }
        });
        const tags = res.data.findTags.tags;
        return tags.length > 0 ? tags[0].id : null;
    }

    async function updatePerformerTag(performerId, allTags, category, newScore) {
        const oldTags = allTags.filter(tag => {
            const match = tag.name.match(CATEGORY_PATTERN);
            return match && match[1].trim() === category.trim();
        });
        let newTagIds = allTags.map(t => t.id).filter(id => !oldTags.find(ot => ot.id === id));
        if (newScore !== null) {
            const newTagName = `${category}: ${newScore}`;
            const newTagId = await getTagIdByName(newTagName);
            if (newTagId) {
                newTagIds.push(newTagId);
            } else {
                alert(`Tag "${newTagName}" not found!\n\nMake sure you have run the "Create Tags" task first.`);
                return false;
            }
        }
        const mutation = `mutation PerformerUpdate($input: PerformerUpdateInput!) { performerUpdate(input: $input) { id } }`;
        await gqlClient(mutation, { input: { id: performerId, tag_ids: newTagIds } });
        return true;
    }

    function injectTrigger(ratingStars, performerId) {
        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'perf-rating-trigger';
        triggerBtn.innerHTML = '<span style="color:#ffc107;">★</span>+';
        triggerBtn.title = "Open Performer Ratings";
        triggerBtn.className = 'adv-rating-btn';
        // Insert immediately after the .rating-stars div
        ratingStars.insertAdjacentElement('afterend', triggerBtn);
        triggerBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation(); openModal(performerId);
        });
    }

    async function openModal(performerId) {
        if (document.querySelector('#perf-rating-modal')) return;
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'perf-rating-modal';
        modalOverlay.className = 'adv-rating-modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'adv-rating-modal-content';
        modalContent.innerHTML = `
            <div class="adv-rating-header"><h3>Performer Ratings</h3><span class="perf-rating-close">&times;</span></div>
            <div class="ratings-list">Loading...</div>
        `;
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        const handleClose = () => { modalOverlay.remove(); window.location.reload(); };
        modalContent.querySelector('.perf-rating-close').addEventListener('click', handleClose);
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) handleClose(); });
        const categories = await getPluginCategories();
        let performerTags = await getPerformerTags(performerId);
        function render() {
            const listContainer = modalContent.querySelector('.ratings-list');
            listContainer.innerHTML = '';
            const currentScores = {};
            performerTags.forEach(tag => {
                const match = tag.name.match(CATEGORY_PATTERN);
                if (match) currentScores[match[1].trim()] = parseInt(match[2], 10);
            });
            const categoryDescriptions = {
                "Face": "Facial attractiveness, eye appeal, lip shape, skin quality, and how good the face looks in close-ups, during oral, and while moaning or orgasming.",
                "Breasts": "Shape, size, firmness, symmetry, nipple appearance, and natural movement/jiggle during sex.",
                "Ass": "Shape, roundness, firmness, tightness, bounce, and visual appeal in doggy, cowgirl, and spanking shots.",
                "Body Overall": "Proportions, waist-to-hip ratio, muscle tone, skin condition, legs, posture, and overall physical presence on camera.",
                "Genitals": "Visual appeal and presentation of the performer's sexual organs when aroused and groomed.",
                "Technique": "Technical ability and proficiency in sex: quality of oral, handjobs, riding rhythm, hip movement, depth control, muscle contractions, kissing, and overall sexual technique.",
                "Energy & Presence": "Visible enthusiasm, stamina, vocalization, authenticity and intensity of pleasure expressions, eye contact, orgasm quality, and how strongly the performer commands attention.",
                "Sluttiness": "Degree of uninhibitedness and sexual eagerness: willingness to embrace rough sex, anal, deepthroat, degradation, and extreme kinks, visible hunger and greed for cock/pussy, active begging or initiating sex, intensity of dirty talk, and overall attitude of shameless sexual availability."
            };
            categories.forEach(cat => {
                const row = document.createElement('div'); row.className = 'rating-row';
                const label = document.createElement('span'); label.className = 'rating-label';
                const labelText = document.createElement('span'); labelText.innerText = cat; label.appendChild(labelText);
                const desc = categoryDescriptions[cat];
                if (desc) {
                    const infoIcon = document.createElement('span'); infoIcon.className = 'rating-info-icon'; infoIcon.innerHTML = 'ⓘ';
                    const tooltip = document.createElement('div'); tooltip.className = 'rating-tooltip'; tooltip.innerText = desc;
                    infoIcon.appendChild(tooltip); label.appendChild(infoIcon);
                }
                const starsDiv = document.createElement('div'); starsDiv.className = 'rating-stars-modal';
                const score = currentScores[cat.trim()] !== undefined ? currentScores[cat.trim()] : null;

                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('span'); star.className = 'rating-star';
                    star.innerHTML = (score !== null && i <= score) ? '★' : '☆';
                    star.addEventListener('mouseenter', () => {
                        starsDiv.querySelectorAll('.rating-star').forEach((s, idx) => {
                            s.classList.toggle('hovered', idx < i);
                        });
                    });
                    star.addEventListener('mouseleave', () => {
                        starsDiv.querySelectorAll('.rating-star').forEach(s => s.classList.remove('hovered'));
                    });
                    star.addEventListener('click', async () => {
                        listContainer.style.opacity = '0.5';
                        if (await updatePerformerTag(performerId, performerTags, cat, i)) {
                            performerTags = await getPerformerTags(performerId); render();
                        }
                        listContainer.style.opacity = '1';
                    });
                    starsDiv.appendChild(star);
                }
                const clearBtn = document.createElement('span'); clearBtn.className = 'rating-clear'; clearBtn.innerHTML = '×';
                clearBtn.title = 'Remove Category Rating';
                clearBtn.addEventListener('click', async () => {
                    listContainer.style.opacity = '0.5';
                    if (await updatePerformerTag(performerId, performerTags, cat, null)) {
                        performerTags = await getPerformerTags(performerId); render();
                    }
                    listContainer.style.opacity = '1';
                });
                starsDiv.appendChild(clearBtn);
                row.appendChild(label); row.appendChild(starsDiv); listContainer.appendChild(row);
            });
        }
        render();
    }
})();
