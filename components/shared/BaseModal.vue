<template>
    <div
        v-show="visible"
        class="fixed top-10 left-0 w-full h-full items-center flex"
        :class="zClass"
    >
        <div
            class="modal-animate mx-auto w-full border-2 border-slate-200 dark:border-neutral-600 rounded-lg shadow-lg"
            :class="sizeClass"
        >
            <div
                class="bg-white dark:bg-neutral-800 rounded-lg relative flex flex-col w-full outline-none focus:outline-none"
                :class="paddingClass"
            >
                <div class="relative">
                    <!-- Close (X) button -->
                    <button
                        type="button"
                        aria-label="Close"
                        class="absolute top-0 right-0 p-1 ml-auto z-50"
                        @click="$emit('close')"
                    >
                        <span
                            class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none"
                            >&times;</span
                        >
                    </button>

                    <slot />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        visible: boolean;
        size?: 'sm' | 'md' | 'lg';
        zIndex?: 30 | 50;
        noPadding?: boolean;
    }>(),
    {
        size: 'md',
        zIndex: 50,
        noPadding: false,
    },
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
