# Serbian Language Data - Sources

## Sources

### 1. Existing Word List
- **Source**: wooorm/dictionaries (Hunspell)
- **URL**: https://github.com/wooorm/dictionaries

### 2. FrequencyWords
- **URL**: https://github.com/hermitdave/FrequencyWords
- **License**: MIT (code), CC-BY-SA 4.0 (content)
- **Usage**: Frequency data for daily word ranking and supplement generation

## Modifications

- `sr_daily_words.txt`: Top 2000 most common words from existing word list, ranked by OpenSubtitles frequency
- `sr_5words_supplement.txt`: 8 additional valid 5-letter words from FrequencyWords corpus

## License

The frequency-derived data in this directory is provided under **CC-BY-SA 4.0**, compatible with the FrequencyWords content license.

## Acknowledgments

- **wooorm/dictionaries** for the base word list
- **Hermit Dave** ([FrequencyWords](https://github.com/hermitdave/FrequencyWords)) for frequency data derived from OpenSubtitles
