<template>
    <div class="minimap-container">
        <!-- Left scroll arrow -->
        <button
            v-if="canScrollLeft"
            class="minimap-arrow"
            aria-label="Scroll board previews left"
            @click="scrollLeft"
        >
            <ChevronLeft :size="12" />
        </button>

        <!-- Scrollable minimap -->
        <div ref="scrollEl" class="minimap-scroll" @scroll="updateScrollState">
            <button
                v-for="i in boardCount"
                :key="i - 1"
                class="minimap-board shrink-0"
                :class="{
                    'minimap-current': isOnCurrentPage(i - 1) && focusedBoard === null,
                    'minimap-focused': focusedBoard === i - 1,
                    'minimap-solved': game.boards[i - 1]?.solved,
                }"
                :aria-label="`Board ${i}${game.boards[i - 1]?.solved ? ' (solved)' : ''}`"
                @click="$emit('jumpToBoard', i - 1)"
            >
                <div class="minimap-grid">
                    <div v-for="row in miniRows(i - 1)" :key="row.index" class="minimap-row">
                        <span
                            v-for="(color, ci) in row.colors"
                            :key="ci"
                            class="minimap-cell"
                            :class="color"
                        />
                    </div>
                </div>
                <span class="minimap-label">{{ i }}</span>
            </button>
        </div>

        <!-- Right scroll arrow -->
        <button
            v-if="canScrollRight"
            class="minimap-arrow"
            aria-label="Scroll board previews right"
            @click="scrollRight"
        >
            <ChevronRight :size="12" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
    currentPage: number;
    boardsPerPage: number;
    focusedBoard: number | null;
}>();

defineEmits<{ jumpToBoard: [boardIndex: number] }>();

const game = useGameStore();
const boardCount = computed(() => game.gameConfig.boardCount);

const scrollEl = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

function updateScrollState() {
    const el = scrollEl.value;
    if (!el) return;
    canScrollLeft.value = el.scrollLeft > 4;
    canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
}

function scrollLeft() {
    scrollEl.value?.scrollBy({ left: -120, behavior: 'smooth' });
}
function scrollRight() {
    scrollEl.value?.scrollBy({ left: 120, behavior: 'smooth' });
}

onMounted(() => nextTick(() => updateScrollState()));

function isOnCurrentPage(boardIndex: number): boolean {
    const start = props.currentPage * props.boardsPerPage;
    const end = start + props.boardsPerPage;
    return boardIndex >= start && boardIndex < end;
}

function miniRows(boardIndex: number) {
    const board = game.boards[boardIndex];
    if (!board) return [];
    const rows: { index: number; colors: string[] }[] = [];
    for (let r = 0; r < board.tileClassesVisual.length && rows.length < 6; r++) {
        const classes = board.tileClassesVisual[r];
        if (!classes || !board.tilesVisual[r]?.some((t) => t !== '')) continue;
        const colors = classes.map((cls) => {
            if (cls.includes('incorrect')) return 'mc-incorrect';
            if (cls.includes('semicorrect')) return 'mc-semi';
            if (cls.includes('correct')) return 'mc-correct';
            return 'mc-empty';
        });
        rows.push({ index: r, colors });
    }
    return rows;
}
</script>

<style scoped>
.minimap-container {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
    flex: 1 1 0;
}
.minimap-scroll {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 2px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
}
.minimap-scroll::-webkit-scrollbar {
    display: none;
}
.minimap-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 3px;
    border: 1px solid var(--color-rule, #d4cfc7);
    background: var(--color-paper, #faf8f5);
    color: var(--color-muted, #8c8c8c);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s;
}
.minimap-arrow:hover {
    color: var(--color-ink, #1a1a1a);
    border-color: var(--color-ink, #1a1a1a);
}
.minimap-board {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: all 0.15s;
    min-width: 18px;
}
.minimap-board:hover {
    background: var(--color-paper-warm, #f3efe8);
}
.minimap-current {
    border-color: var(--color-rule, #d4cfc7);
    background: var(--color-paper-warm, #f3efe8);
}
.minimap-focused {
    border-color: var(--color-ink, #1a1a1a);
    background: var(--color-paper-warm, #f3efe8);
}
.minimap-solved {
    opacity: 0.6;
}
.minimap-solved .minimap-label {
    color: var(--color-correct);
}
.minimap-grid {
    display: flex;
    flex-direction: column;
    gap: 1px;
}
.minimap-row {
    display: flex;
    gap: 1px;
}
.minimap-cell {
    width: 3px;
    height: 3px;
    border-radius: 0.5px;
}
.mc-correct {
    background: var(--color-correct);
}
.mc-semi {
    background: var(--color-semicorrect);
}
.mc-incorrect {
    background: var(--color-key-absent, #8c8c8c);
}
.mc-empty {
    background: var(--color-rule, #d4cfc7);
}
.minimap-label {
    font-family: var(--font-mono, monospace);
    font-size: 7px;
    font-weight: 600;
    color: var(--color-muted, #8c8c8c);
    line-height: 1;
}
.minimap-focused .minimap-label {
    color: var(--color-ink, #1a1a1a);
}
</style>
