<template>
    <Transition name="toast-fade">
        <div
            v-if="toastMessage"
            class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-ink text-paper text-sm font-semibold rounded-lg shadow-lg"
            role="status"
            @click="dismissToast()"
        >
            {{ toastMessage }}
        </div>
    </Transition>
</template>

<script setup lang="ts">
const { toastMessage, dismissToast } = useToast();
</script>

<style scoped>
.toast-fade-enter-active {
    transition: all 0.3s ease-out;
}
.toast-fade-leave-active {
    transition: all 0.2s ease-in;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
    transform: translate(-50%, 10px);
}
</style>
