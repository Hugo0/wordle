/**
 * SEO content templates for game mode pages.
 *
 * Generates FAQ and HowTo structured data per mode.
 * Uses English templates with interpolated language names.
 * When translated FAQ is added to language configs, useGameSeo
 * will prefer those over these templates.
 */

export interface FaqItem {
    question: string;
    answer: string;
}

export interface HowToStep {
    name: string;
    text: string;
}

interface SeoContentOptions {
    langName: string;
    lang: string;
    boardCount?: number;
    maxGuesses?: number;
}

export function getModeSeoContent(
    mode: string,
    opts: SeoContentOptions
): { faq: FaqItem[]; howToSteps: HowToStep[] } {
    const { langName, lang } = opts;

    switch (mode) {
        case 'classic':
            return {
                faq: [
                    {
                        question: `How do I play Wordle in ${langName}?`,
                        answer: `Visit wordle.global/${lang} to play the daily Wordle in ${langName}. You have 6 tries to guess a 5-letter word. After each guess, tiles turn green (correct letter, correct position), yellow (correct letter, wrong position), or gray (letter not in the word).`,
                    },
                    {
                        question: 'Is there a new puzzle every day?',
                        answer: 'Yes. A new word is chosen each day. Everyone playing in the same language gets the same word, so you can compare results with friends.',
                    },
                    {
                        question: 'Is Wordle Global free?',
                        answer: `Yes. The daily puzzle, unlimited mode, and all game modes are completely free in all ${langName === 'English' ? '80+' : '80+'} languages. No account or download required.`,
                    },
                    {
                        question: 'Can I play more than once a day?',
                        answer: `Yes — try Unlimited mode at wordle.global/${lang}/unlimited for endless games with no waiting. Your daily streak is tracked separately.`,
                    },
                ],
                howToSteps: [
                    {
                        name: 'Type a word',
                        text: `Enter a valid 5-letter word in ${langName} using the on-screen keyboard or your physical keyboard, then press Enter.`,
                    },
                    {
                        name: 'Read the clues',
                        text: 'Green tiles mean the letter is correct and in the right spot. Yellow means the letter is in the word but in the wrong position. Gray means the letter is not in the word.',
                    },
                    {
                        name: 'Solve in 6 tries',
                        text: 'Use the color clues to narrow down the word. You have 6 guesses total. After the puzzle, see your stats and share your result.',
                    },
                ],
            };

        case 'unlimited':
            return {
                faq: [
                    {
                        question: `What is Wordle Unlimited in ${langName}?`,
                        answer: `Wordle Unlimited lets you play as many Wordle games as you want in ${langName}, without waiting for tomorrow's daily puzzle. Each game gives you a new random word to guess in 6 tries.`,
                    },
                    {
                        question: 'Is Wordle Unlimited free?',
                        answer: 'Yes. Wordle Unlimited is completely free to play. No account, no download, no ads during gameplay.',
                    },
                    {
                        question: 'Does unlimited mode count toward my daily streak?',
                        answer: 'No. Unlimited mode has its own separate statistics. Your daily streak is only affected by the daily puzzle.',
                    },
                    {
                        question: 'How many times can I play?',
                        answer: 'There is no limit. You can play as many rounds as you want. After each game, press "Play Again" to get a new word instantly.',
                    },
                    {
                        question: 'What languages can I play Wordle Unlimited in?',
                        answer: 'Wordle Unlimited is available in over 80 languages at wordle.global, including English, Spanish, German, Finnish, Arabic, French, Italian, Portuguese, and many more.',
                    },
                ],
                howToSteps: [
                    {
                        name: 'Start a game',
                        text: `Visit wordle.global/${lang}/unlimited to start playing Wordle Unlimited in ${langName}. A random 5-letter word is chosen for you.`,
                    },
                    {
                        name: 'Guess the word',
                        text: 'Type a valid 5-letter word and press Enter. Green tiles mean the letter is correct and in the right spot. Yellow means the letter is in the word but in the wrong spot. Gray means the letter is not in the word.',
                    },
                    {
                        name: 'Play again instantly',
                        text: 'After solving the word (or using all 6 guesses), press "Play Again" to get a new word immediately. No waiting for tomorrow.',
                    },
                ],
            };

        case 'speed':
            return {
                faq: [
                    {
                        question: `What is Speed Streak in ${langName}?`,
                        answer: `Speed Streak is a timed Wordle mode in ${langName}. You start with 3 minutes on the clock and solve as many words as you can. Solve a word quickly to earn bonus time.`,
                    },
                    {
                        question: 'How does scoring work?',
                        answer: 'You earn points for each word solved. Fewer guesses and faster solves give more points. Build a combo by solving words in a row without failing — up to a 3x multiplier.',
                    },
                    {
                        question: 'What happens when the timer runs out?',
                        answer: 'The game ends and you see your final score, total words solved, max combo, and average guesses. You can play again immediately.',
                    },
                    {
                        question: 'Is Speed Streak free?',
                        answer: 'Yes. Speed Streak is completely free in all 80+ languages. No account or download required.',
                    },
                ],
                howToSteps: [
                    {
                        name: 'Start the timer',
                        text: `Visit wordle.global/${lang}/speed and press Start. You begin with 3 minutes on the clock.`,
                    },
                    {
                        name: 'Solve words quickly',
                        text: 'Each word you solve earns bonus time (+10s to +60s depending on how few guesses you used). Failed words cost you 30 seconds.',
                    },
                    {
                        name: 'Build your combo',
                        text: 'Solve words consecutively to build a combo multiplier (up to 3x). The combo breaks if you fail a word. Try to beat your high score.',
                    },
                ],
            };

        case 'dordle':
            return getMultiBoardFaq(langName, lang, 'Dordle', 2, 7);

        case 'quordle':
            return getMultiBoardFaq(langName, lang, 'Quordle', 4, 9);

        default:
            // Generic multi-board (octordle, sedecordle, duotrigordle)
            return getMultiBoardFaq(
                langName,
                lang,
                mode.charAt(0).toUpperCase() + mode.slice(1),
                opts.boardCount ?? 2,
                opts.maxGuesses ?? 7
            );
    }
}

