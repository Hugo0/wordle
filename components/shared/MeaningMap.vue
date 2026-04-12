<!--
    MeaningMap — unified SVG meaning map for both the Semantic Explorer
    game and the Word Explorer page. Replaces the old canvas-based
    SemanticMap.vue and SVG-based WordCompareMap.vue.

    Two projection modes:
      - 'polar': radius = log-rank closeness, angle = PCA direction (game)
      - 'absolute': x,y = UMAP/PCA coordinates (word page)

    All visual features from both old components are here:
      - Dots with labels (foreground + muted background)
      - Target/primary marker
      - Connector lines (primary → foreground)
      - Axis labels for 2-axis slice view
      - Graph-paper grid
      - Click-to-navigate (word page)
      - Bounce-in animation for new dots
      - Wiggle on duplicate guess
      - Highlight ring on hover
      - Win celebration pulse
      - Label overlap avoidance
-->

<script setup lang="ts">
import { computed, ref, watch, nextTick, onUnmounted } from 'vue';
import { wordDetailPath } from '~/utils/wordUrls';
import { projectToCanvas } from '~/utils/mapProjection';

// ── Unified dot shape ─────────────────────────────────────────────────────
export type MapDot = {
    word: string;
    /** 2D position in [0,1]² — PCA or UMAP, depending on the surface */
    pos2d: [number, number];
    /** Per-axis normalized projections (for slice view) */
    projections: Record<string, number>;
    /** Log-rank display value [0,1] — only used in polar mode for radius */
    display?: number;
    /** Visual role */
    role: 'primary' | 'foreground' | 'muted' | 'neighbour';
    /** Color hint — e.g. the game's warmth gradient hex */
    color?: string;
};

export type AxisInfo = { name: string; low: string; high: string };

const props = withDefaults(
    defineProps<{
        dots: MapDot[];
        /** Projection mode: polar (game) or absolute (word page) */
        mode: 'polar' | 'absolute';
        /** 2D position of the target/primary (center of polar projection) */
        centerPos: [number, number];
        /** 2-axis slice view: [axisX, axisY]. Null = neighborhood. */
        sliceAxes?: [string, string] | null;
        /** Axis metadata for labeling slice edges */
        availableAxes?: AxisInfo[];
        /** Dots are clickable links (word page) */
        clickable?: boolean;
        /** Language code for dot links */
        lang?: string;
        /** Canvas edge size in pixels */
        size?: number;
        /** User zoom from MapFrame */
        userZoom?: number;
        /** Pan offset from MapFrame (screen pixels) */
        panOffset?: [number, number];
        /** Show the target '?' marker at center (game) */
        showTarget?: boolean;
        /** Target label (shown after game ends) */
        targetLabel?: string;
        /** Word currently highlighted (hover from leaderboard) */
        highlightedWord?: string | null;
        /** Signal to wiggle a dot (duplicate guess) */
        wiggleSignal?: { word: string; token: number } | null;
        /** Latest guess word — gets bold label */
        latestWord?: string | null;
        /** Best guess word — gets a compass needle pointing toward target */
        compassWord?: string | null;
        /** Signal to pulse the target ring (new best guess) */
        newBestSignal?: { word: string; rank: number; token: number } | null;
    }>(),
    {
        sliceAxes: null,
        availableAxes: () => [],
        clickable: false,
        lang: 'en',
        size: 520,
        userZoom: 1.0,
        panOffset: () => [0, 0] as [number, number],
        showTarget: false,
        targetLabel: '?',
        highlightedWord: null,
        wiggleSignal: null,
        latestWord: null,
        compassWord: null,
        newBestSignal: null,
    }
);

// Track active Web Animations so we can cancel them on unmount
const _activeAnimations = new Set<Animation>();
function trackAnimation(anim: Animation) {
    _activeAnimations.add(anim);
    anim.onfinish = () => _activeAnimations.delete(anim);
}
onUnmounted(() => {
    for (const a of _activeAnimations) a.cancel();
    _activeAnimations.clear();
});

const PAD = 30;
const canvasSize = computed(() => props.size);

// Track actual CSS display width for screen-pixel ↔ viewBox conversion.
// When CSS shrinks the SVG (e.g., max-width: 100% on mobile), panOffset
// (in screen pixels from pointer events) must be scaled to viewBox pixels.
const displayWidth = ref(props.size);
let _resizeObs: ResizeObserver | null = null;
function _initResizeObserver() {
    if (!svgRef.value || _resizeObs) return;
    _resizeObs = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width;
        if (w && w > 0) displayWidth.value = w;
    });
    _resizeObs.observe(svgRef.value);
}
onUnmounted(() => _resizeObs?.disconnect());
const displayScale = computed(() => displayWidth.value / canvasSize.value);

