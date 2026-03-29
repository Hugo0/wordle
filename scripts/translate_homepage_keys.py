#!/usr/bin/env python3
"""Translate 8 homepage UI keys for 22 languages."""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "languages"

TRANSLATIONS = {
    "fi": {
        "homepage_tagline": "Maailman sanapeli",
        "homepage_playing_in": "Pelaat kielellä",
        "homepage_change": "vaihda",
        "homepage_choose_language": "Valitse kielesi",
        "homepage_languages_counting": "kieltä ja lisää tulossa — uusia lisätään säännöllisesti.",
        "homepage_search": "Hae kieliä...",
        "homepage_and_more": "& Lisää",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — ja paljon muuta tulossa.",
    },
    "ar": {
        "homepage_tagline": "لعبة الكلمات العالمية",
        "homepage_playing_in": "تلعب بـ",
        "homepage_change": "تغيير",
        "homepage_choose_language": "اختر لغتك",
        "homepage_languages_counting": "لغة ويزداد العدد — يُضاف المزيد بانتظام.",
        "homepage_search": "ابحث عن لغة...",
        "homepage_and_more": "والمزيد",
        "homepage_and_more_desc": "Octordle، Semantic Explorer، Custom Word، Party Mode — والمزيد قريبًا.",
    },
    "de": {
        "homepage_tagline": "Das Wortspiel der Welt",
        "homepage_playing_in": "Du spielst auf",
        "homepage_change": "ändern",
        "homepage_choose_language": "Wähle deine Sprache",
        "homepage_languages_counting": "Sprachen und es werden mehr — regelmäßig kommen neue hinzu.",
        "homepage_search": "Sprachen suchen...",
        "homepage_and_more": "& Mehr",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — und vieles mehr kommt bald.",
    },
    "es": {
        "homepage_tagline": "El juego de palabras del mundo",
        "homepage_playing_in": "Jugando en",
        "homepage_change": "cambiar",
        "homepage_choose_language": "Elige tu idioma",
        "homepage_languages_counting": "idiomas y sumando — se agregan más regularmente.",
        "homepage_search": "Buscar idiomas...",
        "homepage_and_more": "Y más",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — y mucho más próximamente.",
    },
    "pt": {
        "homepage_tagline": "O jogo de palavras do mundo",
        "homepage_playing_in": "Jogando em",
        "homepage_change": "alterar",
        "homepage_choose_language": "Escolha o seu idioma",
        "homepage_languages_counting": "idiomas e contando — mais são adicionados regularmente.",
        "homepage_search": "Pesquisar idiomas...",
        "homepage_and_more": "E mais",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — e muito mais em breve.",
    },
    "fr": {
        "homepage_tagline": "Le jeu de mots du monde",
        "homepage_playing_in": "Vous jouez en",
        "homepage_change": "changer",
        "homepage_choose_language": "Choisissez votre langue",
        "homepage_languages_counting": "langues et ce n'est pas fini — de nouvelles sont ajoutées régulièrement.",
        "homepage_search": "Rechercher une langue...",
        "homepage_and_more": "& Plus",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — et bien plus à venir.",
    },
    "it": {
        "homepage_tagline": "Il gioco di parole del mondo",
        "homepage_playing_in": "Stai giocando in",
        "homepage_change": "cambia",
        "homepage_choose_language": "Scegli la tua lingua",
        "homepage_languages_counting": "lingue e altre in arrivo — ne aggiungiamo regolarmente.",
        "homepage_search": "Cerca lingue...",
        "homepage_and_more": "E altro",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — e molto altro in arrivo.",
    },
    "tr": {
        "homepage_tagline": "Dünyanın kelime oyunu",
        "homepage_playing_in": "Şu dilde oynuyorsun:",
        "homepage_change": "değiştir",
        "homepage_choose_language": "Dilini seç",
        "homepage_languages_counting": "dil ve artıyor — düzenli olarak yenileri ekleniyor.",
        "homepage_search": "Dil ara...",
        "homepage_and_more": "ve Daha",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — ve çok daha fazlası yakında.",
    },
    "pl": {
        "homepage_tagline": "Światowa gra słowna",
        "homepage_playing_in": "Grasz w języku",
        "homepage_change": "zmień",
        "homepage_choose_language": "Wybierz swój język",
        "homepage_languages_counting": "języków i wciąż przybywa — nowe dodawane regularnie.",
        "homepage_search": "Szukaj języków...",
        "homepage_and_more": "I więcej",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — i wiele więcej wkrótce.",
    },
    "nl": {
        "homepage_tagline": "Het woordspel van de wereld",
        "homepage_playing_in": "Je speelt in het",
        "homepage_change": "wijzigen",
        "homepage_choose_language": "Kies je taal",
        "homepage_languages_counting": "talen en er komen er meer bij — regelmatig worden er nieuwe toegevoegd.",
        "homepage_search": "Zoek talen...",
        "homepage_and_more": "& Meer",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — en nog veel meer binnenkort.",
    },
    "nb": {
        "homepage_tagline": "Verdens ordspill",
        "homepage_playing_in": "Du spiller på",
        "homepage_change": "endre",
        "homepage_choose_language": "Velg språket ditt",
        "homepage_languages_counting": "språk og stadig flere — nye legges til jevnlig.",
        "homepage_search": "Søk etter språk...",
        "homepage_and_more": "& Mer",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — og mye mer kommer snart.",
    },
    "he": {
        "homepage_tagline": "משחק המילים של העולם",
        "homepage_playing_in": "משחק ב",
        "homepage_change": "שינוי",
        "homepage_choose_language": "בחרו את השפה שלכם",
        "homepage_languages_counting": "שפות ועוד נוספות — שפות חדשות מתווספות באופן קבוע.",
        "homepage_search": "חיפוש שפות...",
        "homepage_and_more": "ועוד",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — ועוד הרבה בקרוב.",
    },
    "ko": {
        "homepage_tagline": "전 세계의 단어 게임",
        "homepage_playing_in": "플레이 언어:",
        "homepage_change": "변경",
        "homepage_choose_language": "언어를 선택하세요",
        "homepage_languages_counting": "개 언어 지원 중 — 새로운 언어가 정기적으로 추가됩니다.",
        "homepage_search": "언어 검색...",
        "homepage_and_more": "그 외",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — 더 많은 모드가 곧 추가됩니다.",
    },
    "ja": {
        "homepage_tagline": "世界のワードゲーム",
        "homepage_playing_in": "プレイ中の言語：",
        "homepage_change": "変更",
        "homepage_choose_language": "言語を選択してください",
        "homepage_languages_counting": "の言語に対応 — 新しい言語が定期的に追加されます。",
        "homepage_search": "言語を検索...",
        "homepage_and_more": "その他",
        "homepage_and_more_desc": "Octordle、Semantic Explorer、Custom Word、Party Mode — さらに多くのモードが近日登場。",
    },
    "el": {
        "homepage_tagline": "Το παιχνίδι λέξεων του κόσμου",
        "homepage_playing_in": "Παίζεις στα",
        "homepage_change": "αλλαγή",
        "homepage_choose_language": "Επιλέξτε τη γλώσσα σας",
        "homepage_languages_counting": "γλώσσες και αυξάνονται — νέες προστίθενται τακτικά.",
        "homepage_search": "Αναζήτηση γλωσσών...",
        "homepage_and_more": "& Άλλα",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — και πολλά ακόμα έρχονται σύντομα.",
    },
    "cs": {
        "homepage_tagline": "Světová slovní hra",
        "homepage_playing_in": "Hraješ v jazyce",
        "homepage_change": "změnit",
        "homepage_choose_language": "Vyber si jazyk",
        "homepage_languages_counting": "jazyků a přibývají — nové přidáváme pravidelně.",
        "homepage_search": "Hledat jazyky...",
        "homepage_and_more": "A více",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — a mnohem více již brzy.",
    },
    "bg": {
        "homepage_tagline": "Световната игра с думи",
        "homepage_playing_in": "Играеш на",
        "homepage_change": "промени",
        "homepage_choose_language": "Изберете вашия език",
        "homepage_languages_counting": "езика и броят расте — нови се добавят редовно.",
        "homepage_search": "Търсене на езици...",
        "homepage_and_more": "И още",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — и още много предстои.",
    },
    "da": {
        "homepage_tagline": "Verdens ordspil",
        "homepage_playing_in": "Du spiller på",
        "homepage_change": "skift",
        "homepage_choose_language": "Vælg dit sprog",
        "homepage_languages_counting": "sprog og flere kommer til — nye tilføjes løbende.",
        "homepage_search": "Søg efter sprog...",
        "homepage_and_more": "& Mere",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — og meget mere på vej.",
    },
    "hr": {
        "homepage_tagline": "Svjetska igra riječima",
        "homepage_playing_in": "Igraš na",
        "homepage_change": "promijeni",
        "homepage_choose_language": "Odaberite svoj jezik",
        "homepage_languages_counting": "jezika i sve više — novi se redovito dodaju.",
        "homepage_search": "Pretraži jezike...",
        "homepage_and_more": "I više",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — i još mnogo toga uskoro.",
    },
    "hu": {
        "homepage_tagline": "A világ szójátéka",
        "homepage_playing_in": "Játék nyelve:",
        "homepage_change": "módosítás",
        "homepage_choose_language": "Válaszd ki a nyelvedet",
        "homepage_languages_counting": "nyelv és egyre több — rendszeresen bővül a lista.",
        "homepage_search": "Nyelvek keresése...",
        "homepage_and_more": "És még",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — és még sok más hamarosan.",
    },
    "ru": {
        "homepage_tagline": "Мировая игра в слова",
        "homepage_playing_in": "Вы играете на",
        "homepage_change": "изменить",
        "homepage_choose_language": "Выберите свой язык",
        "homepage_languages_counting": "языков и число растёт — новые добавляются регулярно.",
        "homepage_search": "Поиск языков...",
        "homepage_and_more": "И ещё",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — и многое другое уже скоро.",
    },
    "sv": {
        "homepage_tagline": "Världens ordspel",
        "homepage_playing_in": "Du spelar på",
        "homepage_change": "ändra",
        "homepage_choose_language": "Välj ditt språk",
        "homepage_languages_counting": "språk och fler tillkommer — nya läggs till regelbundet.",
        "homepage_search": "Sök språk...",
        "homepage_and_more": "& Mer",
        "homepage_and_more_desc": "Octordle, Semantic Explorer, Custom Word, Party Mode — och mycket mer kommer snart.",
    },
}

KEYS = [
    "homepage_tagline",
    "homepage_playing_in",
    "homepage_change",
    "homepage_choose_language",
    "homepage_languages_counting",
    "homepage_search",
    "homepage_and_more",
    "homepage_and_more_desc",
]


def main():
    for lang, translations in TRANSLATIONS.items():
        config_path = DATA_DIR / lang / "language_config.json"
        if not config_path.exists():
            print(f"SKIP {lang}: no language_config.json")
            continue

        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        if "ui" not in config:
            print(f"SKIP {lang}: no 'ui' section")
            continue

        for key in KEYS:
            config["ui"][key] = translations[key]

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=4)
            f.write("\n")

        print(f'{lang}: homepage_tagline = "{config["ui"]["homepage_tagline"]}"')

    print(f"\nDone! Updated {len(TRANSLATIONS)} languages.")


if __name__ == "__main__":
    main()
