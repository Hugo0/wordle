<script setup lang="ts">
/**
 * Accessibility Statement — /accessibility
 */

useSeoMeta({
    title: 'Accessibility — Wordle Global',
    description:
        'Wordle Global accessibility statement. WCAG 2.1 AA compliant word game in 80+ languages with screen reader support, keyboard navigation, and reduced motion.',
    ogTitle: 'Accessibility — Wordle Global',
    ogDescription:
        'WCAG 2.1 AA compliant word game in 80+ languages with screen reader support, keyboard navigation, and reduced motion.',
    ogUrl: 'https://wordle.global/accessibility',
    ogType: 'website',
    twitterCard: 'summary',
    twitterTitle: 'Accessibility — Wordle Global',
});

useHead({
    htmlAttrs: { lang: 'en' },
    link: [{ rel: 'canonical', href: 'https://wordle.global/accessibility' }],
});
</script>

<template>
    <div class="min-h-screen bg-paper text-ink">
        <main class="max-w-2xl mx-auto px-4 py-8">
            <NuxtLink to="/" class="text-accent hover:underline text-sm"
                >&larr; Back to Wordle Global</NuxtLink
            >

            <h1 class="heading-display text-3xl mt-4 mb-6">Accessibility Statement</h1>

            <p class="mb-4">
                Wordle Global is committed to being accessible to all players, including those who
                use screen readers, keyboard-only navigation, or other assistive technologies. We
                target
                <strong>WCAG 2.1 Level AA</strong> conformance.
            </p>

            <h2 class="heading-section text-xl mt-8 mb-3">What we support</h2>

            <ul class="list-disc pl-6 space-y-2 mb-6">
                <li>
                    <strong>Screen readers:</strong> Game tiles announce their letter and state
                    (correct, present, absent). Guess results are announced via a live region after
                    each submission. Notifications (invalid word, win, lose) use
                    <code>role="alert"</code>.
                </li>
                <li>
                    <strong>Keyboard navigation:</strong> The entire game is playable with a
                    physical keyboard. A "Skip to game" link is available for keyboard users. Modal
                    dialogs are properly labeled with <code>role="dialog"</code>.
                </li>
                <li>
                    <strong>Reduced motion:</strong> All animations (tile flip, bounce, shake, key
                    pop) are disabled when the operating system's "reduce motion" preference is
                    enabled.
                </li>
                <li>
                    <strong>High contrast / colorblind mode:</strong> Available in Settings.
                    Replaces green/yellow with blue/orange for deuteranopia and protanopia.
                </li>
                <li><strong>Dark mode:</strong> Full dark mode support, togglable in Settings.</li>
                <li>
                    <strong>RTL languages:</strong> Hebrew, Arabic, Persian, Kurdish, and Urdu
                    render right-to-left with correct typing direction.
                </li>
                <li>
                    <strong>80+ languages:</strong> Each language has a localized keyboard,
                    diacritic support (long-press for accented characters), and normalized input so
                    accents are optional.
                </li>
            </ul>

            <h2 class="heading-section text-xl mt-8 mb-3">Known limitations</h2>

            <ul class="list-disc pl-6 space-y-2 mb-6">
                <li>
                    Color contrast on green and yellow tiles with white text does not meet the 4.5:1
                    WCAG AA ratio for normal text. We are investigating darker background colors or
                    dark text alternatives.
                </li>
                <li>
                    The diacritic long-press popup (for accented characters) is not yet accessible
                    via keyboard alone. Keyboard users can type diacritics using their operating
                    system's input method (compose keys, dead keys, etc.).
                </li>
                <li>
                    Modal focus trapping is not yet implemented. Tab can escape the modal to
                    background content.
                </li>
            </ul>

            <h2 class="heading-section text-xl mt-8 mb-3">Feedback</h2>

            <p class="mb-4">
                If you encounter an accessibility barrier, please
                <a
                    href="https://github.com/Hugo0/wordle/issues/new?template=bug.yml&labels=bug,accessibility&title=Accessibility:+"
                    class="text-accent hover:underline"
                    >open a GitHub issue</a
                >
                with the "accessibility" label. We take accessibility reports seriously and will
                respond promptly.
            </p>

            <p class="text-sm text-muted mt-8">
                Last updated: March 2026. This statement is reviewed with each major release.
            </p>
        </main>
    </div>
</template>
