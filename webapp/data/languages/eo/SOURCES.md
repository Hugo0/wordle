# Esperanto Language Data - Sources

## Sources

### Word list

The words are taken from [_ReVo (Reta Vortaro)_](https://github.com/revuloj/revo-fonto/). Derivations with common word endings are also generated and allowed; e.g. while the bare root _hor_ is not a valid word, its forms _horoj_ (hours), _horon_ (hour \[as the direct object]), _horaj_ (hourly \[modifying a plural]), and _horan_ (hourly \[modifying a singular direct object]) are valid words, and allowed because they are 5 letters long.

The frequency data is taken from the corpus [_La Tekstaro de Esperanto_](https://tekstaro.com/); occurrences are counted in their _exact form_.

These data were compiled and processed by Haley Wakamatsu (@haleyhalcyon).

### Frequency data

## Modifications

All dictionaries are from the same source, previously processed for [Intervorto](https://gitlab.com/haleyhalcyon/intervorto/-/blob/master/scripts/freq_tekstaro.tsv?ref_type=heads), newly processed to only contain 5-letter words.
- `eo_daily_words.txt`: Top 999 most frequest words
- `eo_5words.txt`: Top 2772 most frequent words
- `eo_5words_supplement.txt`: The 7188 words that appear at least twice in the Tekstaro

## License

The frequency-derived data in this directory is provided under **CC-BY-SA 4.0**, compatible with the FrequencyWords content license. 
