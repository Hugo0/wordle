/**
 * Badge notification state — shared between sync composable and BadgeEarned toast.
 *
 * The sync composable pushes newly earned badges here when the game-result
 * POST response includes them. The BadgeEarned component reads from this
 * and renders the celebration toast.
 */
export interface BadgeNotification {
    slug: string;
    name: string;
    description: string;
    icon: string;
}

const pendingBadges = useState<BadgeNotification[]>('pending-badges', () => []);

export function useBadgeNotification() {
    function addBadge(badge: BadgeNotification) {
        pendingBadges.value.push(badge);
    }

    function addBadges(badges: BadgeNotification[]) {
        pendingBadges.value.push(...badges);
    }

    function dismissBadge() {
        pendingBadges.value.shift();
    }

    const currentBadge = computed(() => pendingBadges.value[0] ?? null);

    return {
        pendingBadges,
        currentBadge,
        addBadge,
        addBadges,
        dismissBadge,
    };
}
