# Wordle Global

[![Tests](https://github.com/Hugo0/wordle/actions/workflows/test.yml/badge.svg)](https://github.com/Hugo0/wordle/actions/workflows/test.yml)
[![Languages](https://img.shields.io/badge/languages-65+-blue)](https://wordle.global)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Hugo0/wordle/pulls)

[wordle.global](https://wordle.global/) — the daily word guessing game in 65+ languages.

## Report a Problem

Found a bad word, a missing character, or a bug? [Open an issue](https://github.com/Hugo0/wordle/issues/new) — include the language and what went wrong.

Common reports:
- **Bad daily word** — offensive, not a real word, too obscure, or from the wrong language
- **Missing keyboard character** — a letter you need isn't on the virtual keyboard
- **Wrong translation** — UI text that doesn't sound natural in your language
- **Bug** — anything broken in the game

## Improve a Language

You don't need to be a developer to help! Native speakers are the best people to improve word lists and translations.

### Fix or improve the word list

Each language has a word list at `webapp/data/languages/{lang}/{lang}_5words.txt` — one word per line. You can [edit it directly on GitHub](https://github.com/Hugo0/wordle/tree/main/webapp/data/languages) (click the pencil icon) to:
- Remove bad words (offensive, obscure, not real)
- Add missing common words
- Fix misspellings

GitHub will walk you through creating a pull request.

### Translate the UI

Each language has translations in `webapp/data/languages/{lang}/language_config.json`. If text is in English when it should be in your language, you can edit the file on GitHub to fix it.

### Add a new language

1. Create a folder: `webapp/data/languages/{lang_code}/`
2. Add a word list: `{lang_code}_5words.txt` (one 5-letter word per line, lowercase)
3. (Optional) Add a keyboard layout, UI translations, and supplement words

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details and dev setup instructions.

## Language Coverage

65 languages supported. 42 have supplement word lists (additional valid guesses), and 38 have frequency-curated daily word lists.

Top languages by total valid words: Hebrew (65K), Arabic (54K), Polish (42K), Breton (22K), Spanish (18K), English (13K), German (12K), Turkish (12K).

## For Developers

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, setup, code style, and guidelines.

```bash
git clone https://github.com/Hugo0/wordle.git && cd wordle
pnpm install && pnpm dev
```

## Credits

- Josh Wardle (original Wordle creator)
- Elizabeth S (inventor of the Wordle grid)
- [Wordles of the World](https://gitlab.com/rwmpelstilzchen/wordles) — community-sourced list of Wordle derivatives
- All [contributors](https://github.com/Hugo0/wordle/graphs/contributors), issue reporters, and language maintainers!

## Data Sources

- [wooorm/dictionaries](https://github.com/wooorm/dictionaries) — most word lists (Hunspell-based, by [Titus Wormer](https://wooorm.com/))
- [FrequencyWords](https://github.com/hermitdave/FrequencyWords) — OpenSubtitles frequency data
- [wordfreq](https://github.com/rspeer/wordfreq) — multi-source word frequency data
- [Kotus](https://kaino.kotus.fi/sanat/nykysuomi/) — Finnish word list

## License

[MIT](LICENSE)
