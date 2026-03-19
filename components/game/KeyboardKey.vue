<template>
    <button
        ref="buttonRef"
        class="flex-1 rounded uppercase text-sm font-bold p-1 sm:p-2 h-14 key relative select-none"
        :class="[state, { 'has-hint': hint, 'hint-above': hintAbove }]"
        :data-char="char"
        :aria-label="char === '⇨' ? 'Enter' : char === '⌫' ? 'Backspace' : keyAriaLabel"
        @click="handleClick"
        @touchstart.passive="handleTouchStart"
        @touchmove.passive="handleTouchMove"
        @touchend.prevent="handleTouchEnd"
        @touchcancel="handleTouchCancel"
        @mousedown="handleMouseDown"
        @contextmenu="variants?.length ? $event.preventDefault() : undefined"
    >
        <span v-if="hintAbove && hint" class="key-hint">{{ hint }}</span>
        <span class="key-main">{{ char }}</span>
        <span v-if="!hintAbove && hint" class="key-hint">{{ hint }}</span>

        <!-- Diacritic popup (iOS-style) — only mount Teleport for keys with variants -->
        <Teleport v-if="variants?.length" to="body">
            <div
                v-if="popupVisible"
                class="diacritic-popup"
                :style="popupStyle"
            >
                <div class="diacritic-popup-inner">
                    <div
                        v-for="(variant, i) in popupVariants"
                        :key="variant"
                        class="diacritic-option"
                        :class="{ 'diacritic-active': i === activeVariantIdx }"
                    >
                        {{ variant }}
                    </div>
                </div>
                <div class="diacritic-stem" :style="stemStyle" />
            </div>
        </Teleport>
    </button>
</template>

<script setup lang="ts">
import { useHaptics } from '~/composables/useHaptics';

const props = defineProps<{
    char: string;
    state: string;
    hint?: string;
    hintAbove?: boolean;
    variants?: string[];
}>();

const emit = defineEmits<{ press: [key: string] }>();

const buttonRef = ref<HTMLButtonElement | null>(null);
const { haptic } = useHaptics();

// Screen reader label includes key state (correct/semicorrect/incorrect)
const keyAriaLabel = computed(() => {
    const stateLabel = props.state.includes('key-correct')
        ? ', correct'
        : props.state.includes('key-semicorrect')
          ? ', present'
          : props.state.includes('key-incorrect')
            ? ', absent'
            : '';
    const variantHint = props.variants?.length ? `, hold for ${props.variants.join(' ')}` : '';
    return `${props.char}${stateLabel}${variantHint}`;
});

const LONG_PRESS_MS = 300;
const OPTION_WIDTH = 40; // px — must match .diacritic-option width in CSS

// --- Popup state ---
const popupVisible = ref(false);
const popupVariants = ref<string[]>([]);
const activeVariantIdx = ref(0);
const popupStyle = ref<Record<string, string>>({});
const stemStyle = ref<Record<string, string>>({});

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let touchStartX = 0;
let touchStartY = 0;
let touchActive = false;
let popupLeftPx = 0; // numeric left position, avoids parseFloat round-trip
let clickSuppressed = false;

// Store mouse listener refs for cleanup on unmount
let activeMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let activeMouseUpHandler: (() => void) | null = null;

onBeforeUnmount(() => {
    cancelLongPress();
    cleanupMouseListeners();
    hidePopup();
});

function cleanupMouseListeners() {
    if (activeMouseMoveHandler) {
        window.removeEventListener('mousemove', activeMouseMoveHandler);
        activeMouseMoveHandler = null;
    }
    if (activeMouseUpHandler) {
        window.removeEventListener('mouseup', activeMouseUpHandler);
        activeMouseUpHandler = null;
    }
}

function handleClick() {
    if (clickSuppressed) {
        clickSuppressed = false;
        return;
    }
    if (!popupVisible.value) {
        emit('press', props.char);
    }
}

// --- Touch handlers (mobile) ---

function handleTouchStart(e: TouchEvent) {
    if (!props.variants?.length) return;

    const touch = e.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchActive = true;

    longPressTimer = setTimeout(() => {
        if (!touchActive) return;
        showPopup();
    }, LONG_PRESS_MS);
}

