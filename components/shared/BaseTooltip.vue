<!--
    BaseTooltip — editorial tooltip with auto-positioning.

    Shows on hover (desktop) and tap (mobile). Positions above or below
    based on viewport space. Constrained to screen width on mobile.
-->

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
    text?: string;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const visible = ref(false);
const position = ref<'above' | 'below'>('above');

function updatePosition() {
    if (!triggerRef.value) return;
    const rect = triggerRef.value.getBoundingClientRect();
    position.value = rect.top < 160 ? 'below' : 'above';

    // Constrain horizontally to viewport on mobile
    if (tooltipRef.value) {
        const tip = tooltipRef.value;
        const tipRect = tip.getBoundingClientRect();
        if (tipRect.right > window.innerWidth - 8) {
            tip.style.left = 'auto';
            tip.style.right = `-${rect.right - window.innerWidth + 8}px`;
            tip.style.transform = 'none';
        } else if (tipRect.left < 8) {
            tip.style.left = `-${rect.left - 8}px`;
            tip.style.transform = 'none';
        }
    }
}

function show() {
    visible.value = true;
    requestAnimationFrame(() => updatePosition());
}

function hide() {
    visible.value = false;
    if (tooltipRef.value) {
        tooltipRef.value.style.left = '';
        tooltipRef.value.style.right = '';
        tooltipRef.value.style.transform = '';
    }
}

function toggle(e: Event) {
    e.stopPropagation();
    visible.value ? hide() : show();
}

function onDocumentClick(e: MouseEvent) {
    if (
        !triggerRef.value?.contains(e.target as Node) &&
        !tooltipRef.value?.contains(e.target as Node)
    ) {
        hide();
    }
}

onMounted(() => document.addEventListener('click', onDocumentClick, true));
onUnmounted(() => document.removeEventListener('click', onDocumentClick, true));
</script>

<template>
    <span
        ref="triggerRef"
        class="tooltip-trigger"
        @mouseenter="show"
        @mouseleave="hide"
        @click="toggle"
    >
        <slot />
        <Transition name="tt">
            <span
                v-if="visible && (text || $slots.content)"
                ref="tooltipRef"
                class="tooltip-box"
                :class="position"
                role="tooltip"
            >
                <span class="tooltip-caret" />
                <slot name="content">
                    <span>{{ text }}</span>
                </slot>
            </span>
        </Transition>
    </span>
</template>

<style scoped>
.tooltip-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: help;
}

.tooltip-box {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    max-width: min(280px, calc(100vw - 24px));
    width: max-content;
    padding: 10px 14px;
    /* Inverted: ink bg, paper text — high contrast in both modes */
    background: var(--color-ink);
    color: var(--color-paper);
    font-family: var(--font-body);
    font-size: 12px;
    line-height: 1.55;
    letter-spacing: 0;
    text-transform: none;
    text-align: left;
    border: none;
    z-index: 200;
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.tooltip-box.above { bottom: calc(100% + 8px); }
.tooltip-box.below { top: calc(100% + 8px); }

.tooltip-caret {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
}
.tooltip-box.above .tooltip-caret {
    bottom: -5px;
    border-top: 5px solid var(--color-ink);
}
.tooltip-box.below .tooltip-caret {
    top: -5px;
    border-bottom: 5px solid var(--color-ink);
}

.tt-enter-active,
.tt-leave-active {
    transition: opacity 120ms ease, transform 120ms ease;
}
.tt-enter-from, .tt-leave-to { opacity: 0; }
.tooltip-box.above.tt-enter-from,
.tooltip-box.above.tt-leave-to { transform: translateX(-50%) translateY(4px); }
.tooltip-box.below.tt-enter-from,
.tooltip-box.below.tt-leave-to { transform: translateX(-50%) translateY(-4px); }
</style>
