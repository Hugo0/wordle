from flask import (
    Flask,
    render_template,
    make_response,
)  # These are all we need for our purposes
import json

import datetime
import glob
import random

# set random seed 42 for reproducibility (important to maintain stable word lists)
random.seed(42)

app = Flask(__name__)

###############################################################################
# DATA
###############################################################################
print("Loading data...")

data_dir = "data/"
# if not glob.glob(data_dir):
#     data_dir = "../data/"
# if not glob.glob(data_dir):
#     data_dir = "webapp/data/"
# print(f"data_dir: {data_dir}")


# load other_wordles.json file
with open(f"{data_dir}other_wordles.json", "r") as f:
    other_wordles = json.load(f)


def load_characters(lang):
    if not glob.glob(f"{data_dir}languages/{lang}/{lang}_characters.txt"):
        characters = set()
        with open(f"{data_dir}languages/{lang}/{lang}_5words.txt", "r") as f:
            for line in f:
                characters.update(line.strip())
        with open(f"{data_dir}languages/{lang}/{lang}_characters.txt", "w") as f:
            # sort characters
            characters = sorted(characters)
            # write char per newline
            for char in characters:
                f.write(char + "\n")

    with open(f"{data_dir}languages/{lang}/{lang}_characters.txt", "r") as f:
        characters = [line.strip() for line in f]
    return characters


language_codes = [f.split("/")[-1] for f in glob.glob(f"{data_dir}/languages/*")]
language_characters = {lang: load_characters(lang) for lang in language_codes}


def load_words(lang):
    """loads the words and does some basic QA"""
    _5words = []
    with open(f"{data_dir}/languages/{lang}/{lang}_5words.txt", "r") as f:
        for line in f:
            _5words.append(line.strip())
    # QA
    _5words = [word.lower() for word in _5words if len(word) == 5 and word.isalpha()]
    # remove words without correct characters
    _5words = [
        word
        for word in _5words
        if all([char in language_characters[lang] for char in word])
    ]

    # we don't want words in order, so if .txt is not pre-shuffled, shuffle
    last_letter = ""
    n_in_order = 0
    for word in _5words:
        letter = word[0]
        # check if sorted
        if letter <= last_letter:
            n_in_order += 1
        last_letter = letter
    # if 80% of words are in order, then we consider the list sorted and we shuffle it deterministically
    if n_in_order / len(_5words) > 0.8:
        random.shuffle(_5words)
        print(f"{lang} words are sorted, shuffling")
    return _5words


def load_supplemental_words(lang):
    """loads the supplemental words file if it exists"""
    try:
        with open(f"{data_dir}languages/{lang}/{lang}_5words_supplement.txt", "r") as f:
            supplemental_words = [line.strip() for line in f]
        supplemental_words = [
            word
            for word in supplemental_words
            if all([char in language_characters[lang] for char in word])
        ]
    except FileNotFoundError:
        supplemental_words = []
    return supplemental_words


def load_language_config(lang):
    try:
        with open(f"{data_dir}languages/{lang}/language_config.json", "r") as f:
            language_config = json.load(f)
        return language_config
    except:
        # english is fallback (not ideal but better than empty...)
        with open(f"{data_dir}default_language_config.json", "r") as f:
            language_config = json.load(f)
        return language_config


def load_keyboard(lang):
    try:
        with open(f"{data_dir}languages/{lang}/{lang}_keyboard.json", "r") as f:
            keyboard = json.load(f)
        return keyboard
    except:
        return []


def get_todays_idx():
    n_days = (datetime.datetime.utcnow() - datetime.datetime(1970, 1, 1)).days
    idx = n_days - 18992 + 195
    return idx


language_codes_5words = {l_code: load_words(l_code) for l_code in language_codes}
language_codes_5words_supplements = {
    l_code: load_supplemental_words(l_code) for l_code in language_codes
}
language_configs = {l_code: load_language_config(l_code) for l_code in language_codes}

keyboards = {k: load_keyboard(k) for k in language_codes}


def load_languages():
    """returns a dict of language codes mapped to their english name and native name"""

    languages = {}
    # for each language folder, get the language config.name and config.name_natove
    for lang in language_codes:
        language_config = language_configs[lang]
        languages[lang] = {
            "language_name": language_config["name"],
            "language_name_native": language_config["name_native"],
            "language_code": lang,
        }
    return languages


