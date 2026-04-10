<!--
    NearbyInMeaning — the primary exploration section of the word page.

    Shows:
      1. A meaning map with the primary word + its context (labeled dots)
      2. A lens chip row — click an axis to reshape the map into a 1D
         slice along that axis. The "neighborhood" chip returns to 2D.
      3. An editable context chip row: see the current context words, ✕
         to remove, + to add. URL-driven via `useContextWords`.

    The set of axes shown as lens chips is picked by computing the
    extremeness of the primary word on each axis and taking the
    top 6. Axes where all context words sit at similar positions carry
    no signal — they get dropped. Axes with real spread across the
    neighborhood surface. This sidesteps the lexical-artifact problem
    (e.g. `dog → dogmatic`) that shows up when ranking axes for a
    single word in isolation.

    Empty state: when the primary word has no explore data (non-English
    language, on-demand fetch failed), this whole component hides.
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MeaningMap, { type MapDot } from '~/components/shared/MeaningMap.vue';
import AddCompareWord from './AddCompareWord.vue';
import MapFrame from '~/components/shared/MapFrame.vue';
import type { WordData } from '~/composables/useWordData';

/** How many of the primary's nearest neighbors are shown as muted
 *  "extended neighborhood" background dots. The foreground shows the
 *  top ~7 chosen context words; these fill in ranks below that so the
 *  map has spatial weight without being sparse. */
const EXTENDED_BACKGROUND_COUNT = 50;

const props = defineProps<{
    lang: string;
    /** Fully-loaded primary word — basic + explore */
    primary: WordData;
    /** Extra context word data indexed by word — fetched async by the page */
    contextData: Record<string, WordData>;
    /** The active context word list (user-selected or auto-derived from
     *  nearest neighbors). The primary word is NOT in this list. */
    contextWords: string[];
    /** User has started editing the context set — hide the "add" ghost
     *  prompt until they've interacted. */
    isCustom: boolean;
    isFull: boolean;
}>();

const emit = defineEmits<{
    add: [word: string];
    remove: [word: string];
    resetToAuto: [];
}>();

/** Two-axis slice: [axisX, axisY] or null (= neighborhood UMAP view). */
const sliceAxes = ref<[string, string] | null>(null);
const mapUserZoom = ref(1.0);
const mapPanOffset = ref<[number, number]>([0, 0]);

watch(
    () => props.primary.basic?.word,
    () => {
        sliceAxes.value = null;
        showAllAxes.value = false;
        mapUserZoom.value = 1.0;
        mapPanOffset.value = [0, 0];
    }
);

// ── Map entries ──────────────────────────────────────────────────────────
// Three tiers that all share the same polar coordinate system:
//   1. Primary (center, accent color)
//   2. Foreground context words (labeled dots, editable via chips)
//   3. Muted background — "extended neighborhood" ranks below the
//      foreground, rendered smaller and faded. Not clickable via the
//      chip row, but dots navigate on click.
const mapDots = computed<MapDot[]>(() => {
    const dots: MapDot[] = [];
    const p = props.primary;
    if (!p.explore) return dots;

    const primaryProjs = Object.fromEntries(
        p.explore.projections.map((x) => [x.axis, x.normalized])
    );
    dots.push({
        word: p.basic!.word,
        pos2d: p.explore.umap ?? [0.5, 0.5],
        projections: primaryProjs,
        role: 'primary',
    });

    const seen = new Set<string>([p.basic!.word]);

    for (const w of props.contextWords) {
        const cd = props.contextData[w];
        if (!cd?.explore || !cd.basic?.word) continue;
        const projs = Object.fromEntries(
            cd.explore.projections.map((x) => [x.axis, x.normalized])
        );
        dots.push({
            word: cd.basic.word,
            pos2d: cd.explore.umap ?? [0.5, 0.5],
            projections: projs,
            role: 'foreground',
        });
        seen.add(cd.basic.word);
    }

    const backgroundPool = (p.explore.nearest ?? [])
        .filter((n) => !seen.has(n.word))
        .slice(0, EXTENDED_BACKGROUND_COUNT);
    for (const n of backgroundPool) {
        dots.push({
            word: n.word,
            pos2d: n.umap ?? [0.5, 0.5],
            projections: {},
            role: 'muted',
        });
    }

    return dots;
});

// ── Axis lens system ────────────────────────────────────────────────────
// Rank by how EXTREME the primary word is on each axis. All high-quality
// axes (AUC ≥ 0.8, already filtered server-side) are available; the top 6
// are shown by default with an expandable "more" button for the rest.
type ScoredAxis = { name: string; low: string; high: string; extremeness: number };

