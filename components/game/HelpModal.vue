<template>
    <BaseModal :visible="visible" size="md" @close="$emit('close')">
        <div class="flex flex-col gap-2">
            <!-- Speed Streak help -->
            <template v-if="isSpeedMode">
                <h2 class="heading-body text-2xl text-center text-ink">{{ lang.config?.ui?.speed_streak }}</h2>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">{{ help.speed_how_it_works }}</h3>
                <p class="text-sm text-ink">
                    {{ help.speed_explanation }}
                </p>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">{{ help.speed_time_bonuses }}</h3>
                <div class="grid grid-cols-6 gap-1 text-center">
                    <div v-for="n in 6" :key="n" class="py-2">
                        <div class="font-mono text-xs text-muted">{{ n }}</div>
                        <div class="font-mono text-sm font-bold text-ink">
                            +{{ [60, 50, 40, 30, 20, 10][n - 1] }}s
                        </div>
                    </div>
                </div>
                <p class="text-xs text-muted">{{ help.speed_guesses_to_time }}</p>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">{{ help.speed_scoring }}</h3>
                <p class="text-sm text-ink">
                    {{ help.speed_scoring_explanation }}
                </p>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">{{ help.speed_pressure }}</h3>
                <p class="text-sm text-ink">
                    {{ help.speed_pressure_explanation }}
                </p>
            </template>

            <!-- Semantic Explorer help — visual examples first, text after,
                 matching the classic modal's show-don't-tell pattern. -->
            <template v-else-if="isSemanticMode">
                <h2 class="heading-body text-2xl text-center text-ink">{{ lang.config?.ui?.semantic_title }}</h2>
                <p class="text-center text-sm text-muted -mt-1">
                    {{ lang.config?.help?.semantic_subtitle }}
                </p>

                <div class="editorial-rule" />

                <!-- 1. Rank system — fake mini leaderboard -->
                <h3 class="heading-section text-sm text-ink">{{ lang.config?.help?.semantic_rank_title }}</h3>
                <div class="sem-help-example">
                    <div class="sem-help-row">
                        <span class="sem-help-word">shower</span>
                        <span class="sem-help-rank" style="color: var(--color-correct)">#19</span>
                    </div>
                    <div class="sem-help-row">
                        <span class="sem-help-word">river</span>
                        <span class="sem-help-rank" style="color: var(--color-hot)">#1,362</span>
                    </div>
                    <div class="sem-help-row">
                        <span class="sem-help-word">freedom</span>
                        <span class="sem-help-rank" style="color: var(--color-muted)">#13,456</span>
                    </div>
                </div>
                <p class="text-xs text-muted">
                    {{ lang.config?.help?.semantic_rank_explanation }}
                    <strong class="text-ink">Rank #1</strong> =
                    {{ lang.config?.help?.semantic_rank_found }}
                </p>

                <div class="editorial-rule" />

                <!-- 2. Compass hints — fake compass rows -->
                <h3 class="heading-section text-sm text-ink">{{ lang.config?.help?.semantic_compass_title }}</h3>
                <div class="sem-help-compass">
                    <div class="sem-help-hint-row">
                        <span>Think more <em>burning</em></span>
                        <span class="sem-help-axis">temperature</span>
                    </div>
                    <div class="sem-help-hint-row">
                        <span>Think slightly more <em>ancient</em></span>
                        <span class="sem-help-axis">age</span>
                    </div>
                </div>
                <p class="text-xs text-muted">
                    {{ lang.config?.help?.semantic_compass_explanation }}
                    <strong class="text-ink">{{ lang.config?.help?.semantic_compass_latest_guess }}</strong>
                    {{ lang.config?.help?.semantic_compass_toward }}
                </p>

                <div class="editorial-rule" />

                <!-- 3. Map — tiny dot diagram -->
                <h3 class="heading-section text-sm text-ink">{{ lang.config?.help?.semantic_map_title }}</h3>
                <div class="sem-help-map">
                    <div class="sem-help-map-canvas">
                        <div class="sem-help-target">?</div>
                        <div class="sem-help-dot sem-help-dot-close" title="#19">
                            <span>shower</span>
                        </div>
                        <div class="sem-help-dot sem-help-dot-mid" title="#1,362">
                            <span>river</span>
                        </div>
                        <div class="sem-help-dot sem-help-dot-far" title="#13,456">
                            <span>freedom</span>
                        </div>
                    </div>
                </div>
                <p class="text-xs text-muted">
                    {{ lang.config?.help?.semantic_map_explanation }}
                </p>

                <div class="editorial-rule" />

                <!-- 4. Oracle -->
                <h3 class="heading-section text-sm text-ink">{{ lang.config?.help?.semantic_oracle_title }}</h3>
                <div class="sem-help-oracle">
                    <em>"what the horizon holds in its cup"</em>
                </div>
                <p class="text-xs text-muted">
                    {{ lang.config?.help?.semantic_oracle_explanation }}
                </p>

                <div class="editorial-rule" />

                <p class="text-center text-sm text-muted">
                    {{ lang.config?.help?.semantic_footer }}
                </p>
            </template>

            <!-- Classic/default help -->
            <template v-else>
                <h2 class="heading-body text-2xl text-center text-ink">
                    Wordle
                    <span class="text-accent">{{ lang.config?.name_native }}</span>
                </h2>

                <h3 class="heading-section text-lg text-ink">{{ help.title }}</h3>

                <p class="text-sm text-ink">
                    {{ help.text_1_1_1 }}
                    <span class="font-bold uppercase">Wordle</span>
                    {{ help.text_1_1_2 }}
                </p>
                <p class="text-sm text-ink">{{ help.text_1_2 }}</p>
                <p class="text-sm text-ink">{{ help.text_1_3 }}</p>

                <div class="editorial-rule" />

                <!-- Example tiles -->
                <div class="justify-center items-center flex flex-col gap-2">
                    <h2 class="heading-section text-base text-ink">
                        {{ help.title_2 }}
                    </h2>

                    <div v-if="exampleWord1.length" class="grid grid-cols-5 gap-1 w-full max-w-xs">
                        <div
                            v-for="(c, i) in exampleWord1"
                            :key="'ex1-' + i"
                            class="tile w-full h-full inline-flex justify-center items-center text-2xl uppercase font-display font-bold select-none"
                            :class="i === 0 ? 'correct text-white' : 'aspect-square filled'"
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord1.length" class="text-sm text-ink mb-2">
                        <span class="font-bold uppercase">{{ exampleWord1[0] }}</span>
                        {{ help.text_2_1 }}
                    </p>

                    <div v-if="exampleWord2.length" class="grid grid-cols-5 gap-1 w-full max-w-xs">
                        <div
                            v-for="(c, i) in exampleWord2"
                            :key="'ex2-' + i"
                            class="tile w-full h-full inline-flex justify-center items-center text-2xl uppercase font-display font-bold select-none"
                            :class="i === 2 ? 'semicorrect text-white' : 'aspect-square filled'"
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord2.length" class="text-sm text-ink mb-2">
                        <span class="font-bold uppercase">{{ exampleWord2[2] }}</span>
                        {{ help.text_2_2 }}
                    </p>

                    <div v-if="exampleWord3.length" class="grid grid-cols-5 gap-1 w-full max-w-xs">
                        <div
                            v-for="(c, i) in exampleWord3"
                            :key="'ex3-' + i"
                            class="tile w-full h-full inline-flex justify-center items-center text-2xl uppercase font-display font-bold select-none"
                            :class="i === 4 ? 'incorrect text-white' : 'aspect-square filled'"
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord3.length" class="text-sm text-ink mb-2">
                        <span class="font-bold uppercase">{{ exampleWord3[4] }}</span>
                        {{ help.text_2_3 }}
                    </p>
                </div>
            </template>
        </div>
    </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLanguageStore } from '~/stores/language';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const lang = useLanguageStore();
