<!--
    MapFrame — shared chrome for meaning maps. Wraps any map content
    (canvas SemanticMap or SVG WordCompareMap) and provides unified
    expand/zoom/pan interaction.

    The inner map renders via a <slot>. MapFrame doesn't care whether
    it's canvas or SVG — it just exposes zoom + pan state as v-model
    props so the inner map can adjust its own rendering.

    Interactions:
      • Expand button → fullscreen overlay, Escape to close
      • +/− buttons → zoom
      • Scroll wheel → zoom
      • Click + drag → pan (pointer events: mouse + touch unified)
      • Pinch-to-zoom → touch two-finger gesture
      • Keyboard: +/− zoom, Escape close, 0 reset
-->

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
    defineProps<{
        /** User's manual zoom factor (stacks on top of any auto-fit zoom
         *  the inner map computes). 1.0 = default. */
        userZoom?: number;
        /** Pan offset in UMAP-space units [dx, dy]. The inner map adds
         *  this to its viewport center before projecting. */
        panOffset?: [number, number];
        /** Show the expand button */
        expandable?: boolean;
        /** Size hint for the frame. The actual rendered size may differ
         *  on expand or responsive resize. */
        width?: number | string;
        height?: number | string;
    }>(),
    {
        userZoom: 1.0,
        panOffset: () => [0, 0] as [number, number],
        expandable: true,
        width: '100%',
        height: 'auto',
    }
);

const emit = defineEmits<{
    'update:userZoom': [zoom: number];
    'update:panOffset': [offset: [number, number]];
}>();

// ── Expand state (FLIP animation) ────────────────────────────────────────
const {
    isExpanded,
    elRef: outerRef,
    toggle: toggleExpand,
    collapse,
} = useFlipExpand();

// ── Zoom ──────────────────────────────────────────────────────────────────
const ZOOM_STEP = 1.25;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 30;

function zoomIn() {
    emit('update:userZoom', Math.min(ZOOM_MAX, props.userZoom * ZOOM_STEP));
}
function zoomOut() {
    emit('update:userZoom', Math.max(ZOOM_MIN, props.userZoom / ZOOM_STEP));
}
function resetView() {
    emit('update:userZoom', 1.0);
    emit('update:panOffset', [0, 0]);
}

function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
}

// ── Pan (pointer events: mouse + touch unified) ──────────────────────────
// panOffset is in SCREEN PIXELS — MapFrame doesn't know about UMAP zoom.
// The inner map converts screen pixels → UMAP shift at render time using
// its own total zoom, so the drag feels 1:1 regardless of zoom level.
const frameRef = ref<HTMLElement | null>(null);
let isPanning = false;
let panStart: [number, number] = [0, 0];
let panStartOffset: [number, number] = [0, 0];

function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isPanning = true;
    panStart = [e.clientX, e.clientY];
    panStartOffset = [...props.panOffset] as [number, number];
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
    if (!isPanning) return;
    const dx = e.clientX - panStart[0];
    const dy = e.clientY - panStart[1];
    emit('update:panOffset', [
        panStartOffset[0] + dx,
        panStartOffset[1] + dy,
    ]);
}

function onPointerUp(_e: PointerEvent) {
    isPanning = false;
}

// ── Keyboard (when frame has focus or is expanded) ───────────────────────
function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isExpanded.value) {
        e.preventDefault();
        collapse();
        return;
    }
    if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
    }
    if (e.key === '-') {
        e.preventDefault();
        zoomOut();
    }
    if (e.key === '0') {
        e.preventDefault();
        resetView();
    }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

const hasCustomView = computed(
    () =>
        props.userZoom !== 1.0 ||
        Math.abs(props.panOffset[0]) > 0.001 ||
        Math.abs(props.panOffset[1]) > 0.001
);

// ── Frame size (for scoped slot) ─────────────────────────────────────────
// When expanded, the inner map should fill the viewport minus padding.
// When collapsed, the parent decides the size. We expose both the expanded
// state and a computed "available size" so the inner map can adapt.
const frameSize = computed(() => {
    if (!isExpanded.value || typeof window === 'undefined') return 520;
    // Match the CSS: top: 60px, left/right/bottom: 16px, padding: 16px
    const availWidth = window.innerWidth - 32 - 32; // left/right margin + padding
    const availHeight = window.innerHeight - 60 - 16 - 32; // top + bottom + padding
    return Math.min(availWidth, availHeight);
});
</script>

<template>
    <div
        ref="frameRef"
        class="map-frame"
        tabindex="0"
    >
        <!-- Backdrop when expanded -->
        <Transition name="backdrop-fade">
            <div
                v-if="isExpanded"
                class="map-expanded-backdrop"
                @click="collapse"
            />
        </Transition>

        <div
            ref="outerRef"
            class="map-outer"
            :class="{ 'map-expanded': isExpanded }"
        >
            <!-- The content wrap has `position: relative` so the controls
                 are positioned relative to the actual map content, not the
                 expanded wrapper (which may be wider than the canvas). -->
            <div
                class="map-content-wrap"
                @wheel.prevent="onWheel"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
            >
                <div class="map-controls">
                    <button
                        v-if="expandable"
                        type="button"
                        class="map-ctrl-btn"
                        :aria-label="isExpanded ? 'Collapse map' : 'Expand map'"
                        @click.stop="toggleExpand"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path v-if="!isExpanded" d="M3 3h7M3 3v7M3 3l7 7M21 21h-7M21 21v-7M21 21l-7-7" />
                            <path v-else d="M10 3v7H3M14 21v-7h7M10 10L3 3M14 14l7 7" />
                        </svg>
                    </button>
                    <button type="button" class="map-ctrl-btn" aria-label="Zoom in" @click.stop="zoomIn">+</button>
                    <button type="button" class="map-ctrl-btn" aria-label="Zoom out" @click.stop="zoomOut">−</button>
                    <button v-if="hasCustomView" type="button" class="map-ctrl-btn" aria-label="Reset view" @click.stop="resetView">⟲</button>
                </div>

                <slot :expanded="isExpanded" :frame-size="frameSize" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.map-frame {
    position: relative;
    outline: none;
    width: 100%;
}
/* Outer wrapper — when expanded, this goes fixed + fills the viewport
   area below the navbar. In normal mode, it centers the inline-block
   content wrap horizontally. */
.map-outer {
    position: relative;
    max-width: 100%;
    text-align: center; /* centers the inline-block .map-content-wrap */
}
/* Content wrap — positions controls relative to the actual map content
   (canvas or SVG), not the expanded wrapper. Handles pointer events for
   pan/zoom. */
/* Invisible wrapper — just a positioning context for the controls
   overlay. No border, no background. The inner map (canvas/SVG)
   handles its own visual appearance. */
.map-content-wrap {
    position: relative;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    display: inline-block;
    max-width: 100%;
}
.map-content-wrap:active {
    cursor: grabbing;
}
.map-controls {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.map-ctrl-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 120ms ease;
    font-size: 16px;
    line-height: 1;
}
.map-ctrl-btn:hover {
    color: var(--color-ink);
    border-color: var(--color-ink);
}

/* Backdrop fade — uses global .backdrop-fade-* from main.css */
</style>