const allHighQualityAxes = computed<ScoredAxis[]>(() => {
    const axisList = props.primary.explore?.projections ?? [];
    if (axisList.length === 0) return [];
    return axisList
        .map((axis) => ({
            name: axis.axis,
            low: axis.lowAnchor,
            high: axis.highAnchor,
            extremeness: Math.abs(axis.normalized - 0.5),
        }))
        .sort((a, b) => b.extremeness - a.extremeness);
});

const TOP_AXIS_COUNT = 6;
const bestAxes = computed(() => allHighQualityAxes.value.slice(0, TOP_AXIS_COUNT));

const showAllAxes = ref(false);
// Always include the active axis pair in visible set even when collapsed
const visibleAxes = computed<ScoredAxis[]>(() => {
    const base = showAllAxes.value
        ? allHighQualityAxes.value
        : bestAxes.value;
    if (!sliceAxes.value) return base;
    // Ensure both active + partner are visible even if not in top 6
    const baseNames = new Set(base.map((a) => a.name));
    const extras: ScoredAxis[] = [];
    for (const axName of sliceAxes.value) {
        if (!baseNames.has(axName)) {
            const found = allHighQualityAxes.value.find((a) => a.name === axName);
            if (found) extras.push(found);
        }
    }
    return extras.length ? [...base, ...extras] : base;
});
const hasMoreAxes = computed(() => allHighQualityAxes.value.length > TOP_AXIS_COUNT);
const remainingCount = computed(() =>
    Math.max(0, allHighQualityAxes.value.length - TOP_AXIS_COUNT)
);

/** The auto-paired partner axis name (for CSS highlighting). */
const partnerAxisName = computed(() => sliceAxes.value?.[1] ?? null);

// Pass all axes to MeaningMap so the legend can find info for any paired axis
// (the partner may be outside the top 6 visible chips)
const availableAxes = computed(() => {
    const base = bestAxes.value.map((a) => ({ name: a.name, low: a.low, high: a.high }));
    // Ensure the active pair's axes are included even if outside top 6
    if (sliceAxes.value) {
        const baseNames = new Set(base.map((a) => a.name));
        for (const axName of sliceAxes.value) {
            if (!baseNames.has(axName)) {
                const found = allHighQualityAxes.value.find((a) => a.name === axName);
                if (found) base.push({ name: found.name, low: found.low, high: found.high });
            }
        }
    }
    return base;
});

/** When the user clicks one axis, auto-pair with the best complementary
 *  second axis — the one that adds the most additional spread to the
 *  displayed words after accounting for the first axis's contribution.
 *  Same Gram-Schmidt logic as the compass hint selector. */
function selectAxisPair(clickedAxis: string) {
    const entries = mapDots.value;
    if (entries.length < 2) return;

    // Get all projections along the clicked axis
    const axis1Vals = entries.map((e) => e.projections[clickedAxis] ?? 0.5);

    // For each other axis, compute the residual variance after removing
    // the correlation with axis1
    let bestAxis2 = '';
    let bestResidualVar = -1;

    // Search ALL high-quality axes for the best partner, not just the top 6
    for (const candidate of allHighQualityAxes.value) {
        if (candidate.name === clickedAxis) continue;
        const axis2Vals = entries.map((e) => e.projections[candidate.name] ?? 0.5);

        // Compute correlation between axis1 and candidate
        const n = axis1Vals.length;
        const mean1 = axis1Vals.reduce((a, b) => a + b, 0) / n;
        const mean2 = axis2Vals.reduce((a, b) => a + b, 0) / n;
        let cov = 0, var1 = 0;
        for (let i = 0; i < n; i++) {
            const d1 = axis1Vals[i]! - mean1;
            const d2 = axis2Vals[i]! - mean2;
            cov += d1 * d2;
            var1 += d1 * d1;
        }
        // Residual of axis2 after removing axis1's linear contribution
        const beta = var1 > 0 ? cov / var1 : 0;
        let residualVar = 0;
        for (let i = 0; i < n; i++) {
            const residual = (axis2Vals[i]! - mean2) - beta * (axis1Vals[i]! - mean1);
            residualVar += residual * residual;
        }
        residualVar /= n;

        if (residualVar > bestResidualVar) {
            bestResidualVar = residualVar;
            bestAxis2 = candidate.name;
        }
    }

    if (bestAxis2) {
        sliceAxes.value = [clickedAxis, bestAxis2];
    }
}

// ── Interaction ──────────────────────────────────────────────────────────
const showAddInput = ref(false);

function onAdd(word: string) {
    emit('add', word);
    showAddInput.value = false;
}

// When the user removes the last custom word, close the add input too.
watch(
    () => props.isCustom,
    (now) => {
        if (!now) showAddInput.value = false;
    }
);

const primaryUmap = computed<[number, number]>(() =>
    props.primary.explore?.umap ?? [0.5, 0.5]
);
const canShowMap = computed(() => mapDots.value.length >= 1);
</script>

