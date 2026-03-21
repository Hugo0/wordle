<template>
    <div
        v-show="visible"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelId || undefined"
        class="fixed top-10 left-0 w-full h-full items-center flex"
        :class="zClass"
    >
        <div class="modal-animate mx-auto w-full border border-rule shadow-lg" :class="sizeClass">
            <div class="bg-paper relative flex flex-col w-full outline-none" :class="paddingClass">
                <div class="relative">
                    <!-- Close (X) button -->
                    <button
                        type="button"
                        aria-label="Close"
                        class="absolute top-0 right-0 p-2 ml-auto z-50 text-muted hover:text-ink transition-colors"
                        @click="$emit('close')"
                    >
                        <X :size="20" />
                    </button>

                    <slot />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
const props = withDefaults(
    defineProps<{
        visible: boolean;
        size?: 'sm' | 'md' | 'lg';
        zIndex?: 30 | 50;
        noPadding?: boolean;
        labelId?: string;
    }>(),
    {
        size: 'md',
        zIndex: 50,
        noPadding: false,
        labelId: undefined,
    }
);
defineEmits<{ close: [] }>();

const zClass = computed(() => (props.zIndex === 30 ? 'z-30 mx-auto' : 'z-50'));
const sizeClass = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'max-w-xs sm:max-w-md m-4';
        case 'lg':
            return 'max-w-lg max-h-[85vh] overflow-y-auto';
        case 'md':
        default:
            return 'max-w-md sm:max-w-lg m-4';
    }
});
const paddingClass = computed(() => (props.noPadding ? '' : 'p-5'));
</script>
