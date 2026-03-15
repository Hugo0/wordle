import { loadAllData } from '../utils/data-loader';

export default defineEventHandler((event) => {
    const data = loadAllData();
    const langLines = [...data.languageCodes]
        .sort()
        .map((lc) => `- [${data.languages[lc]?.language_name}](https://wordle.global/${lc})`)
        .join('\n');

    setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
    return `# Wordle Global

> Free, open-source Wordle in ${data.languageCodes.length}+ languages. A new 5-letter word to guess every day.

Play at https://wordle.global

## Languages

${langLines}

## About

- Each day has a new 5-letter word to guess in 6 tries
- Green = correct letter in correct position
- Yellow = correct letter in wrong position
- Gray = letter not in the word
- Free, no account required, works offline (PWA)
- Open source: https://github.com/Hugo0/wordle
`;
});
