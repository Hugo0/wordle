<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div
                v-if="game.copyFallbackText"
                class="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/50"
                @click.self="game.closeCopyFallbackModal()"
            >
                <div
                    class="bg-paper border border-rule mx-5 max-w-xs w-full p-5 text-center"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Copy your results"
                >
                    <p class="font-body font-semibold text-ink mb-3">Copy your results:</p>
                    <textarea
                        ref="textareaRef"
                        readonly
                        class="w-full h-28 p-2 border border-rule bg-paper-warm font-mono text-xs resize-none text-ink"
                        :value="game.copyFallbackText"
                    />
                    <p class="text-xs text-muted my-3">Select all and copy (Ctrl+C / Cmd+C)</p>
                    <button
                        class="px-6 py-2.5 bg-correct text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                        @click="game.closeCopyFallbackModal()"
                    >
                        Done
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
const game = useGameStore();
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Auto-select text when modal opens
watch(
    () => game.copyFallbackText,
    (text) => {
        if (text) {
            nextTick(() => {
                textareaRef.value?.focus();
                textareaRef.value?.select();
            });
        }
    }
);
</script>