const router = useRouter();

// Hover prefetch: when the user mouses over a clickable dot, start
// fetching that word's data in the background so a click feels instant.
// Tier 1 (basic with cacheOnly — no LLM) fires immediately on enter.
// Tier 2 (full fetchAll) fires after 300ms dwell to avoid prefetching
// on casual mouse-overs.
const { prefetchBasic, fetchAll: prefetchFull } = useWordData();
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
function onDotMouseEnter(word: string) {
    if (!props.clickable) return;
    prefetchBasic(props.lang, word);
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
        prefetchFull(props.lang, word);
        hoverTimer = null;
    }, 300);
}
function onDotMouseLeave() {
    if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
    }
}

function onDotClick(e: MouseEvent, word: string) {
    if (!props.clickable) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    router.push(wordDetailPath(props.lang, word));
}
function dotHref(word: string): string {
    return wordDetailPath(props.lang, word);
}

// ── Auto-zoom (mode-specific) ─────────────────────────────────────────────
const autoZoom = computed(() => {
    if (props.sliceAxes) return 1.0;

    if (props.mode === 'polar') {
        // Polar: no auto-zoom. The map shows the full range and the user
        // can zoom manually. Auto-zoom was jarring — it changed the view
        // on every guess submission.
        return 1.0;
    }

    // Absolute: dynamic zoom so closest foreground dot pair has ~50px separation.
    // Capped at 8x to prevent giant labels during word transitions.
    const MIN_SPACING = 50;
    const fg = props.dots.filter((d) => d.role !== 'muted');
    if (fg.length < 2) return 1.0;
    const pts = fg.map((d) => d.pos2d);
    let minDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            const d = Math.hypot(pts[i]![0] - pts[j]![0], pts[i]![1] - pts[j]![1]);
            if (d > 0 && d < minDist) minDist = d;
        }
    }
    if (minDist < 1e-6 || !isFinite(minDist)) return 1.0;
    const z = MIN_SPACING / (minDist * canvasSize.value);
    return Math.min(8, Math.max(1.0, z));
});

const totalZoom = computed(() => autoZoom.value * props.userZoom);

// ── World-space dot positions (fixed — independent of pan/zoom) ──────────
// Pan/zoom is applied via a single camera <g transform> in the template.
type ScreenDot = MapDot & { x: number; y: number };

const screenDots = computed<ScreenDot[]>(() => {
    const S = canvasSize.value;
    const center = props.centerPos; // fixed target position, no pan offset

    if (props.sliceAxes) {
        // 2-axis scatter — no pan/zoom in slice mode
        const [axisX, axisY] = props.sliceAxes;
        const inner = S - PAD * 2;
        return props.dots
            .filter((d) => d.role !== 'muted')
            .map((d) => ({
                ...d,
                x: PAD + (d.projections[axisX] ?? 0.5) * inner,
                y: PAD + (1 - (d.projections[axisY] ?? 0.5)) * inner,
            }));
    }

    if (props.mode === 'polar') {
        // Polar: radius from display, angle from UMAP direction.
        // Positions are WORLD coordinates — camera handles zoom/pan.
        const cx = S / 2;
        const inner = S - PAD * 2;
        return props.dots.map((d) => {
            if (d.role === 'primary') {
                return { ...d, x: cx, y: cx };
            }
            const display = d.display ?? 0;
            const baseRadius = Math.max(0, Math.min(1, 1 - display)) * 0.45;
            // Direction from target to word in UMAP space
            const dx = d.pos2d[0] - center[0];
            const dy = d.pos2d[1] - center[1];
            const mag = Math.hypot(dx, dy);
            const angle = mag < 1e-9 ? 0 : Math.atan2(dy, dx);
            const nx = 0.5 + baseRadius * Math.cos(angle);
            const ny = 0.5 - baseRadius * Math.sin(angle);
            return { ...d, x: PAD + nx * inner, y: PAD + ny * inner };
        });
    }

    // Absolute: project at zoom=1, no pan — camera handles the rest
    return props.dots.map((d) => {
        const [x, y] = projectToCanvas(d.pos2d, center, S, 1.0, PAD);
        return { ...d, x, y };
    });
});

