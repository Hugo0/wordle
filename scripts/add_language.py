#!/usr/bin/env python3
"""
Bootstrap new languages for Wordle Global.

Creates all required files for a new language:
1. {lang}_5words.txt — word list from FrequencyWords + wordfreq
2. {lang}_characters.txt — unique characters from word list
3. {lang}_keyboard.json — keyboard layout
4. language_config.json — translated UI, SEO metadata

Usage:
    python scripts/add_language.py create id          # Create Indonesian
    python scripts/add_language.py create id ms tl    # Create multiple
    python scripts/add_language.py create --all       # Create all defined languages
    python scripts/add_language.py list               # List available languages
    python scripts/add_language.py create id --dry-run  # Preview without writing
"""

import argparse
import json
import random
import re
import sys
from pathlib import Path

from improve_word_lists import load_frequency_data

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "webapp" / "data" / "languages"
EN_KEYBOARD_PATH = DATA_DIR / "en" / "en_keyboard.json"

# Cache for keyboard JSON files (avoid re-reading per language)
_keyboard_cache: dict[str, dict] = {}


# ── Script/character filters ─────────────────────────────────────────────────

# Define allowed Unicode script ranges per script type
SCRIPT_FILTERS = {
    "latin": re.compile(r"^[\u0041-\u024F\u1E00-\u1EFF\u0180-\u01BF\u0250-\u02AF]+$"),
    "latin_basic": re.compile(r"^[a-zçëñ]+$"),  # Albanian, basic Latin+diacritics
    "latin_yoruba": re.compile(r"^[a-zẹọṣàáèéìíòóùú]+$"),
    "latin_hausa": re.compile(r"^[a-zɓɗƙ]+$"),
    "latin_uzbek": re.compile(r"^[a-zoʻgʻ]+$"),
    "devanagari": re.compile(r"^[\u0900-\u097F]+$"),
    "perso-arabic": re.compile(r"^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+$"),
}


def is_valid_script(word: str, script_type: str) -> bool:
    """Check if a word uses characters from the expected script."""
    pattern = SCRIPT_FILTERS.get(script_type)
    if pattern:
        return bool(pattern.match(word))
    # Fallback: just check it's alphabetic
    return word.isalpha()


# ── Language definitions ──────────────────────────────────────────────────────

