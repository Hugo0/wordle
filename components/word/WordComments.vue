<script setup lang="ts">
/**
 * WordComments — native comment section replacing Giscus.
 *
 * Flat list, no threading. Auth required to post, public to read.
 * Badges auto-populated from Results table via real-time SQL join.
 */
import { Send } from 'lucide-vue-next';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

interface Badge {
    mode: string;
    attempts: number;
    won: boolean;
}

interface Appearance {
    mode: string;
    dayIdx: number;
}

const props = defineProps<{
    targetType: string;
    targetKey: string;
    /** Language code for result lookups */
    lang?: string;
    /** Word appearances — used to look up game results for badges */
    appearances?: Appearance[];
}>();

const { loggedIn, user } = useAuth();
const { openLoginModal } = useLoginModal();
const { showToast } = useToast();

// Serialize appearances for API query param: "classic:1756,quordle:42"
const appearancesParam = computed(() =>
    (props.appearances ?? []).map((a) => `${a.mode}:${a.dayIdx}`).join(',')
);

// ── Fetch comments ─────────────────────────────────────────────────────
interface CommentEntry {
    id: string;
    body: string;
    username: string;
    avatarUrl: string | null;
    createdAt: string;
    badges: Badge[];
}

const { data: commentData } = await useFetch<{
    comments: CommentEntry[];
    total: number;
    hasMore: boolean;
}>('/api/comments', {
    query: {
        targetType: props.targetType,
        targetKey: props.targetKey,
        lang: props.lang || '',
        appearances: appearancesParam,
    },
    watch: [() => props.targetKey],
    default: () => ({ comments: [], total: 0, hasMore: false }),
});

const comments = computed(() => commentData.value?.comments ?? []);
const total = computed(() => commentData.value?.total ?? 0);
const displayComments = computed(() => [...comments.value].reverse());

// ── Post comment ───────────────────────────────────────────────────────
const draft = ref('');
const posting = ref(false);
const error = ref('');

const canPost = computed(() => draft.value.trim().length >= 1 && !posting.value);

async function postComment() {
    if (!canPost.value) return;

    posting.value = true;
    error.value = '';

    try {
        const newComment = await $fetch<CommentEntry>('/api/comments', {
            method: 'POST',
            body: {
                targetType: props.targetType,
                targetKey: props.targetKey,
                body: draft.value.trim(),
                lang: props.lang || '',
                appearances: appearancesParam.value,
            },
        });
        commentData.value!.comments.unshift(newComment);
        commentData.value!.total++;
        draft.value = '';
    } catch (e: any) {
        const msg = e.data?.message || e.statusMessage || 'Failed to post comment.';
        if (e.statusCode === 422) {
            error.value = msg;
        } else if (e.statusCode === 429) {
            error.value = 'Slow down — try again in a few minutes.';
        } else {
            error.value = msg;
        }
    } finally {
        posting.value = false;
    }
}

// ── Badge formatting ───────────────────────────────────────────────────
function badgeText(badge: Badge): string {
    if (badge.mode === 'semantic') {
        return `${badge.attempts} guesses`;
    }
    const config = GAME_MODE_CONFIG[badge.mode as GameMode];
    const maxGuesses = config?.maxGuesses ?? 6;
    return badge.won ? `${badge.attempts}/${maxGuesses}` : `X/${maxGuesses}`;
}

function badgeLabel(badge: Badge, allBadges: Badge[]): string | null {
    if (allBadges.length <= 1) return null;
    const config = GAME_MODE_CONFIG[badge.mode as GameMode];
    return config?.label ?? badge.mode;
}

// ── Relative time ──────────────────────────────────────────────────────
function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