// ── Camera transform (rigid pan/zoom for all map content) ────────────────
// Converts screen-pixel pan offset to viewBox coordinates, then applies
// scale-around-center + translate. Everything inside the camera <g> moves
// as a unit — dots, grid, target, connectors, compass.
const cameraTransform = computed(() => {
    if (props.sliceAxes) return { tx: 0, ty: 0, scale: 1 };
    const scale = totalZoom.value;
    const ds = displayScale.value || 1;
    const tx = props.panOffset[0] / ds;
    const ty = props.panOffset[1] / ds;
    return { tx, ty, scale };
});

const cameraTransformStr = computed(() => {
    const { tx, ty, scale } = cameraTransform.value;
    if (scale === 1 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01) return '';
    const S = canvasSize.value;
    const cx = S / 2;
    // Scale around canvas center, then translate for pan
    return `translate(${cx + tx}, ${cx + ty}) scale(${scale}) translate(${-cx}, ${-cx})`;
});

// Inverse scale for semantic zoom — keeps dots/labels at constant visual size
const invCameraScale = computed(() => 1 / cameraTransform.value.scale);

// Connectors: lines from primary to foreground dots (not muted)
const connectors = computed(() => {
    if (props.sliceAxes) return [];
    const primary = screenDots.value.find((d) => d.role === 'primary');
    if (!primary) return [];
    return screenDots.value
        .filter((d) => d.role === 'foreground')
        .map((d) => ({ x1: primary.x, y1: primary.y, x2: d.x, y2: d.y }));
});

// Axis info for slice labels
const axisInfoX = computed(() =>
    props.sliceAxes
        ? (props.availableAxes.find((a) => a.name === props.sliceAxes![0]) ?? null)
        : null
);
const axisInfoY = computed(() =>
    props.sliceAxes
        ? (props.availableAxes.find((a) => a.name === props.sliceAxes![1]) ?? null)
        : null
);

// ── Compass needle (game mode: feathered arrow through best guess toward target)
// The arrow passes through the dot: tail feathers behind, arrowhead in front.
// Local coords: (0,0) = dot center, +X = toward target.
// Rendered as two SVG layers so the dot circle sits between them.
const compassNeedle = computed(() => {
    if (!props.compassWord || !props.showTarget) return null;
    const dot = screenDots.value.find((d) => d.word === props.compassWord);
    if (!dot) return null;
    const tx = targetScreenPos.value.x;
    const ty = targetScreenPos.value.y;
    const dx = tx - dot.x;
    const dy = ty - dot.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 20) return null;
    if (dist < 30) return null;
    const r = dotRadius(dot);
    const arm = 16;
    return {
        angle: Math.atan2(dy, dx) * (180 / Math.PI),
        pivotX: dot.x,
        pivotY: dot.y,
        backEnd: -(r + arm),
        frontStart: r + 2,
        frontEnd: r + arm,
    };
});

// When the needle tail points upward it overlaps the word label (which sits
// above the dot at y=-12). Flip the label below the dot in that case.
// In SVG coords Y increases downward, so angle 10°–170° means target is
// below → tail goes up → conflict with label above.
const compassLabelBelow = computed(() => {
    if (!compassNeedle.value) return false;
    const a = compassNeedle.value.angle;
    return a > 10 && a < 170;
});

// ── Label overlap avoidance ──────────────────────────────────────────────
// SVG has no measureText, so we approximate label bounds using character
// count × average char width. Greedy pass: for each dot in priority order,
// if its label rect overlaps any already-placed label, try flipping it
// below the dot. If still overlapping, hide the label (muted dots only).
const CHAR_W = 6.5; // approximate px per char at 11px font
const LABEL_H = 14; // approximate label height

