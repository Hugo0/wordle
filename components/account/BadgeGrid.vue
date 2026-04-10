<!--
    BadgeGrid — editorial-style badge display grid.

    Shows all badges in a 4-column grid (2 on mobile). Earned badges show
    the icon, name, description, and date earned. Locked badges are dimmed
    with optional progress indicator.

    Matches the editorial design exploration (direction-a-editorial.html#badges).
-->

<script setup lang="ts">
import {
    Sword, Star, Target, Globe, Crown, Flame, Trophy, Zap,
    CalendarCheck, Map, Award, Infinity as InfinityIcon, Shield,
    Sparkles, Languages, Medal,
} from 'lucide-vue-next';

const ICONS: Record<string, any> = {
    Sword, Star, Target, Globe, Crown, Flame, Trophy, Zap,
    CalendarCheck, Map, Award, Infinity: InfinityIcon, Shield,
    Sparkles, Languages, Medal,
};

interface Badge {
    slug: string;
    name: string;
    description: string;
    category?: string;
    icon: string;
    earnedAt?: string;
}

const props = defineProps<{
    badges: Badge[];
    earnedSlugs: Set<string>;
    /** Compact mode: smaller cards, fewer columns. For homepage preview. */
    compact?: boolean;
}>();

function getIcon(iconName: string) {
    return ICONS[iconName] || Award;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<template>
    <div class="badge-grid" :class="{ compact }">
        <div
            v-for="badge in badges"
            :key="badge.slug"
            class="badge-card"
            :class="{ locked: !earnedSlugs.has(badge.slug) }"
        >
            <div class="badge-icon">
                <component :is="getIcon(badge.icon)" :size="compact ? 24 : 32" />
            </div>
            <div class="badge-name">{{ badge.name }}</div>
            <div v-if="!compact" class="badge-desc">{{ badge.description }}</div>
            <div
                v-if="earnedSlugs.has(badge.slug) && badge.earnedAt"
                class="badge-date"
            >
                {{ formatDate(badge.earnedAt) }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.badge-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--color-rule);
    border: 1px solid var(--color-rule);
}
.badge-card {
    background: var(--color-paper);
    padding: 24px 16px;
    text-align: center;
    transition: background 0.2s;
    cursor: default;
}
.badge-card:hover {
    background: var(--color-paper-warm);
}
.badge-card.locked {
    opacity: 0.3;
}
.badge-icon {
    color: var(--color-ink);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.badge-card.locked .badge-icon {
    color: var(--color-muted);
}
.badge-name {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: 3px;
}
.badge-desc {
    font-size: 11px;
    color: var(--color-muted);
    line-height: 1.4;
}
.badge-date {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-muted);
    margin-top: 6px;
    letter-spacing: 0.05em;
}

/* Compact mode: smaller cards for homepage/preview */
.badge-grid.compact {
    grid-template-columns: repeat(5, 1fr);
}
.compact .badge-card {
    padding: 14px 8px;
}
.compact .badge-name {
    font-size: 10px;
}

@media (max-width: 640px) {
    .badge-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .badge-grid.compact {
        grid-template-columns: repeat(3, 1fr);
    }
    .badge-card {
        padding: 18px 12px;
    }
}
</style>
