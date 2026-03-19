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
            class="top-50 bg-black p-4 m-4 rounded-lg shadow-lg"
            :style="{ top: notification.top + 'px' }"
        >
            <p class="font-bold text-white">{{ notification.message }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Notification } from '~/utils/types';

defineProps<{ notification: Notification }>();
</script>
