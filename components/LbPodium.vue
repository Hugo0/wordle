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
