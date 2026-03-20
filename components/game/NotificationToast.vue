<template>
    <div
        v-if="notification.show"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        class="fixed top-0 inset-x-0 mx-auto z-50 max-w-xs justify-items-center text-center transition-opacity duration-300"
        :class="{ 'opacity-0': notification.fading }"
    >
        <div
            class="top-50 bg-ink text-paper p-4 m-4 shadow-lg font-body font-semibold text-sm"
            :style="{ top: notification.top + 'px' }"
        >
            {{ notification.message }}
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Notification } from '~/utils/types';

defineProps<{ notification: Notification }>();
</script>