type LabelPlacement = { y: number; visible: boolean };
const labelPlacements = computed<Map<string, LabelPlacement>>(() => {
    const placed: { x: number; y: number; w: number; h: number; word: string }[] = [];
    const result = new Map<string, LabelPlacement>();

    // Labels are counter-scaled (constant visual size), so their world-space
    // footprint depends on the camera zoom. Scale label dimensions accordingly.
    const labelScale = invCameraScale.value;
    const charW = CHAR_W * labelScale;
    const labelH = LABEL_H * labelScale;

    // Priority: primary first, then foreground, then neighbour, then muted
    const order = ['primary', 'foreground', 'neighbour', 'muted'];
    const sorted = [...screenDots.value].sort(
        (a, b) => order.indexOf(a.role) - order.indexOf(b.role)
    );

    for (const d of sorted) {
        const defaultY = (d.role === 'muted' || d.role === 'neighbour' ? -6 : -12) * labelScale;
        const compassFlip = d.word === props.compassWord && compassLabelBelow.value;
        const preferredY = compassFlip ? 18 * labelScale : defaultY;
        const altY = compassFlip ? defaultY : defaultY < 0 ? 18 * labelScale : -12 * labelScale;

        const w = d.word.length * charW;

        function makeRect(yOff: number) {
            return { x: d.x - w / 2, y: d.y + yOff - labelH + 2, w, h: labelH, word: d.word };
        }
        function overlaps(r: (typeof placed)[0]) {
            return placed.some(
                (p) => r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y
            );
        }

        const r1 = makeRect(preferredY);
        if (!overlaps(r1)) {
            placed.push(r1);
            result.set(d.word, { y: preferredY, visible: true });
        } else {
            const r2 = makeRect(altY);
            if (!overlaps(r2)) {
                placed.push(r2);
                result.set(d.word, { y: altY, visible: true });
            } else if (d.role === 'muted' || d.role === 'neighbour') {
                result.set(d.word, { y: preferredY, visible: false });
            } else {
                // Foreground/primary: always show, accept overlap
                placed.push(r1);
                result.set(d.word, { y: preferredY, visible: true });
            }
        }
    }
    return result;
});

function dotLabelY(d: ScreenDot): number {
    return labelPlacements.value.get(d.word)?.y ?? -12;
}

function dotLabelVisible(d: ScreenDot): boolean {
    return labelPlacements.value.get(d.word)?.visible ?? true;
}

// ── Wiggle animation (duplicate guess) ────────────────────────────────────
const wigglingWord = ref<string | null>(null);
watch(
    () => props.wiggleSignal?.token,
    () => {
        if (!props.wiggleSignal) return;
        wigglingWord.value = props.wiggleSignal.word;
        setTimeout(() => (wigglingWord.value = null), 500);
    }
);

// ── FLIP + bounce-in animation for dots ──────────────────────────────────
// When the dot set changes (new word, new neighbors), we animate:
//   - Shared dots (exist in both old and new): FLIP from old → new position
//   - New dots: bounce-in from scale 0
//   - Departed dots: handled by CSS (opacity fade out, not tracked here)
//
// SVG elements don't reliably support transform-box/transform-origin for
// CSS keyframes, so we use the Web Animations API for both FLIP and bounce.
const knownWords = ref(new Set<string>());
const svgRef = ref<SVGSVGElement | null>(null);
onMounted(() => _initResizeObserver());

/** Snapshot of current dot positions before the data changes — used for
 *  FLIP delta computation after Vue re-renders with new positions. */
let prevPositions = new Map<string, { x: number; y: number }>();

// Capture positions BEFORE the computed reacts to new props
watch(
    () => props.dots,
    () => {
        // Snapshot current screen positions from the DOM
        const svg = svgRef.value;
        prevPositions = new Map();
        if (!svg) return;
        for (const d of screenDots.value) {
            prevPositions.set(d.word, { x: d.x, y: d.y });
        }
    },
    { flush: 'pre' } // runs BEFORE Vue updates the DOM
);

// After Vue re-renders with new positions, animate
watch(
    () => props.dots.map((d) => d.word).join(','),
    () => {
        const newWords: string[] = [];
        const sharedWords: string[] = [];
        for (const d of props.dots) {
            if (!knownWords.value.has(d.word)) {
                newWords.push(d.word);
                knownWords.value.add(d.word);
            } else if (prevPositions.has(d.word)) {
                sharedWords.push(d.word);
            }
        }
        // Clean up departed words from knownWords
        const currentSet = new Set(props.dots.map((d) => d.word));
        for (const w of knownWords.value) {
            if (!currentSet.has(w)) knownWords.value.delete(w);
        }

        nextTick(() => {
            const svg = svgRef.value;
            if (!svg) return;

            // FLIP shared dots: animate from old position to new
            for (const word of sharedWords) {
                const el = svg.querySelector(
                    `[data-word="${CSS.escape(word)}"]`
                ) as SVGElement | null;
                if (!el) continue;
                const prev = prevPositions.get(word);
                const curr = screenDots.value.find((d) => d.word === word);
                if (!prev || !curr) continue;
                const dx = prev.x - curr.x;
                const dy = prev.y - curr.y;
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue; // no movement
                const newTx = `${curr.x}px`;
                const newTy = `${curr.y}px`;
                trackAnimation(
                    el.animate(
                        [
                            {
                                transform: `translate(${curr.x + dx}px, ${curr.y + dy}px)`,
                            },
                            { transform: `translate(${newTx}, ${newTy})` },
                        ],
                        {
                            duration: 500,
                            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        }
                    )
                );
            }

            // Bounce-in new dots — SKIP for muted (background) dots.
            // Muted dots have CSS opacity: 0.35 + fill: var(--color-muted),
            // but the Web Animation overrides those during playback, causing
            // them to flash at full opacity with --color-ink fill, then snap
            // to grey when the animation ends. Better to let them appear
            // instantly at their correct muted state.
            const mutedWords = new Set(
                props.dots.filter((d) => d.role === 'muted').map((d) => d.word)
            );
            for (const word of newWords) {
                if (mutedWords.has(word)) continue; // skip bounce for background dots
                const el = svg.querySelector(
                    `[data-word="${CSS.escape(word)}"]`
                ) as SVGElement | null;
                if (!el) continue;
                const tx = el.style.getPropertyValue('--dx');
                const ty = el.style.getPropertyValue('--dy');
                if (!tx || !ty) continue;
                trackAnimation(
                    el.animate(
                        [
                            {
                                transform: `translate(${tx}, ${ty}) scale(0)`,
                                opacity: 0,
                            },
                            {
                                transform: `translate(${tx}, ${ty}) scale(1.2)`,
                                opacity: 1,
                                offset: 0.6,
                            },
                            {
                                transform: `translate(${tx}, ${ty}) scale(1)`,
                                opacity: 1,
                            },
                        ],
                        {
                            duration: 600,
                            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        }
                    )
                );
            }
        });
    },
    { immediate: true }
);

