<template>
    <div
        ref="scrollContainer"
        class="h-[100dvh] overflow-y-auto overscroll-none bg-paper text-ink transition-colors snap-y snap-mandatory"
    >
        <a href="#game-board" class="skip-link">Skip to game</a>
        <slot />
    </div>
</template>

<script setup lang="ts">
const scrollContainer = ref<HTMLElement | null>(null);

onMounted(() => {
    const el = scrollContainer.value;
    if (!el) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let hasSnappedBack = false;

    el.addEventListener(
        'scroll',
        () => {
            if (hasSnappedBack) return;
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                if (el.scrollTop <= 0) return;
                hasSnappedBack = true;
                el.scrollTo({ top: 0, behavior: 'smooth' });
            }, 200);
        },
        { passive: true }
    );
});
</script>
