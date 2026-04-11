<!--
    BadgeGrid — editorial-style badge display grid.

    Shows badges in a 4-column grid (2 on mobile). For tiered badge groups
    (polyglot, streak, mode), only the highest earned tier and the next
    unearned tier are shown — the next tier includes a progress bar.

    Matches the editorial design exploration (direction-a-editorial.html#badges).
-->

<script setup lang="ts">
import {
    Sword,
    Star,
    Target,
    Globe,
    Crown,
    Flame,
    Trophy,
    Zap,
    CalendarCheck,
    Map,
    Award,
    Infinity as InfinityIcon,
    Shield,
    Sparkles,
    Languages,
    Medal,
} from 'lucide-vue-next';

const ICONS: Record<string, any> = {
    Sword,
    Star,
    Target,
    Globe,
    Crown,
    Flame,
    Trophy,
    Zap,
    CalendarCheck,
    Map,
    Award,
    Infinity: InfinityIcon,
    Shield,
    Sparkles,
    Languages,
    Medal,
};

interface Badge {
    slug: string;
    name: string;
    description: string;
    category?: string;
    icon: string;
    group?: string | null;
    threshold?: number;
    earnedAt?: string;
}

const props = defineProps<{
    badges: Badge[];
    earnedSlugs: Set<string>;
    progress?: Record<string, number>;
    compact?: boolean;
}>();

function getIcon(iconName: string) {
    return ICONS[iconName] || Award;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Collapse tiered badge groups: for each group, show only the highest
 * earned tier and the next unearned tier. Ungrouped badges pass through.
 */
const displayBadges = computed(() => {
    const grouped = new Map<string, Badge[]>();
    const ungrouped: Badge[] = [];

    for (const badge of props.badges) {
        if (badge.group) {
            if (!grouped.has(badge.group)) grouped.set(badge.group, []);
            grouped.get(badge.group)!.push(badge);
        } else {
            ungrouped.push(badge);
        }
    }

    const result: Badge[] = [];

    // Process each group: sort by threshold, pick highest earned + next unearned
    for (const [, badges] of grouped) {
        const sorted = [...badges].sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0));
        let highestEarned: Badge | null = null;
        let nextUnearned: Badge | null = null;

        for (const b of sorted) {
            if (props.earnedSlugs.has(b.slug)) {
                highestEarned = b;
            } else if (!nextUnearned) {
                nextUnearned = b;
            }
        }

        if (highestEarned) result.push(highestEarned);
        if (nextUnearned) result.push(nextUnearned);
        // If nothing earned yet, just show the first (lowest) tier
        if (!highestEarned && !nextUnearned && sorted.length > 0) {
            result.push(sorted[0]!);
        }
    }

    // Sort: earned first, then locked
    const earned = result.filter((b) => props.earnedSlugs.has(b.slug));
    const locked = result.filter((b) => !props.earnedSlugs.has(b.slug));
    const earnedUngrouped = ungrouped.filter((b) => props.earnedSlugs.has(b.slug));
    const lockedUngrouped = ungrouped.filter((b) => !props.earnedSlugs.has(b.slug));

    return [...earned, ...earnedUngrouped, ...locked, ...lockedUngrouped];
});

function getProgressPct(badge: Badge): number {
    if (!badge.group || !props.progress || !badge.threshold) return 0;
    const current = props.progress[badge.group] ?? 0;
    return Math.min(100, Math.round((current / badge.threshold) * 100));
}

function getProgressLabel(badge: Badge): string {
    if (!badge.group || !props.progress || !badge.threshold) return '';
    const current = props.progress[badge.group] ?? 0;
    return `${current}/${badge.threshold}`;
}
</script>

<template>
    <div class="badge-grid" :class="{ compact }">
        <div
            v-for="badge in displayBadges"
            :key="badge.slug"
            class="badge-card"
            :class="{ locked: !earnedSlugs.has(badge.slug) }"
        >
            <div class="badge-icon">
                <component :is="getIcon(badge.icon)" :size="compact ? 24 : 32" />
            </div>
            <div class="badge-name">{{ badge.name }}</div>
            <div v-if="!compact" class="badge-desc">{{ badge.description }}</div>
            <div v-if="earnedSlugs.has(badge.slug) && badge.earnedAt" class="badge-date">
                Earned {{ formatDate(badge.earnedAt) }}
            </div>
            <!-- Progress bar for locked tiered badges -->
            <template v-if="!earnedSlugs.has(badge.slug) && badge.group && progress">
                <div class="badge-progress">
                    <div
                        class="badge-progress-fill"
                        :style="{ width: getProgressPct(badge) + '%' }"
                    ></div>
                </div>
                <div class="badge-progress-label">{{ getProgressLabel(badge) }}</div>
            </template>
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
    opacity: 0.35;
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

/* Progress bar for locked tiered badges */
.badge-progress {
    width: 80%;
    height: 3px;
    background: var(--color-rule);
    margin: 10px auto 0;
}
.badge-progress-fill {
    height: 100%;
    background: var(--color-ink);
    transition: width 0.3s ease;
}
.badge-progress-label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-muted);
    margin-top: 4px;
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