// ── Compass needle grow-in + settle animation ───────────────────────────
// When the compass word changes (new best guess), the needle remounts
// (via :key). After Vue renders it, we run a grow-in (scale 0→1) with
// an oscillating rotation settle, like a compass finding north.
watch(
    () => props.compassWord,
    () => {
        if (!props.compassWord) return;
        nextTick(() => {
            const svg = svgRef.value;
            if (!svg) return;
            const el = svg.querySelector('[data-compass-needle]') as SVGElement | null;
            if (!el) return;
            const base = el.style.transform || '';
            trackAnimation(
                el.animate(
                    [
                        { transform: `${base} scale(0)`, opacity: 0 },
                        {
                            transform: `${base} scale(1.1) rotate(-20deg)`,
                            opacity: 0.8,
                            offset: 0.2,
                        },
                        { transform: `${base} scale(1) rotate(10deg)`, offset: 0.4 },
                        { transform: `${base} rotate(-5deg)`, offset: 0.6 },
                        { transform: `${base} rotate(2deg)`, offset: 0.8 },
                        { transform: base, opacity: 1 },
                    ],
                    { duration: 1400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' }
                )
            );
        });
    },
    { immediate: true }
);

// ── New-best celebration pulse ──────────────────────────────────────────
// When the player beats their best rank, pulse an expanding green ring
// outward from the target marker.
watch(
    () => props.newBestSignal?.token,
    () => {
        if (!props.newBestSignal || !props.showTarget) return;
        nextTick(() => {
            const svg = svgRef.value;
            if (!svg) return;
            const ring = svg.querySelector('.target-ring') as SVGCircleElement | null;
            if (!ring) return;
            // Create a temporary circle for the pulse (don't disturb the real ring)
            const pulse = ring.cloneNode() as SVGCircleElement;
            pulse.classList.add('celebration-pulse');
            ring.parentElement!.appendChild(pulse);
            const anim = pulse.animate(
                [
                    { r: 8, opacity: 0.8, strokeWidth: '3px', stroke: 'var(--color-correct)' },
                    { r: 40, opacity: 0, strokeWidth: '1px', stroke: 'var(--color-correct)' },
                ],
                { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
            );
            const cleanup = () => {
                pulse.remove();
                _activeAnimations.delete(anim);
            };
            anim.onfinish = cleanup;
            // Safety: remove clone even if animation is cancelled
            anim.oncancel = cleanup;
            _activeAnimations.add(anim);
        });
    }
);

// ── Dot radius ────────────────────────────────────────────────────────────
function dotRadius(d: ScreenDot): number {
    if (d.role === 'muted' || d.role === 'neighbour') return 3;
    if (d.role === 'primary') return 8;
    return 6;
}

// ── Grid lines (world coordinates) ──────────────────────────────────────
// Grid in UMAP [0,1]² space, projected at zoom=1 to world coordinates.
// The camera <g> handles zoom/pan. We generate a generous set of lines
// extending beyond [0,1] so the grid fills the viewport when panned/zoomed.
const GRID_STEP = 0.05;

const gridLines = computed<Array<{ x1: number; y1: number; x2: number; y2: number }>>(() => {
    const S = canvasSize.value;
    const center = props.centerPos;
    const inner = S - PAD * 2;

    function toWorld(ux: number, uy: number): [number, number] {
        const dx = ux - center[0];
        const dy = uy - center[1];
        return [PAD + inner * (0.5 + dx), PAD + inner * (0.5 - dy)];
    }

    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    // Extend well beyond [0,1] to cover max zoom-out (0.2x) + panning.
    // At zoom 0.2, visible range is ±2.5 from center. With pan this needs more.
    const lo = -3;
    const hi = 4;

    for (let u = Math.floor(lo / GRID_STEP) * GRID_STEP; u <= hi; u += GRID_STEP) {
        const [x1, y1] = toWorld(u, lo);
        const [x2, y2] = toWorld(u, hi);
        lines.push({ x1, y1, x2, y2 });
    }
    for (let v = Math.floor(lo / GRID_STEP) * GRID_STEP; v <= hi; v += GRID_STEP) {
        const [x1, y1] = toWorld(lo, v);
        const [x2, y2] = toWorld(hi, v);
        lines.push({ x1, y1, x2, y2 });
    }
    return lines;
});

// ── Target position (respects pan) ────────────────────────────────────────
// Target position in WORLD coordinates (camera handles pan/zoom)
const targetScreenPos = computed(() => {
    const S = canvasSize.value;
    // In both polar and absolute modes, target is at canvas center in world space
    return { x: S / 2, y: S / 2 };
});
</script>

<template>
    <section class="meaning-map">
        <div class="canvas-wrap">
            <svg
                ref="svgRef"
                :viewBox="`0 0 ${canvasSize} ${canvasSize}`"
                class="plot"
            >
                <!-- Camera group: rigid pan/zoom transform for all map content.
                     Dots, grid, target, connectors all move as a unit. -->
                <g
                    :transform="cameraTransformStr"
                    :style="{ '--camera-scale': cameraTransform.scale }"
                >
                    <!-- Grid lines (world coordinates) -->
                    <line
                        v-for="(g, i) in gridLines"
                        :key="'grid:' + i"
                        :x1="g.x1"
                        :y1="g.y1"
                        :x2="g.x2"
                        :y2="g.y2"
                        class="grid-line"
                        vector-effect="non-scaling-stroke"
                    />

                    <!-- 2-axis slice labels — inside camera for now (slice has identity transform) -->
                    <template v-if="sliceAxes && axisInfoX && axisInfoY">
                        <!-- X-axis: left (low) and right (high) -->
                        <text
                            :x="PAD + 4"
                            :y="canvasSize / 2"
                            text-anchor="start"
                            dominant-baseline="middle"
                            class="axis-label"
                        >
                            {{ axisInfoX.low }}
                        </text>
                        <text
                            :x="canvasSize - PAD - 4"
                            :y="canvasSize / 2"
                            text-anchor="end"
                            dominant-baseline="middle"
                            class="axis-label"
                        >
                            {{ axisInfoX.high }}
                        </text>
                        <!-- Y-axis: bottom (low) and top (high) -->
                        <text
                            :x="canvasSize / 2"
                            :y="canvasSize - PAD + 16"
                            text-anchor="middle"
                            class="axis-label"
                        >
                            {{ axisInfoY.low }}
                        </text>
                        <text
                            :x="canvasSize / 2"
                            :y="PAD - 6"
                            text-anchor="middle"
                            class="axis-label"
                        >
                            {{ axisInfoY.high }}
                        </text>
                    </template>

                    <!-- Connectors -->
                    <line
                        v-for="(c, i) in connectors"
                        :key="'c:' + i"
                        :x1="c.x1"
                        :y1="c.y1"
                        :x2="c.x2"
                        :y2="c.y2"
                        class="connector"
                        vector-effect="non-scaling-stroke"
                    />

                    <!-- Compass needle: arrow from best guess toward target -->
                    <!-- Compass needle TAIL: feathers + back shaft, rendered
                     BEFORE dots so the dot circle covers the shaft center. -->
                    <g
                        v-if="compassNeedle"
                        :key="'needle-tail:' + compassWord"
                        class="needle-anchor"
                        :style="{
                            transform: `translate(${compassNeedle.pivotX}px, ${compassNeedle.pivotY}px)`,
                        }"
                    >
                        <g
                            class="compass-needle"
                            data-compass-needle
                            :style="{ transform: `rotate(${compassNeedle.angle}deg)` }"
                        >
                            <!-- Back shaft -->
                            <line
                                :x1="compassNeedle.backEnd"
                                y1="0"
                                :x2="compassNeedle.frontStart"
                                y2="0"
                                class="needle-shaft"
                            />
                            <!-- Fletching: 3 crossed feather marks near tail tip -->
                            <template v-for="i in 3" :key="'f' + i">
                                <line
                                    :x1="compassNeedle.backEnd + (i - 1) * 3 + 2"
                                    y1="0"
                                    :x2="compassNeedle.backEnd + (i - 1) * 3 - 1"
                                    :y2="-3.5"
                                    class="needle-feather"
                                />
                                <line
                                    :x1="compassNeedle.backEnd + (i - 1) * 3 + 2"
                                    y1="0"
                                    :x2="compassNeedle.backEnd + (i - 1) * 3 - 1"
                                    :y2="3.5"
                                    class="needle-feather"
                                />
                            </template>
                        </g>
                    </g>

                    <!-- Target marker (game mode) — position respects pan -->
                    <g
                        v-if="showTarget"
                        class="target-marker"
                        :style="{
                            transform: `translate(${targetScreenPos.x}px, ${targetScreenPos.y}px) scale(${invCameraScale})`,
                        }"
                    >
                        <circle r="8" class="target-ring" />
                        <text y="-14" text-anchor="middle" class="target-label">
                            {{ targetLabel }}
                        </text>
                    </g>

                    <!-- Dots — <a> when clickable (word page), <g> otherwise (game) -->
                    <component
                        :is="clickable ? 'a' : 'g'"
                        v-for="d in screenDots"
                        :key="d.word"
                        :href="clickable ? dotHref(d.word) : undefined"
                        :data-word="d.word"
                        :class="[
                            'map-dot',
                            d.role,
                            {
                                highlighted: d.word === highlightedWord,
                                wiggling: d.word === wigglingWord,
                                latest: d.word === latestWord,
                            },
                        ]"
                        :style="{
                            '--dx': d.x + 'px',
                            '--dy': d.y + 'px',
                            transform: `translate(${d.x}px, ${d.y}px) scale(${invCameraScale})`,
                        }"
                        @click="clickable ? onDotClick($event, d.word) : undefined"
                        @mouseenter="clickable ? onDotMouseEnter(d.word) : undefined"
                        @mouseleave="clickable ? onDotMouseLeave() : undefined"
                    >
                        <circle
                            :r="dotRadius(d)"
                            class="dot-circle"
                            :style="d.color ? { fill: d.color } : {}"
                        />
                        <text
                            v-if="dotLabelVisible(d)"
                            :y="dotLabelY(d)"
                            text-anchor="middle"
                            class="dot-text"
                        >
                            {{ d.word }}
                        </text>
                    </component>

                    <!-- Compass needle FRONT: shaft + arrowhead, rendered
                     AFTER dots so it draws on top of the dot circle. -->
                    <g
                        v-if="compassNeedle"
                        :key="'needle-front:' + compassWord"
                        class="needle-anchor"
                        :style="{
                            transform: `translate(${compassNeedle.pivotX}px, ${compassNeedle.pivotY}px)`,
                        }"
                    >
                        <g
                            class="compass-needle"
                            :style="{ transform: `rotate(${compassNeedle.angle}deg)` }"
                        >
                            <!-- Front shaft (past the dot) -->
                            <line
                                :x1="compassNeedle.frontStart"
                                y1="0"
                                :x2="compassNeedle.frontEnd - 4"
                                y2="0"
                                class="needle-shaft"
                            />
                            <!-- Arrowhead (filled triangle) -->
                            <polygon
                                :points="`${compassNeedle.frontEnd - 5},-4 ${compassNeedle.frontEnd + 4},0 ${compassNeedle.frontEnd - 5},4`"
                                class="needle-head"
                            />
                        </g>
                    </g>
                </g>
                <!-- /camera group -->
            </svg>
        </div>
    </section>
