<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div
                v-if="visible"
                class="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 overflow-y-auto"
            >
                <!-- Backdrop -->
                <div class="fixed inset-0 bg-ink/30" aria-hidden="true" @click="$emit('close')" />

                <!-- Modal -->
                <div
                    class="relative bg-paper border border-rule shadow-xl w-full max-w-lg z-10 modal-animate"
                    role="dialog"
                    aria-modal="true"
                    :aria-label="`Choose a game mode for ${languageName}`"
                    @keydown.escape="$emit('close')"
                >
                    <!-- Header -->
                    <div class="px-6 pt-6 pb-4">
                        <h2 class="heading-section text-2xl text-ink">Choose a Game Mode</h2>
                        <p class="text-sm text-muted mt-1">
                            Different ways to play &mdash; same language, new challenges.
                        </p>
                        <!-- Language pill (clickable to change language) -->
                        <button
                            class="inline-flex items-center gap-2 mt-3 px-3 py-1.5 border border-rule bg-paper-warm hover:bg-muted-soft transition-colors cursor-pointer"
                            @click="$emit('change-language')"
                        >
                            <img
                                v-if="flagSrc"
                                :src="flagSrc"
                                :alt="languageName"
                                class="flag-icon flag-icon-sm"
                                @error="flagFailed = true"
                            />
                            <span class="text-sm font-semibold text-ink">{{ languageName }}</span>
                            <ChevronDown :size="14" class="text-muted" />
                        </button>
                    </div>

                    <!-- Mode list -->
                    <div class="border-t border-rule">
                        <button
                            v-for="mode in modes"
                            :key="mode.id"
                            class="w-full flex items-center gap-4 px-6 py-4 border-b border-rule text-left transition-colors"
                            :class="
                                mode.disabled
                                    ? 'opacity-40 cursor-default'
                                    : 'hover:bg-paper-warm cursor-pointer'
                            "
                            :disabled="mode.disabled"
                            @click="!mode.disabled && selectMode(mode)"
                        >
                            <!-- Icon -->
                            <div
                                class="w-10 h-10 flex items-center justify-center border border-rule bg-paper-warm flex-shrink-0"
                            >
                                <component :is="mode.iconComponent" :size="20" class="text-ink" />
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div class="heading-section text-base text-ink">
                                    {{ mode.label }}
                                </div>
                                <div class="text-xs text-muted mt-0.5">
                                    {{ mode.description }}
                                </div>
                            </div>

                            <!-- Action -->
                            <div class="flex-shrink-0 text-right">
                                <template v-if="mode.disabled">
                                    <span class="mono-label text-muted">Soon</span>
                                </template>
                                <template v-else>
                                    <span class="mono-label-md text-ink">Play &rarr;</span>
                                </template>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { useFlag } from '~/composables/useFlag';
import { GAME_MODES_UI, getModeRoute } from '~/composables/useGameModes';

const props = defineProps<{
    visible: boolean;
    langCode: string;
    languageName: string;
}>();

const emit = defineEmits<{
    close: [];
    select: [mode: string, langCode: string];
    'change-language': [];
}>();

const flagFailed = ref(false);
const flagSrc = computed(() => (flagFailed.value ? null : useFlag(props.langCode)));

const modes = computed(() =>
    GAME_MODES_UI.map((mode) => ({
        ...mode,
        iconComponent: mode.icon,
        disabled: !mode.enabled,
        route: getModeRoute(mode, props.langCode),
    }))
);

const analytics = useAnalytics();

function selectMode(mode: (typeof modes.value)[number]) {
    if (!mode.route) return;
    analytics.trackModeSelected(mode.id, 'mode_picker');
    emit('select', mode.id, props.langCode);
    navigateTo(mode.route);
}
</script>