LANGUAGES = {
    # ── Batch 1: Latin script ──
    "id": {
        "name": "Indonesian",
        "native": "Bahasa Indonesia",
        "script": "latin",
        "rtl": False,
        "timezone": "Asia/Jakarta",
        "freq_code": "id",
        "wordfreq_code": "id",
        "config": {
            "meta": {
                "locale": "id",
                "wordle_native": "Wordle",
                "title": "Permainan kata harian",
                "description": "Tebak kata tersembunyi dalam 6 percobaan (atau kurang). Teka-teki baru tersedia setiap hari!",
                "keywords": "Indonesia, teka-teki, kata, main, permainan, online, tebak, harian",
            },
            "text": {
                "subheader": "Bahasa Indonesia",
                "next_word": "Kata berikutnya",
                "no_attempts": "Anda belum mencoba kata apapun!",
                "share": "Bagikan",
                "shared": "Dibagikan!",
                "copied": "Disalin!",
                "notification-copied": "Disalin ke papan klip",
                "notification-word-not-valid": "Kata tidak valid",
                "notification-partial-word": "Masukkan kata lengkap",
            },
            "help": {
                "title": "Cara Bermain",
                "title_2": "Contoh",
                "close": "Tutup",
                "text_1_1_1": "Tebak",
                "text_1_1_2": "dalam enam percobaan atau kurang.",
                "text_1_2": "Setiap tebakan harus berupa kata lima huruf yang valid. Tekan tombol enter untuk mengirim tebakan.",
                "text_1_3": "Setelah menebak, ubin akan berubah warna untuk menunjukkan huruf mana yang benar atau hampir benar.",
                "text_2_1": "ada dalam kata dan di posisi yang tepat!",
                "text_2_2": "ada dalam kata, tapi bukan di posisi yang tepat.",
                "text_2_3": "tidak ada dalam kata yang Anda coba tebak.",
                "text_3": "Kata baru tersedia setiap hari!",
            },
            "ui": {
                "settings": "Pengaturan",
                "dark_mode": "Mode Gelap",
                "dark_mode_desc": "Ubah tema gelap",
                "haptic_feedback": "Umpan Balik Haptic",
                "haptic_feedback_desc": "Getar saat sentuh",
                "sound_effects": "Efek Suara",
                "sound_effects_desc": "Suara menang/kalah",
                "right_to_left": "Kanan ke kiri",
                "keyboard_layout": "Tata letak keyboard",
                "easy_mode": "Izinkan semua kata",
                "easy_mode_label": "mode mudah",
                "install_app": "Instal Aplikasi",
                "install_app_desc": "Main offline & dapatkan ikon",
                "report_issue": "Laporkan Masalah",
                "view_source": "Lihat Kode Sumber",
                "guess_distribution": "Distribusi Tebakan",
                "games": "Permainan",
                "win_percent": "% Menang",
                "streak": "Beruntun",
                "best": "Terbaik",
                "all_languages": "Semua Bahasa",
                "languages": "Bahasa",
                "play_more_languages": "Main lebih banyak bahasa untuk melihat statistik global!",
                "add_to_home": "Tambah ke Layar Utama",
                "play_daily_like_app": "Main Wordle harian seperti aplikasi",
                "install": "Instal",
                "close": "tutup",
                "about": "Tentang",
                "global_stats": "Statistik Global",
                "games_played": "Permainan Dimainkan",
                "win_rate": "Rasio Menang",
                "current_streak": "Beruntun Saat Ini",
                "languages_won": "Bahasa Dimenangkan",
                "best_overall_streak": "Beruntun Terbaik Keseluruhan",
                "best_active_streak": "Beruntun Aktif Terbaik",
                "your_languages": "Bahasa Anda",
                "no_games_yet": "Anda belum bermain. Pilih bahasa untuk mulai!",
                "wins": "Menang",
                "losses": "Kalah",
                "avg_attempts": "Rata-rata Percobaan",
                "best_streak": "Beruntun Terbaik",
                "play": "Main",
                "search_language": "Cari bahasa...",
                "external_links": "Tautan Eksternal",
                "coming_soon": "segera hadir!",
                "game": "permainan",
                "games_lowercase": "permainan",
                "show_definitions": "Tampilkan Definisi",
                "show_definitions_desc": "Tampilkan arti kata setelah permainan",
                "definition": "Definisi",
                "look_up_on_wiktionary": "Cari di Wiktionary",
                "word_art": "Seni Kata",
                "word_art_desc": "Ilustrasi AI kata harian",
            },
        },
    },
    "ms": {
        "name": "Malay",
        "native": "Bahasa Melayu",
        "script": "latin",
        "rtl": False,
        "timezone": "Asia/Kuala_Lumpur",
        "freq_code": "ms",
        "wordfreq_code": "ms",
        "config": {
            "meta": {
                "locale": "ms",
                "wordle_native": "Wordle",
                "title": "Permainan perkataan harian",
                "description": "Teka perkataan tersembunyi dalam 6 percubaan (atau kurang). Teka-teki baharu setiap hari!",
                "keywords": "Melayu, teka-teki, perkataan, main, permainan, dalam talian, teka, harian",
            },
            "text": {
                "subheader": "Bahasa Melayu",
                "next_word": "Perkataan seterusnya",
                "no_attempts": "Anda belum mencuba sebarang perkataan!",
                "share": "Kongsi",
                "shared": "Dikongsi!",
                "copied": "Disalin!",
                "notification-copied": "Disalin ke papan klip",
                "notification-word-not-valid": "Perkataan tidak sah",
                "notification-partial-word": "Sila masukkan perkataan penuh",
            },
            "help": {
                "title": "Cara Bermain",
                "title_2": "Contoh",
                "close": "Tutup",
                "text_1_1_1": "Teka",
                "text_1_1_2": "dalam enam percubaan atau kurang.",
                "text_1_2": "Setiap tekaan mestilah perkataan lima huruf yang sah. Tekan butang enter untuk menghantar tekaan.",
                "text_1_3": "Selepas meneka, jubin akan bertukar warna untuk menunjukkan huruf mana yang betul atau hampir betul.",
                "text_2_1": "terdapat dalam perkataan dan di kedudukan yang betul!",
                "text_2_2": "terdapat dalam perkataan, tetapi bukan di kedudukan yang betul.",
                "text_2_3": "tidak terdapat dalam perkataan yang anda cuba teka.",
                "text_3": "Perkataan baharu tersedia setiap hari!",
            },
            "ui": {
                "settings": "Tetapan",
                "dark_mode": "Mod Gelap",
                "dark_mode_desc": "Tukar tema gelap",
                "haptic_feedback": "Maklum Balas Haptic",
                "haptic_feedback_desc": "Getaran semasa sentuh",
                "sound_effects": "Kesan Bunyi",
                "sound_effects_desc": "Bunyi menang/kalah",
                "keyboard_layout": "Susun atur papan kekunci",
                "easy_mode": "Benarkan semua perkataan",
                "easy_mode_label": "mod mudah",
                "install_app": "Pasang Aplikasi",
                "install_app_desc": "Main luar talian & dapatkan ikon",
                "report_issue": "Laporkan Masalah",
                "view_source": "Lihat Kod Sumber",
                "guess_distribution": "Taburan Tekaan",
                "games": "Permainan",
                "win_percent": "% Menang",
                "streak": "Berturut-turut",
                "best": "Terbaik",
                "all_languages": "Semua Bahasa",
                "languages": "Bahasa",
                "play": "Main",
                "search_language": "Cari bahasa...",
                "definition": "Definisi",
                "look_up_on_wiktionary": "Cari di Wiktionary",
            },
        },
    },
    "tl": {
        "name": "Tagalog",
        "native": "Tagalog",
        "script": "latin",
        "rtl": False,
        "timezone": "Asia/Manila",
        "freq_code": "tl",
        "wordfreq_code": "fil",  # wordfreq uses Filipino code for Tagalog
        "extra_chars": ["ñ"],
        "config": {
            "meta": {
                "locale": "tl",
                "wordle_native": "Wordle",
                "title": "Pang-araw-araw na laro ng salita",
                "description": "Hulaan ang nakatagong salita sa 6 na pagsubok (o mas kaunti). May bagong palaisipan araw-araw!",
                "keywords": "Tagalog, Filipino, palaisipan, salita, laro, online, hulaan, araw-araw",
            },
            "text": {
                "subheader": "Tagalog",
                "next_word": "Susunod na salita",
                "no_attempts": "Wala ka pang sinusubukang salita!",
                "share": "Ibahagi",
                "shared": "Naibahagi!",
                "copied": "Nakopya!",
                "notification-copied": "Nakopya sa clipboard",
                "notification-word-not-valid": "Hindi valid ang salita",
                "notification-partial-word": "Maglagay ng buong salita",
            },
            "help": {
                "title": "Paano Maglaro",
                "title_2": "Mga Halimbawa",
                "close": "Isara",
                "text_1_1_1": "Hulaan ang",
                "text_1_1_2": "sa anim na pagsubok o mas kaunti.",
                "text_1_2": "Ang bawat hula ay dapat valid na limang titik na salita. Pindutin ang enter para isumite.",
                "text_1_3": "Pagkatapos hulaan, magbabago ang kulay ng mga tile para ipakita kung aling mga titik ang tama o halos tama.",
                "text_2_1": "nasa salita at nasa tamang posisyon!",
                "text_2_2": "nasa salita, pero hindi nasa tamang posisyon.",
                "text_2_3": "wala sa salitang sinusubukan mong hulaan.",
                "text_3": "May bagong salita araw-araw!",
            },
            "ui": {
                "settings": "Mga Setting",
                "dark_mode": "Dark Mode",
                "dark_mode_desc": "I-toggle ang dark theme",
                "keyboard_layout": "Layout ng keyboard",
                "easy_mode": "Payagan lahat ng salita",
                "easy_mode_label": "madaling mode",
                "install_app": "I-install ang App",
                "games": "Mga Laro",
                "win_percent": "% Panalo",
                "streak": "Sunud-sunod",
                "best": "Pinakamahusay",
                "all_languages": "Lahat ng Wika",
                "languages": "Mga Wika",
                "play": "Maglaro",
                "search_language": "Maghanap ng wika...",
                "definition": "Kahulugan",
                "look_up_on_wiktionary": "Hanapin sa Wiktionary",
            },
        },
    },
    "sq": {
        "name": "Albanian",
        "native": "Shqip",
        "script": "latin",
        "script_filter": "latin_basic",
        "rtl": False,
        "timezone": "Europe/Tirane",
        "freq_code": "sq",
        "wordfreq_code": None,  # wordfreq falls back to English for sq
        "extra_chars": ["ç", "ë"],
        "config": {
            "meta": {
                "locale": "sq",
                "wordle_native": "Wordle",
                "title": "Loja ditore e fjalëve",
                "description": "Gjeni fjalën e fshehur në 6 përpjekje (ose më pak). Një enigmë e re çdo ditë!",
                "keywords": "shqip, enigmë, fjalë, lojë, online, gjej, ditore",
            },
            "text": {
                "subheader": "Shqip",
                "next_word": "Fjala tjetër",
                "no_attempts": "Nuk keni provuar asnjë fjalë!",
                "share": "Ndaj",
                "shared": "U nda!",
                "copied": "U kopjua!",
                "notification-copied": "U kopjua në clipboard",
                "notification-word-not-valid": "Fjala nuk është e vlefshme",
                "notification-partial-word": "Shkruani një fjalë të plotë",
            },
            "help": {
                "title": "Si të Luani",
                "title_2": "Shembuj",
                "close": "Mbyll",
                "text_1_1_1": "Gjeni",
                "text_1_1_2": "në gjashtë përpjekje ose më pak.",
                "text_1_2": "Çdo supozim duhet të jetë një fjalë e vlefshme me pesë shkronja. Shtypni butonin enter për ta dërguar.",
                "text_1_3": "Pas supozimit, pllakat ndryshojnë ngjyrë për të treguar cilat shkronja janë të sakta ose pothuajse të sakta.",
                "text_2_1": "është në fjalë dhe në pozicionin e saktë!",
                "text_2_2": "është në fjalë, por jo në pozicionin e saktë.",
                "text_2_3": "nuk është në fjalën që po përpiqeni ta gjeni.",
                "text_3": "Një fjalë e re çdo ditë!",
            },
            "ui": {
                "settings": "Cilësimet",
                "dark_mode": "Modaliteti i Errët",
                "keyboard_layout": "Paraqitja e tastierës",
                "games": "Lojëra",
                "win_percent": "% Fitore",
                "streak": "Radhazi",
                "best": "Më e mira",
                "all_languages": "Të gjitha Gjuhët",
                "languages": "Gjuhët",
                "play": "Luaj",
                "search_language": "Kërko gjuhën...",
                "definition": "Përkufizimi",
                "look_up_on_wiktionary": "Kërko në Wiktionary",
            },
        },
    },
    # ── Batch 2: kaikki-sourced languages ──
    "yo": {
        "name": "Yoruba",
        "native": "Yorùbá",
        "script": "latin",
        "script_filter": "latin_yoruba",
        "rtl": False,
        "timezone": "Africa/Lagos",
        "freq_code": None,
        "wordfreq_code": None,
        "extra_chars": ["ẹ", "ọ", "ṣ"],
        "diacritic_map": {
            "a": ["à", "á"],
            "e": ["è", "é"],
            "ẹ": ["ẹ̀", "ẹ́"],
            "i": ["ì", "í"],
            "o": ["ò", "ó"],
            "ọ": ["ọ̀", "ọ́"],
            "u": ["ù", "ú"],
        },
        "config": {
            "meta": {
                "locale": "yo",
                "wordle_native": "Wordle",
                "title": "Eré ọ̀rọ̀ ojoojúmọ́",
                "description": "Fojú inú wo ọ̀rọ̀ tí a fi pamọ́ ní ìgbìyànjú 6 (tàbí kéréje). Àdánwò tuntun lójoojúmọ́!",
                "keywords": "Yorùbá, àdánwò, ọ̀rọ̀, eré, online, fojú inú wo, ojoojúmọ́",
            },
            "text": {
                "subheader": "Yorùbá",
                "next_word": "Ọ̀rọ̀ tó kàn",
                "no_attempts": "O kò tíì gbìyànjú ọ̀rọ̀ kankan!",
                "share": "Pín",
                "notification-copied": "Ti dà sí clipboard",
                "notification-word-not-valid": "Ọ̀rọ̀ kò tọ́",
                "notification-partial-word": "Jọ̀wọ́ kọ ọ̀rọ̀ kíkún",
            },
            "help": {
                "title": "Bí a ṣe ń ṣeré",
                "title_2": "Àpẹẹrẹ",
                "close": "Pa dé",
                "text_1_1_1": "Fojú inú wo",
                "text_1_1_2": "ní ìgbìyànjú mẹ́fà tàbí kéréje.",
                "text_1_2": "Gbogbo ìgbìyànjú gbọ́dọ̀ jẹ́ ọ̀rọ̀ lẹ́tà márùn-ún tí ó tọ́. Tẹ bọ́tìnnì enter láti fi ránṣẹ́.",
                "text_1_3": "Lẹ́yìn ìgbìyànjú, àwọn tile yóò yí àwọ̀ padà láti fi hàn lẹ́tà wo ló tọ́.",
                "text_2_1": "wà nínú ọ̀rọ̀ náà tí ó sì wà ní ipò tí ó tọ́!",
                "text_2_2": "wà nínú ọ̀rọ̀ náà, ṣùgbọ́n kì í ṣe ní ipò tí ó tọ́.",
                "text_2_3": "kò sí nínú ọ̀rọ̀ tí o ń gbìyànjú láti fojú inú rí.",
                "text_3": "Ọ̀rọ̀ tuntun lójoojúmọ́!",
            },
            "ui": {
                "settings": "Ètò",
                "dark_mode": "Ọ̀nà Dúdú",
                "keyboard_layout": "Ètò bọ́tìnnì",
                "games": "Àwọn Eré",
                "all_languages": "Gbogbo Èdè",
                "languages": "Àwọn Èdè",
                "play": "Ṣeré",
                "search_language": "Wá èdè...",
                "definition": "Ìtumọ̀",
                "look_up_on_wiktionary": "Wá ní Wiktionary",
            },
        },
    },
    "uz": {
        "name": "Uzbek",
        "native": "Oʻzbek",
        "script": "latin",
        "script_filter": "latin_uzbek",
        "rtl": False,
        "timezone": "Asia/Tashkent",
        "freq_code": None,
        "wordfreq_code": None,
        "extra_chars": ["ʻ"],
        "config": {
            "meta": {
                "locale": "uz",
                "wordle_native": "Wordle",
                "title": "Kundalik soʻz oʻyini",
                "description": "Yashirin soʻzni 6 ta urinishda (yoki kamroq) toping. Har kuni yangi topishmoq!",
                "keywords": "oʻzbek, topishmoq, soʻz, oʻyin, onlayn, top, kundalik",
            },
            "text": {
                "subheader": "Oʻzbek",
                "next_word": "Keyingi soʻz",
                "no_attempts": "Siz hali birorta soʻz sinab koʻrmadingiz!",
                "share": "Ulashish",
                "notification-copied": "Buferga nusxalandi",
                "notification-word-not-valid": "Soʻz yaroqsiz",
                "notification-partial-word": "Toʻliq soʻz kiriting",
            },
            "help": {
                "title": "Qanday oʻynash kerak",
                "title_2": "Misollar",
                "close": "Yopish",
                "text_1_1_1": "Toping",
                "text_1_1_2": "olti urinish yoki kamroqda.",
                "text_1_2": "Har bir taxmin besh harfli yaroqli soʻz boʻlishi kerak. Yuborish uchun enter tugmasini bosing.",
                "text_1_3": "Taxmindan soʻng, plitkalar rang oʻzgaradi va qaysi harflar toʻgʻri ekanligini koʻrsatadi.",
                "text_2_1": "soʻzda bor va toʻgʻri joyda!",
                "text_2_2": "soʻzda bor, lekin toʻgʻri joyda emas.",
                "text_2_3": "siz topmoqchi boʻlgan soʻzda yoʻq.",
                "text_3": "Har kuni yangi soʻz!",
            },
            "ui": {
                "settings": "Sozlamalar",
                "dark_mode": "Qorongʻu rejim",
                "keyboard_layout": "Klaviatura tartibi",
                "games": "Oʻyinlar",
                "all_languages": "Barcha tillar",
                "languages": "Tillar",
                "play": "Oʻynash",
                "search_language": "Til qidirish...",
                "definition": "Taʼrif",
                "look_up_on_wiktionary": "Wiktionary'da qidirish",
            },
        },
    },
    # Deferred: ha (Hausa, 435 kaikki words — borderline), om (Oromo, 162 — too few)
    # Deferred: hi (Hindi), mr (Marathi) — need grapheme_mode support (Phase 4)
    # ── Batch 3: Non-Latin ──
    "ur": {
        "name": "Urdu",
        "native": "اردو",
        "script": "perso-arabic",
        "rtl": True,
        "timezone": "Asia/Karachi",
        "freq_code": "ur",
        "wordfreq_code": "ur",
        "ref_keyboard": "fa",
        "urdu_extra_keys": ["ٹ", "ڈ", "ڑ", "ں", "ے", "ھ"],
        "config": {
            "meta": {
                "locale": "ur",
                "wordle_native": "ورڈل",
                "title": "روزانہ لفظ کا کھیل",
                "description": "چھپے ہوئے لفظ کو 6 کوششوں (یا کم) میں پہچانیں۔ ہر روز ایک نئی پہیلی!",
                "keywords": "اردو، پہیلی، لفظ، کھیل، آن لائن، اندازہ، روزانہ",
            },
            "text": {
                "subheader": "اردو",
                "next_word": "اگلا لفظ",
                "no_attempts": "آپ نے ابھی تک کوئی لفظ نہیں آزمایا!",
                "share": "شیئر کریں",
                "shared": "شیئر ہو گیا!",
                "copied": "کاپی ہو گیا!",
                "notification-copied": "کلپ بورڈ پر کاپی ہو گیا",
                "notification-word-not-valid": "لفظ درست نہیں ہے",
                "notification-partial-word": "براہ کرم مکمل لفظ درج کریں",
            },
            "help": {
                "title": "کیسے کھیلیں",
                "title_2": "مثالیں",
                "close": "بند کریں",
                "text_1_1_1": "پہچانیں",
                "text_1_1_2": "چھ کوششوں یا کم میں۔",
                "text_1_2": "ہر اندازہ پانچ حروف کا درست لفظ ہونا چاہیے۔ اندازہ بھیجنے کے لیے انٹر دبائیں۔",
                "text_1_3": "اندازے کے بعد، ٹائلیں رنگ بدلیں گی تاکہ دکھائیں کہ کون سے حروف صحیح ہیں یا تقریباً صحیح۔",
                "text_2_1": "لفظ میں ہے اور صحیح جگہ پر ہے!",
                "text_2_2": "لفظ میں ہے، لیکن صحیح جگہ پر نہیں ہے۔",
                "text_2_3": "جس لفظ کو آپ پہچاننے کی کوشش کر رہے ہیں اس میں نہیں ہے۔",
                "text_3": "ہر روز ایک نیا لفظ دستیاب!",
            },
            "ui": {
                "settings": "ترتیبات",
                "dark_mode": "ڈارک موڈ",
                "dark_mode_desc": "ڈارک تھیم تبدیل کریں",
                "right_to_left": "دائیں سے بائیں",
                "keyboard_layout": "کی بورڈ ترتیب",
                "easy_mode": "تمام الفاظ کی اجازت دیں",
                "easy_mode_label": "آسان موڈ",
                "install_app": "ایپ انسٹال کریں",
                "games": "کھیل",
                "win_percent": "% جیت",
                "streak": "مسلسل",
                "best": "بہترین",
                "all_languages": "تمام زبانیں",
                "languages": "زبانیں",
                "play": "کھیلیں",
                "search_language": "زبان تلاش کریں...",
                "definition": "تعریف",
                "look_up_on_wiktionary": "وکشنری پر دیکھیں",
            },
        },
    },
}