</template>

<style scoped>
.meaning-map {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.canvas-wrap {
    /* No inline styles — CSS controls display size. viewBox handles coordinates.
       Default 520px, shrinks via max-width from parent constraints. */
    width: 520px;
    aspect-ratio: 1;
    max-width: 100%;
}
/* When expanded, fill the overlay (square, fits in viewport) */
:global(.map-expanded) .canvas-wrap {
    width: min(85dvh, 90dvw);
    max-width: min(85dvh, 90dvw);
}
.grid-line {
    stroke: var(--color-rule);
    stroke-width: 0.5;
    opacity: 0.4;
}
.plot {
    display: block;
    width: 100%;
    height: auto;
}


/* ── Axis labels (slice mode) — cardinal positions ────────────────── */
.axis-label {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 11px;
    fill: var(--color-muted);
}

/* ── Connectors ──────────────────────────────────────────────────── */
.connector {
    stroke: var(--color-accent);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.4;
}

/* ── Compass needle (best guess → target) ───────────────────────── */
/* Needle anchors transition in sync with dots on zoom/pan */
.needle-anchor {
    transition: transform 550ms cubic-bezier(0.22, 1, 0.36, 1);
}
.compass-needle {
    pointer-events: none;
}
.needle-shaft {
    stroke: var(--color-accent);
    stroke-width: 1.5;
    stroke-linecap: round;
    opacity: 0.8;
}
.needle-head {
    fill: var(--color-accent);
    opacity: 0.8;
}
.needle-feather {
    stroke: var(--color-accent);
    stroke-width: 1.8;
    stroke-linecap: round;
    opacity: 0.7;
}

/* ── Target marker (game) ────────────────────────────────────────── */
.target-ring {
    fill: none;
    stroke: var(--color-accent);
    stroke-width: 1.5;
}
.target-label {
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    fill: var(--color-accent);
    paint-order: stroke;
    stroke: var(--color-paper);
    stroke-width: 3;
}

/* ── Celebration pulse (new best guess) ──────────────────────────── */
.celebration-pulse {
    fill: none;
    pointer-events: none;
}

/* ── Dots ────────────────────────────────────────────────────────── */
.map-dot {
    transition:
        transform 550ms cubic-bezier(0.22, 1, 0.36, 1),
        opacity 300ms ease;
    cursor: default;
}
a.map-dot {
    cursor: pointer;
}
a.map-dot:hover {
    opacity: 0.7;
}
a.map-dot:hover .dot-circle {
    fill: var(--color-accent);
}

.dot-circle {
    fill: var(--color-ink);
    stroke: var(--color-paper);
    stroke-width: 2;
}
.dot-text {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--color-ink);
    paint-order: stroke;
    stroke: var(--color-paper);
    stroke-width: 3;
}

