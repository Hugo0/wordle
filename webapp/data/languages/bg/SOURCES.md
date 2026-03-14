# bg Language Data - Sources

## Sources

### 1. Existing Word List
- **Source**: Community-contributed dictionary
- **URL**: https://github.com/Hugo0/wordle

### 2. FrequencyWords
- **URL**: https://github.com/hermitdave/FrequencyWords
- **License**: MIT (code), CC-BY-SA 4.0 (content)
- **Usage**: Frequency data for daily word ranking and supplement generation

## Modifications

- `bg_daily_words.txt`: Top 2000 most common words from existing word list, ranked by OpenSubtitles frequency
- `bg_5words_supplement.txt`: 15104 additional valid 5-letter words from frequency corpora

## License

The frequency-derived data in this directory is provided under **CC-BY-SA 4.0**, compatible with the FrequencyWords content license.

## Acknowledgments

- **Hermit Dave** ([FrequencyWords](https://github.com/hermitdave/FrequencyWords)) for frequency data derived from OpenSubtitles
