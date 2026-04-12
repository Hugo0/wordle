<template>
    <div class="podium">
        <div
            v-for="(place, idx) in orderedPlaces"
            :key="idx"
            class="podium-place"
            :class="['second', 'first', 'third'][idx]"
        >
            <div class="podium-rank">{{ ['#2', '#1', '#3'][idx] }}</div>
            <LbAvatar
                :username="place.username"
                :avatar-url="place.avatarUrl"
                :size="idx === 1 ? 'lg' : 'md'"
            />
            <div class="podium-name">
                {{ place.username }}
                <span v-if="showYou && you && place.username === you.username" class="podium-you"
                    >YOU</span
                >
            </div>
            <div class="podium-score">
                <Flame
                    v-if="isStreaks"
                    :size="14"
                    class="text-flame inline-block align-text-bottom"
                />
                {{ formatScore(place) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Flame } from 'lucide-vue-next';

const props = defineProps<{
    podium: { first: any; second: any; third: any };
    you?: any;
    showYou?: boolean;
    isStreaks: boolean;
    formatScore: (entry: any) => string;
}>();

const orderedPlaces = computed(() => [props.podium.second, props.podium.first, props.podium.third]);
</script>

<style scoped>
.podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 12px;
    padding: 16px 8px 16px;
    margin-bottom: 4px;
}
.podium-place {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}
.podium-place.first { order: 2; }
.podium-place.second { order: 1; }
.podium-place.third { order: 3; }
.podium-rank {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    color: var(--color-muted);
    letter-spacing: 0.04em;
    margin-bottom: 2px;
}
.podium-place.first .podium-rank { color: #c9a930; }
.podium-place.second .podium-rank { color: #8a8a8a; }
.podium-place.third .podium-rank { color: #a0622e; }
.podium-name {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    max-width: 80px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-ink);
}
.podium-you {
    display: block;
    font-family: var(--font-mono);
    font-size: 7px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: var(--color-ink);
    color: var(--color-paper);
    padding: 0 4px;
    margin: 2px auto 0;
    width: fit-content;
}
.podium-score {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-ink);
    margin-top: 2px;
}

/* Avatar ring color for podium */
.podium-place.first :deep(img),
.podium-place.first :deep(.rounded-full) {
    border: 2px solid #c9a930;
}
.podium-place.second :deep(img),
.podium-place.second :deep(.rounded-full) {
    border: 2px solid #8a8a8a;
}
.podium-place.third :deep(img),
.podium-place.third :deep(.rounded-full) {
    border: 2px solid #a0622e;
}
</style>
