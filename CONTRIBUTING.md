# Contributing to Wordle Global

Thanks for your interest in contributing! This project supports 65+ languages and we welcome help improving word lists, keyboards, translations, and code.

> **For code contributors**: See [CLAUDE.md](CLAUDE.md) for architecture details, build system, and coding guidelines.

## How to Contribute

### Reporting Issues

- **Bad words**: If a daily word is invalid, offensive, or not a real word, [open an issue](https://github.com/Hugo0/wordle/issues/new) with the language and word.
- **Keyboard problems**: Missing characters, wrong layout, etc.
- **Bugs**: Anything broken in the game.

### Pull Requests

1. Fork the repository
2. Create a branch for your changes
3. Make your changes
4. Submit a pull request

## Contribution Guidelines

### Word Lists

Word lists are stored in `webapp/data/languages/{lang}/{lang}_5words.txt`.

**Good words:**
- Common 5-letter words in the language
- Words that native speakers would recognize
- Nouns, verbs, adjectives in their base/common forms

**Words to avoid:**
- Proper names (people, cities, brands)
- Offensive or inappropriate words
- Abbreviations
- Words from other languages
- Obscure technical terms
- Incorrect conjugations/declensions

### Keyboards

Keyboard layouts are in `webapp/data/languages/{lang}/{lang}_keyboard.json`.

Format:
```json
[
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["⇨", "z", "x", "c", "v", "b", "n", "m", "⌫"]
]
```

- Use `⇨` for Enter and `⌫` for Backspace
- Follow the standard keyboard layout for the language
- Include all characters that appear in the word list

### Translations

UI text is in `webapp/data/languages/{lang}/language_config.json`. Please ensure translations are natural and accurate (not machine-translated).

## License Agreement

**By submitting a pull request, you agree that:**

1. Your contributions are licensed under the [MIT License](LICENSE).
2. You have the right to submit the contribution (it's your original work or you have permission).
3. For word lists and language data, you confirm the data is from a source that permits redistribution, or is your own compilation.

This allows the project to be freely used, modified, and distributed by anyone.

## Language Maintainers

We're looking for native speakers to help maintain specific languages. If you'd like to become a maintainer for your language, open an issue to let us know!

Current maintainers:
- **Gaelic (gd)**: @akerbeltz
- **Te Reo Māori (mi)**: @LeTink

## Questions?

Open an issue or reach out if you have questions about contributing.