// Auto-resize textarea
const textareaRef = ref<HTMLTextAreaElement | null>(null);
function autoResize() {
    const el = textareaRef.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

const userInitial = computed(() =>
    (user.value?.displayName ?? user.value?.email ?? '?').charAt(0).toUpperCase()
);
</script>

<template>
    <section class="comments-section">
        <div class="comments-header">
            <div class="section-label">Discussion</div>
            <div v-if="total > 0" class="comments-count">
                {{ total }} {{ total === 1 ? 'comment' : 'comments' }}
            </div>
        </div>

        <!-- Comment list (newest last for reading order) -->
        <div v-if="comments.length > 0" class="comments-list">
            <div v-for="c in displayComments" :key="c.id" class="comment-item">
                <div class="comment-meta">
                    <img
                        v-if="c.avatarUrl"
                        :src="c.avatarUrl"
                        :alt="c.username"
                        class="comment-avatar"
                        referrerpolicy="no-referrer"
                    />
                    <div v-else class="comment-avatar-fallback">
                        {{ c.username.charAt(0).toUpperCase() }}
                    </div>
                    <span class="comment-author">{{ c.username }}</span>
                    <!-- Badges -->
                    <template v-if="c.badges?.length">
                        <span
                            v-for="b in c.badges"
                            :key="b.mode"
                            class="comment-badge"
                            :class="b.won ? 'badge-won' : 'badge-lost'"
                        >
                            <span v-if="c.badges.length > 1" class="badge-mode">{{
                                badgeLabel(b, c.badges)
                            }}</span>
                            {{ badgeText(b) }}
                        </span>
                    </template>
                    <span class="comment-dot">&middot;</span>
                    <span class="comment-time">{{ relativeTime(c.createdAt) }}</span>
                </div>
                <div class="comment-body">{{ c.body }}</div>
            </div>
        </div>

        <!-- Empty state: merge with sign-in when not logged in -->
        <div v-else class="comments-empty">
            <div class="comments-empty-icon" />
            <div class="comments-empty-title">No comments yet</div>
            <div v-if="loggedIn" class="comments-empty-subtitle">
                Be the first to share your thoughts on this word
            </div>
            <button
                v-else
                class="comments-signin-btn"
                style="margin-top: 8px"
                @click="openLoginModal()"
            >
                Sign in to comment
            </button>
        </div>

        <!-- Input area (signed in) -->
        <div v-if="loggedIn" class="comment-input-section">
            <div class="comment-input-row">
                <img
                    v-if="user?.avatarUrl"
                    :src="user.avatarUrl"
                    alt=""
                    class="comment-avatar"
                    referrerpolicy="no-referrer"
                />
                <div v-else class="comment-avatar-fallback comment-avatar-you">
                    {{ userInitial }}
                </div>
                <textarea
                    ref="textareaRef"
                    v-model="draft"
                    class="comment-textarea"
                    rows="1"
                    placeholder="Add to the discussion..."
                    maxlength="500"
                    :disabled="posting"
                    @input="autoResize"
                    @keydown.meta.enter="postComment"
                    @keydown.ctrl.enter="postComment"
                />
            </div>
            <div v-if="error" class="comment-error">{{ error }}</div>
            <div class="comment-input-footer">
                <span class="comment-charcount">{{ draft.length }}/500</span>
                <button class="comment-submit" :disabled="!canPost" @click="postComment">
                    <Send :size="12" />
                    {{ posting ? 'Posting...' : 'Post' }}
                </button>
            </div>
        </div>

        <!-- Guest prompt: only when there are comments to read but user can't post -->
        <div v-else-if="comments.length" class="comments-guest-prompt">
            <div class="comments-guest-text">Sign in to join the discussion</div>
            <button class="comments-signin-btn" @click="openLoginModal()">Sign in</button>
        </div>
    </section>
</template>

<style scoped>
.comments-section {
    max-width: 640px;
    margin: 0 auto;
}

.comments-header {
    margin-bottom: 24px;
}

.comments-count {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--color-muted);
    text-align: center;
    margin-top: 10px;
}

/* ─── Comment List ─── */
.comments-list {
    display: flex;
    flex-direction: column;
}