const game = useGameStore();

const isSpeedMode = computed(() => game.gameConfig.mode === 'speed');
const isSemanticMode = computed(() => game.gameConfig.mode === 'semantic');

const help = computed(() => lang.config?.help ?? ({} as Record<string, string>));

const exampleWord1 = computed(() => [...(lang.wordList[0] ?? '')]);
const exampleWord2 = computed(() => [...(lang.wordList[1] ?? '')]);
const exampleWord3 = computed(() => [...(lang.wordList[2] ?? '')]);
</script>

<style scoped>
/* ─── Semantic Explorer help visual examples ─── */

/* Fake mini leaderboard */
.sem-help-example {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border: 1px solid var(--color-rule);
    padding: 8px 12px;
    margin-bottom: 6px;
}
.sem-help-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 4px 0;
}
.sem-help-row + .sem-help-row {
    border-top: 1px solid var(--color-rule);
}
.sem-help-word {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 14px;
    color: var(--color-ink);
}
.sem-help-rank {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

/* Fake compass hint rows */
.sem-help-compass {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--color-rule);
    padding: 10px 12px;
    margin-bottom: 6px;
}
.sem-help-hint-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    font-size: 13px;
    color: var(--color-ink);
}
.sem-help-hint-row em {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
}
.sem-help-axis {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    flex-shrink: 0;
}

/* Tiny dot diagram — pure CSS */
.sem-help-map {
    display: flex;
    justify-content: center;
    margin-bottom: 6px;
}
.sem-help-map-canvas {
    position: relative;
    width: 200px;
    height: 140px;
    background: var(--color-paper-warm, #f3efe8);
    border: 1px solid var(--color-rule);
}
.sem-help-target {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 18px;
    height: 18px;
    border: 1.5px solid var(--color-accent);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 10px;
    font-weight: 700;
    color: var(--color-accent);
}
.sem-help-dot {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.sem-help-dot::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-bottom: 2px;
}
.sem-help-dot span {
    font-family: var(--font-mono);
    font-size: 8px;
    color: var(--color-ink);
    white-space: nowrap;
}
/* Close dot — near the center, green */
.sem-help-dot-close {
    left: 42%;
    top: 32%;
}
.sem-help-dot-close::before {
    background: var(--color-correct);
}
.sem-help-dot-close span {
    font-weight: 700;
}
/* Mid dot — further out, orange */
.sem-help-dot-mid {
    left: 22%;
    top: 55%;
}
.sem-help-dot-mid::before {
    background: var(--color-hot);
}
/* Far dot — near edge, grey */
.sem-help-dot-far {
    left: 65%;
    top: 78%;
}
.sem-help-dot-far::before {
    background: var(--color-muted);
}

/* Oracle example */
.sem-help-oracle {
    border-left: 3px solid var(--color-accent);
    padding: 8px 14px;
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 1.4;
    color: var(--color-ink);
    margin-bottom: 6px;
}
</style>
