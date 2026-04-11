<template>
    <Teleport to="body">
        <!-- Backdrop — separate transition so backdrop-filter isn't animated
             (animating blur is extremely expensive and causes frame drops). -->
        <Transition name="backdrop-fade">
            <div
                v-if="visible"
                class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
                aria-hidden="true"
                @click="$emit('close')"
            />
        </Transition>

        <!-- Dialog — fades + scales in independently of the backdrop -->
        <Transition name="modal-fade">
            <div
                v-if="visible"
                class="fixed inset-0 z-50 flex justify-center px-3 py-4 overflow-y-auto"
                :class="alignClass"
                @keydown.escape="$emit('close')"
                @click.self="$emit('close')"
            >
                <div
                    ref="dialogRef"
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="labelId || undefined"
                    :aria-label="ariaLabel || undefined"
                    tabindex="-1"
                    class="relative w-full border border-rule bg-paper text-ink shadow-xl z-10 modal-animate"
                    :class="sizeClass"
                >
                    <div class="relative flex flex-col w-full outline-none" :class="paddingClass">
                        <!-- Close button — omit when the caller provides their own -->
                        <div v-if="!noCloseButton" class="flex justify-end -mb-2">
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
        size?: 'sm' | 'md' | 'lg' | 'xl';
        /** Vertical alignment: 'center' (default) or 'top' (for stats/end-game modals). */
        align?: 'center' | 'top';
        noPadding?: boolean;
        noCloseButton?: boolean;
        labelId?: string;
        ariaLabel?: string;
    }>(),
    {
        size: 'md',
        align: 'center',
        noPadding: false,
        noCloseButton: false,
        labelId: undefined,
        ariaLabel: undefined,
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

const alignClass = computed(() =>
    props.align === 'top' ? 'items-start pt-[3vh] sm:pt-[5vh]' : 'items-center'
);

const sizeClass = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'max-w-xs sm:max-w-md';
        case 'xl':
            return 'max-w-[480px]';
        case 'lg':
            return 'max-w-lg';
        case 'md':
        default:
            return 'max-w-md sm:max-w-lg';
    }
});
const paddingClass = computed(() => (props.noPadding ? '' : 'p-5'));
</script>
