# Hindi Language Data — Sources

## Shabdle (Hindi Wordle)
- URL: https://github.com/kach/shabdle
- License: GPL-2.0
- Usage: Primary word list (83,514 words → 17,495 with exactly 5 grapheme clusters)

## Notes
- Word length is measured in grapheme clusters (aksharas), not Unicode codepoints
- A 5-akshar Hindi word may be 5-10 Unicode codepoints due to combining vowel marks
- `grapheme_mode: true` in language_config.json enables this behavior