function getMultiBoardFaq(
    langName: string,
    lang: string,
    modeName: string,
    boardCount: number,
    maxGuesses: number
): { faq: FaqItem[]; howToSteps: HowToStep[] } {
    return {
        faq: [
            {
                question: `What is ${modeName} in ${langName}?`,
                answer: `${modeName} is a multi-board Wordle variant in ${langName}. You solve ${boardCount} Wordle boards at the same time using ${maxGuesses} guesses. Each guess is entered on all unsolved boards simultaneously.`,
            },
            {
                question: `How many guesses do I get in ${modeName}?`,
                answer: `You get ${maxGuesses} guesses to solve all ${boardCount} boards. Once a board is solved, it freezes and you can focus on the remaining boards.`,
            },
            {
                question: `What strategy works best for ${modeName}?`,
                answer: `Start with words that use common letters to gather information on all ${boardCount} boards at once. Pay attention to the split-color keyboard — it shows which letters are correct on which boards.`,
            },
            {
                question: `Is ${modeName} free?`,
                answer: `Yes. ${modeName} is completely free in all 80+ languages. No account or download required. Play as many rounds as you want.`,
            },
        ],
        howToSteps: [
            {
                name: 'Start a game',
                text: `Visit wordle.global/${lang}/${modeName.toLowerCase()} to play ${modeName} in ${langName}. ${boardCount} boards appear with different hidden words.`,
            },
            {
                name: 'Guess across all boards',
                text: `Type a 5-letter word and press Enter. Your guess appears on all ${boardCount} boards at once. Each board shows its own color clues (green, yellow, gray).`,
            },
            {
                name: `Solve all ${boardCount} boards`,
                text: `Solved boards freeze in place. Use the split-color keyboard to track which letters work on which boards. Solve all ${boardCount} within ${maxGuesses} guesses to win.`,
            },
        ],
    };
}
