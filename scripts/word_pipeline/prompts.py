"""LLM curation prompts for word classification."""

CURATION_SYSTEM_PROMPT = """\
You are a linguist classifying words for Wordle, a daily word puzzle game.
Players must guess a hidden word in 6 tries. Each guess reveals which letters
are correct (green), misplaced (yellow), or absent (gray).

A good daily word is:
- A standalone, common word that native speakers would recognize
- Not a proper noun, abbreviation, or loanword from another language
- Not offensive, vulgar, or controversial
- Not a phrase, expression, or multi-word compound
- Not overly technical or domain-specific
- In its base/dictionary form (not an obscure conjugation)

Classify each word as:
- "daily": Good puzzle answer — common, standalone, recognizable
- "valid": Real word but not daily-quality (too obscure, technical, archaic, or compound)
- "reject": Not a real standalone word (phrase fragment, expression, foreign word, proper noun)

You MUST respond with valid JSON only, no other text."""

CURATION_USER_PROMPT = """\
Language: {language_name} ({language_code})
Script: {script_type}

First, assess your confidence for this language on a scale of 1-5:
1 = barely familiar, 2 = basic knowledge, 3 = intermediate, 4 = good knowledge, 5 = fluent/expert

Then classify each word below. For each word provide:
- "tier": "daily", "valid", or "reject"
- "reason": brief explanation (5-15 words)

Words to classify:
{word_list}

Respond in this exact JSON format:
{{
  "confidence": <1-5>,
  "words": [
    {{"word": "<word>", "tier": "<daily|valid|reject>", "reason": "<explanation>"}},
    ...
  ]
}}"""


def build_curation_prompt(
    lang_code: str,
    lang_name: str,
    words: list[str],
    script_type: str = "Latin",
) -> str:
    """Build the user prompt for a batch of words."""
    word_list = "\n".join(f"- {w}" for w in words)
    return CURATION_USER_PROMPT.format(
        language_name=lang_name,
        language_code=lang_code,
        script_type=script_type,
        word_list=word_list,
    )


# Script type detection based on language code
SCRIPT_TYPES = {
    "ar": "Arabic",
    "fa": "Arabic (Perso-Arabic)",
    "ur": "Arabic (Nastaliq)",
    "ckb": "Arabic (Sorani Kurdish)",
    "he": "Hebrew",
    "hi": "Devanagari",
    "mr": "Devanagari",
    "ne": "Devanagari",
    "bn": "Bengali",
    "pa": "Gurmukhi",
    "ja": "Hiragana",
    "ko": "Hangul",
    "el": "Greek",
    "ka": "Georgian",
    "hy": "Armenian",
    "hyw": "Armenian",
    "mn": "Cyrillic",
    "bg": "Cyrillic",
    "mk": "Cyrillic",
    "ru": "Cyrillic",
    "sr": "Cyrillic",
    "uk": "Cyrillic",
}


def get_script_type(lang_code: str) -> str:
    """Get the script type for a language code."""
    return SCRIPT_TYPES.get(lang_code, "Latin")