# ── Word list generation ──────────────────────────────────────────────────────
# load_frequency_data is imported from improve_word_lists


def _get_wordfreq_5letter(lang_code: str) -> dict[str, float]:
    """Get 5-letter words from wordfreq. Lighter than improve_word_lists version
    (no char_set needed since we filter by script pattern instead)."""
    try:
        from wordfreq import top_n_list, zipf_frequency
    except ImportError:
        print("  wordfreq not installed, skipping")
        return {}

    words = {}
    try:
        for w in top_n_list(lang_code, 200000):
            w = w.lower()
            if len(w) == 5 and w.isalpha():
                words[w] = zipf_frequency(w, lang_code)
    except LookupError:
        print(f"  wordfreq: no data for {lang_code}")
        return {}

    print(f"  wordfreq: {len(words)} valid 5-letter words")
    return words


def generate_word_list(lang: str, lang_def: dict) -> list[str]:
    """Generate a 5-letter word list from available sources."""
    print(f"\nGenerating word list for {lang} ({lang_def['name']})...")

    script_type = lang_def.get("script_filter", lang_def.get("script", "latin"))
    all_words: dict[str, float] = {}

    # Source 1: FrequencyWords
    freq_code = lang_def.get("freq_code")
    if freq_code:
        freq_data = load_frequency_data(freq_code)
        for word, freq in freq_data.items():
            if len(word) == 5 and word.isalpha() and is_valid_script(word, script_type):
                all_words[word] = freq
        print(
            f"  After FrequencyWords filter (script={script_type}): {len(all_words)} 5-letter words"
        )

    # Source 2: wordfreq
    wf_code = lang_def.get("wordfreq_code")
    if wf_code:
        wf_words = _get_wordfreq_5letter(wf_code)
        added = 0
        for word, zipf in wf_words.items():
            if word not in all_words and is_valid_script(word, script_type):
                # Normalize zipf to comparable scale (zipf 4.0 ≈ freq 10000)
                all_words[word] = 10**zipf
                added += 1
        print(f"  After wordfreq merge (+{added} new): {len(all_words)} total words")

    # Source 3: kaikki.org word lists
    from improve_word_lists import load_kaikki_words, load_leipzig_words

    kaikki = load_kaikki_words(lang)
    if kaikki:
        added = 0
        for word in kaikki:
            if word not in all_words and is_valid_script(word, script_type):
                all_words[word] = 1  # Low default frequency (kaikki has no freq data)
                added += 1
        print(f"  After kaikki merge (+{added} new): {len(all_words)} total words")

    # Source 4: Leipzig Corpora
    leipzig = load_leipzig_words(lang)
    if leipzig:
        added = 0
        for word in leipzig:
            if word not in all_words and is_valid_script(word, script_type):
                all_words[word] = 1
                added += 1
        print(f"  After Leipzig merge (+{added} new): {len(all_words)} total words")

    if not all_words:
        print(f"  WARNING: No words found for {lang}!")
        return []

    # Sort by frequency descending
    sorted_words = sorted(all_words.keys(), key=lambda w: -all_words[w])

    # Shuffle with seed 42 for deterministic daily word selection
    rng = random.Random(42)
    rng.shuffle(sorted_words)

    print(f"  Final word list: {len(sorted_words)} words")
    print(f"  Sample: {sorted_words[:10]}")
    return sorted_words