languages = load_languages()

# status
with open("../scripts/out/status_list.txt", "r") as f:
    status_list = [line.strip() for line in f]
    status_list_str = ""
    for status in status_list:
        status_list_str += (
            f"<option value='{status}'>{status}{'&nbsp;'*(20-len(status))}</option>"
        )
    status_list_str += (
        "<a href='https://github.com/Hugo0/wordle' target='_blank'>more at Github</a>"
    )

# print stats about how many languages we have
print("\n***********************************************")
print(f"                    STATS")
print(f"- {len(languages)} languages")
print(
    f"- {len([k for (k, v) in language_codes_5words_supplements.items() if v !=[]])} languages with supplemental words"
)
print(
    f"- The language with least words is {min(language_codes_5words, key=lambda k: len(language_codes_5words[k]))}, with {len(language_codes_5words[min(language_codes_5words, key=lambda k: len(language_codes_5words[k]))])} words"
)
print(
    f"- The language with most words is {max(language_codes_5words, key=lambda k: len(language_codes_5words[k]))}, with {len(language_codes_5words[max(language_codes_5words, key=lambda k: len(language_codes_5words[k]))])} words"
)
print(
    f"- Average number of words per language is {sum(len(language_codes_5words[l_code]) for l_code in language_codes)/len(language_codes):.2f}"
)
print(
    f"- Average length of supplemental words per language is {sum(len(language_codes_5words_supplements[l_code]) for l_code in language_codes)/len(language_codes):.2f}"
)
print(f"- There are {len(other_wordles)} other wordles")
print(f"***********************************************\n")


###############################################################################
# CLASSES
###############################################################################


class Language:
    """Holds the attributes of a language"""

    def __init__(self, language_code, word_list):
        self.language_code = language_code
        self.word_list = word_list
        self.word_list_supplement = language_codes_5words_supplements[language_code]
        todays_idx = get_todays_idx()
        self.daily_word = word_list[todays_idx % len(word_list)]
        self.todays_idx = todays_idx
        self.config = language_configs[language_code]

        self.characters = language_characters[language_code]
        # remove chars that aren't used to reduce bloat a bit
        characters_used = []
        for word in self.word_list:
            characters_used += list(word)
        characters_used = list(set(characters_used))
        self.characters = [char for char in self.characters if char in characters_used]

        self.keyboard = keyboards[language_code]
        if self.keyboard == []:  # if no keyboard defined, then use available chars
            # keyboard of ten characters per row
            for i, c in enumerate(self.characters):
                if i % 10 == 0:
                    self.keyboard.append([])
                self.keyboard[-1].append(c)
            self.keyboard[-1].insert(0, "⇨")
            self.keyboard[-1].append("⌫")

            # Deal with bottom row being too crammed:
            if len(self.keyboard[-1]) == 11:
                popped_c = self.keyboard[-1].pop(1)
                self.keyboard[-2].insert(-1, popped_c)
            if len(self.keyboard[-1]) == 12:
                popped_c = self.keyboard[-2].pop(0)
                self.keyboard[-3].insert(-1, popped_c)
                popped_c = self.keyboard[-1].pop(2)
                self.keyboard[-2].insert(-1, popped_c)
                popped_c = self.keyboard[-1].pop(2)
                self.keyboard[-2].insert(-1, popped_c)


###############################################################################
# ROUTES
###############################################################################


@app.route("/")
def index():
    return render_template(
        "index.html",
        languages=languages,
        language_codes=language_codes,
        todays_idx=get_todays_idx(),
        other_wordles=other_wordles,
    )


@app.route("/stats")
def stats():
    return status_list_str


# sitemap
@app.route("/sitemap.xml")
def site_map():
    response = make_response(
        render_template(
            "sitemap.xml", languages=languages, base_url="https://wordle.global"
        )
    )
    response.headers["Content-Type"] = "application/xml"
    return response


# arbitrary app route
@app.route("/<lang_code>")
def language(lang_code):
    if lang_code not in language_codes:
        return "Language not found"
    word_list = language_codes_5words[lang_code]
    language = Language(lang_code, word_list)
    return render_template("game.html", language=language)


if __name__ == "__main__":
    app.run()
