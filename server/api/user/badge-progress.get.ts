/**
 * GET /api/user/badge-progress — Current progress toward each badge group.
 *
 * Returns raw counts (e.g., { polyglot: 7, streak: 14, mode: 32 }).
 * The frontend computes percentage by dividing by each badge's threshold.
 */
import { computeBadgeProgress } from '~/server/utils/badge-evaluator';

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    return computeBadgeProgress(session.user.id);
});
