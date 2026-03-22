<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div
                v-if="visible"
                class="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 overflow-y-auto"
                @keydown.escape="$emit('close')"
            >
                <!-- Backdrop -->
                <div class="fixed inset-0 bg-ink/25" aria-hidden="true" @click="$emit('close')" />

                <!-- Dialog card -->
                <div
                    ref="dialogRef"
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="labelId || undefined"
                    tabindex="-1"
                    class="relative w-full border border-rule bg-paper text-ink shadow-lg z-10 modal-animate"
                    :class="sizeClass"
                >
                    <div class="relative flex flex-col w-full outline-none" :class="paddingClass">
                        <!-- Close (X) button — own row, never overlaps content -->
                        <div class="flex justify-end -mb-2">
                            <button
                                type="button"
                                aria-label="Close"
                                class="p-1 -me-1 -mt-1 text-muted hover:text-ink transition-colors"
                                @click="$emit('close')"
                            >
                                <X :size="20" />
                            </button>
                        </div>

                        <slot />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { X } from 'lucide-vue-next';

const props = withDefaults(
    defineProps<{
        visible: boolean;
        size?: 'sm' | 'md' | 'lg';
        noPadding?: boolean;
        labelId?: string;
    }>(),
    {
        size: 'md',
        noPadding: false,
        labelId: undefined,
    }
);
defineEmits<{ close: [] }>();

const dialogRef = ref<HTMLElement | null>(null);

// Auto-focus dialog when opened (enables Escape key without clicking first)
watch(
    () => props.visible,
    async (show) => {
        if (show) {
            await nextTick();
            dialogRef.value?.focus();
        }
    }
);

const sizeClass = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'max-w-xs sm:max-w-md';
        case 'lg':
            return 'max-w-lg';
        case 'md':
        default:
            return 'max-w-md sm:max-w-lg';
    }
});
const paddingClass = computed(() => (props.noPadding ? '' : 'p-5'));
</script>