.comment-item {
    padding: 16px 0;
    border-bottom: 1px solid var(--color-rule);
}
.comment-item:last-child {
    border-bottom: none;
}

.comment-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}

.comment-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}
.comment-avatar-fallback {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-rule);
    color: var(--color-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 12px;
    flex-shrink: 0;
}
.comment-avatar-you {
    background: var(--color-correct-soft);
    color: var(--color-correct);
}

.comment-author {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 13px;
    color: var(--color-ink);
}

/* ─── Badges ─── */
.comment-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 1px 6px;
    border: 1px solid;
}
.badge-won {
    color: var(--color-correct);
    border-color: var(--color-correct-soft);
    background: var(--color-correct-soft);
}
.badge-lost {
    color: var(--color-accent);
    border-color: var(--color-accent-soft);
    background: var(--color-accent-soft);
}
.badge-mode {
    font-weight: 400;
    opacity: 0.7;
    margin-right: 2px;
}

.comment-time {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--color-muted);
}

.comment-dot {
    color: var(--color-rule);
    font-size: 10px;
}

.comment-body {
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-ink);
    padding-inline-start: 38px;
    white-space: pre-wrap;
    word-break: break-word;
}

/* ─── Input ─── */
.comment-input-section {
    margin-top: 4px;
    padding-top: 20px;
    border-top: 1px solid var(--color-rule);
}

.comment-input-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
}

.comment-textarea {
    flex: 1;
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-ink);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-rule);
    padding: 6px 0;
    resize: none;
    outline: none;
    min-height: 36px;
    transition: border-color 150ms;
}
.comment-textarea::placeholder {
    color: var(--color-muted);
    opacity: 0.6;
}
.comment-textarea:focus {
    border-bottom-color: var(--color-ink);
}

.comment-error {
    font-size: 12px;
    color: var(--color-accent);
    padding-inline-start: 38px;
    margin-top: 6px;
}

.comment-input-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding-inline-start: 38px;
}

.comment-charcount {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-muted);
    opacity: 0.5;
}

.comment-submit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 7px 16px;
    background: var(--color-ink);
    color: var(--color-paper);
    border: 1px solid var(--color-ink);
    cursor: pointer;
    transition: opacity 120ms;
}
.comment-submit:hover:not(:disabled) {
    opacity: 0.85;
}
.comment-submit:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* ─── Empty State ─── */
.comments-empty {
    text-align: center;
    padding: 32px 0;
}

.comments-empty-icon {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 1.5px solid var(--color-rule);
    border-radius: 50%;
    margin-bottom: 14px;
    position: relative;
}
.comments-empty-icon::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    border-right: 1.5px solid var(--color-rule);
    border-bottom: 1.5px solid var(--color-rule);
    background: var(--color-paper);
}

.comments-empty-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-variation-settings: 'opsz' 48;
    font-size: 16px;
    color: var(--color-ink);
    margin-bottom: 4px;
}

.comments-empty-subtitle {
    font-family: var(--font-display);
    font-style: italic;
    font-variation-settings: 'opsz' 20;
    font-size: 13px;
    color: var(--color-muted);
}

/* ─── Guest Prompt ─── */
.comments-guest-prompt {
    text-align: center;
    padding: 20px 0 4px;
    border-top: 1px solid var(--color-rule);
    margin-top: 4px;
}

.comments-guest-text {
    font-family: var(--font-display);
    font-style: italic;
    font-variation-settings: 'opsz' 20;
    font-size: 13px;
    color: var(--color-muted);
    margin-bottom: 12px;
}

.comments-signin-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 8px 20px;
    background: transparent;
    color: var(--color-muted);
    border: 1px solid var(--color-rule);
    cursor: pointer;
    transition: all 120ms;
}
.comments-signin-btn:hover {
    color: var(--color-ink);
    border-color: var(--color-ink);
}
</style>
