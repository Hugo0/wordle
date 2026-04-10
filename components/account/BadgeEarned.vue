<template>
    <Transition name="badge-toast">
        <div
            v-if="badge"
            class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-paper border border-rule shadow-lg rounded-lg max-w-[320px]"
            role="status"
            aria-live="polite"
            @click="dismiss()"
        >
            <div class="w-10 h-10 rounded-full bg-correct/10 text-correct flex items-center justify-center flex-shrink-0">
                <component :is="icon" :size="22" />
            </div>
            <div class="min-w-0">
                <div class="mono-label text-correct">Badge earned</div>
                <div class="text-sm font-semibold text-ink truncate">{{ badge.name }}</div>
                <div class="text-xs text-muted truncate">{{ badge.description }}</div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import {
    Sword, Star, Target, Globe, Crown, Flame, Trophy, Zap,
    CalendarCheck, Map, Award,
} from 'lucide-vue-next';

const { currentBadge: badge, dismissBadge } = useBadgeNotification();

const ICONS: Record<string, typeof Award> = {
    Sword, Star, Target, Globe, Crown, Flame, Trophy, Zap, CalendarCheck, Map, Award,
};

const icon = computed(() => ICONS[badge.value?.icon ?? ''] || Award);

let timer: ReturnType<typeof setTimeout> | null = null;

function dismiss() {
    if (timer) clearTimeout(timer);
    dismissBadge();
    startTimer();
}

function startTimer() {
    if (timer) clearTimeout(timer);
    if (badge.value) {
        timer = setTimeout(() => {
            dismissBadge();
            startTimer();
        }, 4000);
    }
}

watch(badge, (b) => {
    if (b) startTimer();
});
</script>

<style scoped>
.badge-toast-enter-active {
    transition: all 0.4s ease-out;
}
.badge-toast-leave-active {
    transition: all 0.3s ease-in;
}
.badge-toast-enter-from {
    opacity: 0;
    transform: translate(-50%, 20px);
}
.badge-toast-leave-to {
    opacity: 0;
    transform: translate(-50%, 20px);
}
</style>
