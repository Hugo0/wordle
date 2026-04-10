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

// Auto snap-back scroll disabled — prevents users from scrolling down
// to read FAQ and other below-the-fold content.

// onMounted(() => {
//     const el = scrollContainer.value;
//     if (!el) return;
//
//     let scrollTimer: ReturnType<typeof setTimeout> | null = null;
//     let hasSnappedBack = false;
//
//     const onScroll = () => {
//         if (hasSnappedBack) return;
//         if (scrollTimer) clearTimeout(scrollTimer);
//         scrollTimer = setTimeout(() => {
//             if (el.scrollTop <= 0) return;
//             hasSnappedBack = true;
//             el.scrollTo({ top: 0, behavior: 'smooth' });
//         }, 200);
//     };
//
//     el.addEventListener('scroll', onScroll, { passive: true });
//
//     onUnmounted(() => {
//         el.removeEventListener('scroll', onScroll);
//         if (scrollTimer) clearTimeout(scrollTimer);
//     });
// });
</script>