<template>
    <section v-if="canShowMap" class="nearby">
        <div class="section-label">Nearby in Meaning</div>

        <div class="map-wrap">
            <MapFrame
                v-model:user-zoom="mapUserZoom"
                v-model:pan-offset="mapPanOffset"
                :expandable="true"
            >
                <template #default="{ expanded, frameSize }">
                    <MeaningMap
                        :dots="mapDots"
                        mode="absolute"
                        :center-pos="primaryUmap"
                        :available-axes="availableAxes"
                        :slice-axes="sliceAxes"
                        :clickable="true"
                        :lang="lang"
                        :size="expanded ? frameSize : 520"
                        :user-zoom="mapUserZoom"
                        :pan-offset="mapPanOffset"
                    />
                </template>
            </MapFrame>
        </div>

        <!-- View by: neighborhood (primary) -->
        <div v-if="allHighQualityAxes.length" class="lens-section">
            <div class="lens-row-primary">
                <span class="lens-label">view by</span>
                <button
                    type="button"
                    class="lens-chip"
                    :class="{ active: !sliceAxes }"
                    @click="sliceAxes = null"
                >
                    neighborhood
                </button>
            </div>

            <!-- Axis chips (top 6 + expand) with partner highlighting -->
            <div class="lens-row-axes">
                <span class="lens-label">or slice by</span>
                <button
                    v-for="a in visibleAxes"
                    :key="a.name"
                    type="button"
                    class="lens-chip"
                    :class="{
                        active: sliceAxes?.[0] === a.name,
                        partner: partnerAxisName === a.name,
                    }"
                    @click="selectAxisPair(a.name)"
                >
                    {{ a.name }}
                </button>
                <button
                    v-if="hasMoreAxes"
                    type="button"
                    class="lens-more"
                    @click="showAllAxes = !showAllAxes"
                >
                    {{ showAllAxes ? 'Show less' : `+ ${remainingCount} more` }}
                </button>
            </div>
        </div>

        <div class="context-row">
            <span class="context-label">also showing</span>
            <span
                v-for="w in contextWords"
                :key="w"
                class="context-chip"
            >
                {{ w }}
                <button
                    type="button"
                    class="chip-remove"
                    :aria-label="`remove ${w}`"
                    @click="emit('remove', w)"
                >
                    ×
                </button>
            </span>
            <button
                v-if="!isFull && !showAddInput"
                type="button"
                class="context-chip add"
                @click="showAddInput = true"
            >
                + add word
            </button>
            <button
                v-if="isCustom"
                type="button"
                class="context-chip reset"
                @click="emit('resetToAuto')"
            >
                reset
            </button>
        </div>

        <div v-if="showAddInput" class="add-input-wrap">
            <AddCompareWord placeholder="type a word…" @add="onAdd" />
        </div>
    </section>
</template>

<style scoped>
.nearby {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 8px 0;
}

.map-wrap {
    display: flex;
    justify-content: center;
}

/* ── Lens chip row ──────────────────────────────────────────────────── */
.lens-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}
.lens-row-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
.lens-row-axes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 4px;
}
.lens-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-right: 4px;
}
.lens-chip {
    padding: 5px 12px;
    background: transparent;
    border: 1px solid var(--color-rule);
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: lowercase;
    cursor: pointer;
    transition: all 120ms ease;
}
.lens-chip:hover {
    color: var(--color-ink);
    border-color: var(--color-ink);
}
.lens-chip.active {
    background: var(--color-ink);
    color: var(--color-paper);
    border-color: var(--color-ink);
}
.lens-chip.partner {
    background: transparent;
    border-color: var(--color-muted);
    border-style: dashed;
    color: var(--color-muted);
}
.lens-chip.partner:hover {
    border-color: var(--color-ink);
    color: var(--color-ink);
    border-style: solid;
}
.lens-more {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 120ms ease;
}
.lens-more:hover {
    color: var(--color-ink);
}

/* ── Context chip row ───────────────────────────────────────────────── */
.context-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 4px;
}
.context-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-right: 4px;
}
.context-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    border: 1px solid var(--color-rule);
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: 12px;
    font-style: italic;
}
.context-chip.add,
.context-chip.reset {
    color: var(--color-muted);
    cursor: pointer;
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: lowercase;
    padding: 5px 10px;
    transition: all 120ms ease;
}
.context-chip.add:hover,
.context-chip.reset:hover {
    color: var(--color-ink);
    border-color: var(--color-ink);
}
.chip-remove {
    background: transparent;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0 2px;
    font-size: 14px;
    line-height: 1;
    transition: color 120ms ease;
}
.chip-remove:hover {
    color: var(--color-accent);
}

.add-input-wrap {
    display: flex;
    justify-content: center;
}

@media (max-width: 600px) {
    .lens-row-primary,
    .lens-row-axes,
    .context-row {
        font-size: 8px;
    }
}
</style>