/* Primary dot */
.map-dot.primary .dot-circle {
    fill: var(--color-accent);
}
.map-dot.primary .dot-text {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    fill: var(--color-accent);
}

/* Foreground (non-primary, non-muted) */
.map-dot.foreground .dot-text {
    font-size: 12px;
}
.map-dot.foreground.latest .dot-text {
    font-weight: 700;
}

/* Muted background */
.map-dot.muted {
    opacity: 0.35;
    pointer-events: auto;
}
.map-dot.muted:hover {
    opacity: 0.9;
}
.map-dot.muted .dot-circle {
    fill: var(--color-muted);
    stroke-width: 1.5;
}
.map-dot.muted .dot-text {
    font-size: 10px;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 400;
    stroke-width: 2;
}

/* Neighbour dots (post-game reveal) */
.map-dot.neighbour .dot-circle {
    fill: var(--color-muted);
    stroke-width: 1.5;
}
.map-dot.neighbour .dot-text {
    font-size: 10px;
    font-style: italic;
}

/* Highlight ring (leaderboard hover) — pulsating via CSS animation */
.map-dot.highlighted .dot-circle {
    stroke: var(--color-ink);
    stroke-width: 3;
    animation: highlight-pulse 1.2s ease-in-out infinite;
}
@keyframes highlight-pulse {
    0%,
    100% {
        stroke-opacity: 0.5;
    }
    50% {
        stroke-opacity: 1;
    }
}

/* Wiggle animation (duplicate guess) */
.map-dot.wiggling {
    animation: dot-wiggle 400ms ease;
}
@keyframes dot-wiggle {
    0% {
        translate: 0;
    }
    25% {
        translate: 5px 0;
    }
    75% {
        translate: -5px 0;
    }
    100% {
        translate: 0;
    }
}

/* Bounce-in is handled by the Web Animations API (see script).
   SVG elements don't reliably support transform-box/transform-origin,
   so CSS @keyframes with scale animate from the SVG origin (top-left).
   The JS approach composes translate + scale per-element. */

/* Target marker also transitions with pan */
.target-marker {
    transition: transform 550ms cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

<!-- Unscoped: dark mode grid opacity. Cannot use :global(.dark) as a
     parent prefix in <style scoped> — Vue's compiler emits a bare
     `.dark { opacity: 0.15 }` rule that blankets the entire page. -->
<style>
.dark .grid-line {
    opacity: 0.2;
}
</style>