function handleTouchMove(e: TouchEvent) {
    if (!props.variants?.length) return;

    const touch = e.touches[0];
    if (!touch) return;

    if (!popupVisible.value) {
        const dx = Math.abs(touch.clientX - touchStartX);
        const dy = Math.abs(touch.clientY - touchStartY);
        if (dx > 10 || dy > 10) {
            cancelLongPress();
        }
        return;
    }

    updateActiveVariant(touch.clientX);
}

function handleTouchEnd() {
    if (!props.variants?.length) {
        touchActive = false;
        return;
    }

    cancelLongPress();
    touchActive = false;

    if (popupVisible.value) {
        selectAndDismiss();
    }
}

function handleTouchCancel() {
    cancelLongPress();
    touchActive = false;
    hidePopup();
}

// --- Mouse handlers (desktop long-press on virtual keyboard) ---

function handleMouseDown(e: MouseEvent) {
    if (!props.variants?.length) return;
    if (e.button !== 0) return;
    if ('ontouchstart' in window) return;

    touchStartX = e.clientX;
    touchActive = true;

    activeMouseMoveHandler = (me: MouseEvent) => {
        if (popupVisible.value) {
            updateActiveVariant(me.clientX);
        }
    };

    activeMouseUpHandler = () => {
        cleanupMouseListeners();
        cancelLongPress();
        touchActive = false;

        if (popupVisible.value) {
            selectAndDismiss();
        }
    };

    window.addEventListener('mousemove', activeMouseMoveHandler);
    window.addEventListener('mouseup', activeMouseUpHandler);

    longPressTimer = setTimeout(() => {
        if (!touchActive) return;
        showPopup();
    }, LONG_PRESS_MS);
}

// --- Shared popup logic ---

function selectAndDismiss() {
    const selected = popupVariants.value[activeVariantIdx.value];
    if (selected) {
        emit('press', selected);
        haptic();
    }
    hidePopup();
    clickSuppressed = true;
}

function showPopup() {
    if (!props.variants?.length || !buttonRef.value) return;

    popupVariants.value = [props.char, ...props.variants];
    activeVariantIdx.value = 0;

    const keyRect = buttonRef.value.getBoundingClientRect();
    const totalWidth = popupVariants.value.length * OPTION_WIDTH;
    const keyCenter = keyRect.left + keyRect.width / 2;
    let left = keyCenter - totalWidth / 2;

    // Clamp to viewport
    const margin = 8;
    const vw = window.innerWidth;
    if (left < margin) left = margin;
    if (left + totalWidth > vw - margin) left = vw - margin - totalWidth;

    popupLeftPx = left;
    const top = keyRect.top - 56;

    popupStyle.value = {
        left: `${left}px`,
        top: `${top}px`,
        width: `${totalWidth}px`,
    };

    const stemLeft = keyCenter - left - 6;
    stemStyle.value = {
        left: `${Math.max(8, Math.min(stemLeft, totalWidth - 20))}px`,
    };

    popupVisible.value = true;
    haptic();
}

function hidePopup() {
    popupVisible.value = false;
    popupVariants.value = [];
    activeVariantIdx.value = 0;
}

function cancelLongPress() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function updateActiveVariant(clientX: number) {
    if (!popupVariants.value.length) return;

    const relX = clientX - popupLeftPx;
    const idx = Math.floor(relX / OPTION_WIDTH);
    const clamped = Math.max(0, Math.min(idx, popupVariants.value.length - 1));

    if (clamped !== activeVariantIdx.value) {
        activeVariantIdx.value = clamped;
        haptic();
    }
}
</script>

<style>
.diacritic-popup {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    animation: diacritic-popup-in 0.15s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.diacritic-popup-inner {
    display: flex;
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    background: #565758;
}

:root:not(.dark) .diacritic-popup-inner {
    background: #d3d6da;
    box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.15),
        0 0 0 1px rgba(0, 0, 0, 0.1);
}

.diacritic-option {
    width: 40px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    color: white;
    transition: background 0.08s ease;
}

:root:not(.dark) .diacritic-option {
    color: #1a1a1b;
}

.diacritic-active {
    background: #3b82f6;
    color: white;
    border-radius: 6px;
}

.diacritic-stem {
    position: absolute;
    bottom: -7px;
    width: 12px;
    height: 12px;
    background: #565758;
    transform: rotate(45deg);
    border-radius: 0 0 3px 0;
}

:root:not(.dark) .diacritic-stem {
    background: #d3d6da;
}

@keyframes diacritic-popup-in {
    from {
        opacity: 0;
        transform: scale(0.7) translateY(8px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
</style>