# ── File generation ───────────────────────────────────────────────────────────


def generate_characters(words: list[str]) -> list[str]:
    """Extract unique characters from word list, sorted."""
    chars = set()
    for word in words:
        chars.update(word)
    return sorted(chars)


def _read_keyboard_json(path: Path) -> dict:
    """Read and cache keyboard JSON files."""
    key = str(path)
    if key not in _keyboard_cache:
        _keyboard_cache[key] = json.loads(path.read_text(encoding="utf-8"))
    # Return a deep copy so mutations don't affect the cache
    return json.loads(json.dumps(_keyboard_cache[key]))


def generate_keyboard(lang: str, lang_def: dict, characters: list[str]) -> dict:
    """Generate keyboard layout JSON."""
    script = lang_def.get("script", "latin")
    extra = lang_def.get("extra_chars", [])

    if script == "latin":
        # Start with English QWERTY
        kb = _read_keyboard_json(EN_KEYBOARD_PATH)
        # Only keep QWERTY layout for simplicity
        qwerty = kb["layouts"]["qwerty"]

        if extra:
            # Add extra chars to bottom row, before backspace
            bottom = list(qwerty["rows"][2])
            backspace_idx = bottom.index("⌫")
            for ch in extra:
                bottom.insert(backspace_idx, ch)
                backspace_idx += 1
            qwerty["rows"][2] = bottom

        return {"default": "qwerty", "layouts": {"qwerty": qwerty}}

    elif script == "perso-arabic":
        # Copy Persian keyboard and add extra keys
        ref = lang_def.get("ref_keyboard", "fa")
        ref_path = DATA_DIR / ref / f"{ref}_keyboard.json"
        kb = _read_keyboard_json(ref_path)

        urdu_extra = lang_def.get("urdu_extra_keys", [])
        if urdu_extra:
            # Find the first layout and add keys to bottom row
            first_layout_name = kb.get("default", list(kb["layouts"].keys())[0])
            layout = kb["layouts"][first_layout_name]
            bottom = list(layout["rows"][2])
            backspace_idx = bottom.index("⌫")
            for ch in urdu_extra:
                if ch not in bottom:
                    bottom.insert(backspace_idx, ch)
                    backspace_idx += 1
            layout["rows"][2] = bottom
            # Rename layout
            kb["default"] = "urdu"
            kb["layouts"] = {"urdu": {"label": "Urdu", "rows": layout["rows"]}}

        return kb

    else:
        # Devanagari / other: generate alphabetical keyboard from characters
        # Group into rows of ~10-12 chars
        rows = []
        chars = [c for c in characters if c.isalpha()]
        row_size = max(10, len(chars) // 3)
        for i in range(0, len(chars), row_size):
            rows.append(chars[i : i + row_size])
        # Add enter/backspace to last row
        if rows:
            rows[-1] = ["⇨"] + rows[-1] + ["⌫"]
        else:
            rows = [["⇨", "⌫"]]
        return {
            "default": "alphabetical",
            "layouts": {"alphabetical": {"label": "Alphabetical", "rows": rows}},
        }


def generate_config(lang: str, lang_def: dict) -> dict:
    """Generate language_config.json."""
    config = {
        "language_code": lang,
        "name": lang_def["name"],
        "name_native": lang_def["native"],
        "timezone": lang_def.get("timezone", "UTC"),
        "right_to_left": "true" if lang_def.get("rtl") else "false",
    }

    # Add grapheme_mode if defined (for Devanagari / complex scripts)
    if "grapheme_mode" in lang_def:
        config["grapheme_mode"] = lang_def["grapheme_mode"]

    # Add diacritic map if defined
    if "diacritic_map" in lang_def:
        config["diacritic_map"] = lang_def["diacritic_map"]

    # Merge in translated config sections
    translated = lang_def.get("config", {})
    for section in ("meta", "text", "help", "ui"):
        if section in translated:
            config[section] = translated[section]

    return config


# ── Main logic ────────────────────────────────────────────────────────────────


def create_language(lang: str, dry_run: bool = False) -> bool:
    """Create all files for a new language. Returns True on success."""
    if lang not in LANGUAGES:
        print(f"ERROR: Unknown language '{lang}'. Use 'list' to see available languages.")
        return False

    lang_def = LANGUAGES[lang]
    lang_dir = DATA_DIR / lang

    print(f"\n{'=' * 60}")
    print(f"Creating: {lang} — {lang_def['name']} ({lang_def['native']})")
    print(f"{'=' * 60}")

    if lang_dir.exists():
        existing = list(lang_dir.iterdir())
        if existing:
            print(f"  WARNING: Directory already exists with {len(existing)} files")
            print(f"  Files: {[f.name for f in existing]}")
            print("  Skipping to avoid overwriting. Delete directory first to recreate.")
            return False

    # Generate word list
    words = generate_word_list(lang, lang_def)
    if not words:
        print(f"  FAILED: No words generated for {lang}")
        return False

    if len(words) < 100:
        print(f"  WARNING: Only {len(words)} words — may be too few for a good game")

    # Generate derived files
    characters = generate_characters(words)
    keyboard = generate_keyboard(lang, lang_def, characters)
    config = generate_config(lang, lang_def)

    print(f"\n  Summary:")
    print(f"    Words: {len(words)}")
    print(f"    Characters: {len(characters)}")
    print(f"    Keyboard layouts: {len(keyboard.get('layouts', {}))}")
    print(f"    RTL: {config.get('right_to_left', 'false')}")

    if dry_run:
        print(f"\n  DRY RUN — no files written")
        return True

    # Create directory and write files
    lang_dir.mkdir(parents=True, exist_ok=True)

    # Word list
    word_path = lang_dir / f"{lang}_5words.txt"
    word_path.write_text("\n".join(words) + "\n", encoding="utf-8")
    print(f"  Wrote {word_path.name} ({len(words)} words)")

    # Characters
    char_path = lang_dir / f"{lang}_characters.txt"
    char_path.write_text("\n".join(characters) + "\n", encoding="utf-8")
    print(f"  Wrote {char_path.name} ({len(characters)} chars)")

    # Keyboard
    kb_path = lang_dir / f"{lang}_keyboard.json"
    kb_path.write_text(json.dumps(keyboard, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  Wrote {kb_path.name}")

    # Config
    config_path = lang_dir / "language_config.json"
    config_path.write_text(
        json.dumps(config, indent=4, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"  Wrote language_config.json")

    # SOURCES.md
    sources_path = lang_dir / "SOURCES.md"
    sources = []
    sources.append(f"# {lang_def['name']} Language Data — Sources\n")
    if lang_def.get("freq_code"):
        sources.append("## FrequencyWords (OpenSubtitles)")
        sources.append("- URL: https://github.com/hermitdave/FrequencyWords")
        sources.append("- License: MIT (code), CC-BY-SA 4.0 (content)\n")
    if lang_def.get("wordfreq_code"):
        sources.append("## wordfreq")
        sources.append("- URL: https://github.com/rspeer/wordfreq")
        sources.append("- License: MIT\n")
    # Check EXTRA_SOURCES from improve_word_lists for kaikki/leipzig
    from improve_word_lists import EXTRA_SOURCES

    extra = EXTRA_SOURCES.get(lang, set())
    if "kaikki" in extra:
        sources.append("## kaikki.org (Wiktionary extract)")
        sources.append(f"- URL: https://kaikki.org/dictionary/{lang_def['name']}/")
        sources.append("- License: CC-BY-SA 3.0 (Wiktionary content)\n")
    if "leipzig" in extra:
        sources.append("## Leipzig Corpora Collection")
        sources.append("- URL: https://wortschatz.uni-leipzig.de/en/download/")
        sources.append("- License: CC-BY 4.0\n")
    sources_path.write_text("\n".join(sources) + "\n", encoding="utf-8")
    print(f"  Wrote SOURCES.md")

    return True


def list_languages():
    """List all available language definitions."""
    print(f"\n{'Lang':<6} {'Name':<15} {'Native':<20} {'Script':<15} {'Freq':<5} {'WF':<5}")
    print("-" * 70)
    for lang, d in LANGUAGES.items():
        freq = "✓" if d.get("freq_code") else "✗"
        wf = "✓" if d.get("wordfreq_code") else "✗"
        existing = "EXISTS" if (DATA_DIR / lang).exists() else ""
        print(
            f"{lang:<6} {d['name']:<15} {d['native']:<20} {d['script']:<15} {freq:<5} {wf:<5} {existing}"
        )


def main():
    parser = argparse.ArgumentParser(description="Bootstrap new Wordle Global languages")
    subparsers = parser.add_subparsers(dest="command")

    create_cmd = subparsers.add_parser("create", help="Create language files")
    create_cmd.add_argument("langs", nargs="*", help="Language codes to create")
    create_cmd.add_argument("--all", action="store_true", help="Create all defined languages")
    create_cmd.add_argument("--dry-run", action="store_true", help="Preview without writing files")

    subparsers.add_parser("list", help="List available languages")

    args = parser.parse_args()

    if args.command == "list":
        list_languages()
    elif args.command == "create":
        langs = list(LANGUAGES.keys()) if args.all else args.langs
        if not langs:
            print("ERROR: Specify language codes or use --all")
            sys.exit(1)

        results = {}
        for lang in langs:
            results[lang] = create_language(lang, dry_run=args.dry_run)

        # Summary
        print(f"\n{'=' * 60}")
        print("SUMMARY")
        print(f"{'=' * 60}")
        ok = sum(1 for v in results.values() if v)
        fail = sum(1 for v in results.values() if not v)
        for lang, success in results.items():
            status = "OK" if success else "FAILED"
            name = LANGUAGES.get(lang, {}).get("name", "?")
            print(f"  {lang}: {status} ({name})")
        print(f"\nSuccess: {ok}, Failed: {fail}")

        if fail:
            sys.exit(1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
