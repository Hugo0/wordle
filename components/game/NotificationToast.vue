<template>
    <Transition name="toast">
        <div
            v-if="notification.show"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            class="fixed top-0 inset-x-0 mx-auto z-50 max-w-xs justify-items-center text-center"
            :class="{ 'toast-fading': notification.fading }"
        >
            <div
                class="bg-ink text-paper p-4 m-4 shadow-lg font-body font-semibold text-sm"
                :style="{ top: notification.top + 'px' }"
            >
                {{ notification.message }}
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import type { Notification } from '~/utils/types';

defineProps<{ notification: Notification }>();
</script>

<style scoped>
.toast-fading {
    opacity: 0;
    transition: opacity 300ms ease;
}
.toast-enter-active {
    transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-leave-active {
    transition: all 200ms ease;
}
.toast-enter-from {
    opacity: 0;
    transform: translateY(-16px);
}
.toast-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
