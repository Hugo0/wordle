<template>
    <ol class="lb-list">
        <li
            v-for="entry in entries"
            :key="entry.rank"
            class="lb-row"
            :class="{ 'lb-row-you': showYou && you && entry.username === you.username }"
        >
            <div class="lb-rank" :class="rankClass(entry.rank)">{{ entry.rank }}</div>
            <LbAvatar :username="entry.username" :avatar-url="entry.avatarUrl" />
            <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-ink truncate">
                    {{ entry.username }}
                    <span
                        v-if="showYou && you && entry.username === you.username"
                        class="font-mono text-[8px] tracking-[0.1em] uppercase bg-ink text-paper px-1 py-px ms-1.5 align-middle"
                        >YOU</span
                    >
                </div>
                <div v-if="isAgg && entry.daysPlayed" class="font-mono text-[9px] text-muted">
                    {{ entry.daysPlayed }} days
                </div>
            </div>
            <div class="text-end flex-shrink-0">
                <div class="font-mono text-sm font-bold flex items-center gap-1">
                    <Flame v-if="isStreaks" :size="14" class="text-flame" />
                    {{ formatScore(entry) }}
                </div>
                <div v-if="formatScoreSub(entry)" class="font-mono text-[9px] text-muted">
                    {{ formatScoreSub(entry) }}
                </div>
            </div>
        </li>
    </ol>
</template>

<script setup lang="ts">
import { Flame } from 'lucide-vue-next';

defineProps<{
    entries: any[];
    you?: any;
    showYou?: boolean;
    isStreaks: boolean;
    isAgg: boolean;
    formatScore: (entry: any) => string;
    formatScoreSub: (entry: any) => string | null;
}>();

function rankClass(rank: number): Record<string, boolean> {
    return {
        'lb-rank-gold': rank === 1,
        'lb-rank-silver': rank === 2,
        'lb-rank-bronze': rank === 3,
    };
}
</script>
