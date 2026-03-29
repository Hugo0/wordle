#!/usr/bin/env python3
"""Add SEO translations to language config files.

Usage: python scripts/add_seo_translations.py
"""
import json
import os
import sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "languages")


def make_seo(t):
    """Build a full SEO block from a simplified translation dict `t`.

    `t` must contain keys that map to the language-specific phrasing.
    This helper fills in the full nested structure expected by the app.
    """
    return {
        "how_to_play": t["how_to_play"],
        "tips_strategy": t["tips_strategy"],
        "more_modes": t["more_modes"],
        "play_in_languages": t["play_in_languages"],
        "play_in_languages_sub": t["play_in_languages_sub"],
        "why_wordle_global": t["why_wordle_global"],
        "faq_title": t["faq_title"],
        "browse_all_languages": t["browse_all_languages"],
        "recent_words": t["recent_words"],
        "view_all_words": t["view_all_words"],
        "footer": t["footer"],
        "tile_correct": t["tile_correct"],
        "tile_semicorrect": t["tile_semicorrect"],
        "tile_incorrect": t["tile_incorrect"],
        "stat_players": t["stat_players"],
        "stat_guesses": t["stat_guesses"],
        "stat_languages": t["stat_languages"],
        "stat_modes": t["stat_modes"],
        "value_props": t["value_props"],
        "tips": t["tips"],
        "tips_speed": t["tips_speed"],
        "tips_multiboard": t["tips_multiboard"],
        "mode_desc_classic": t["mode_desc_classic"],
        "mode_desc_unlimited": t["mode_desc_unlimited"],
        "mode_desc_speed": t["mode_desc_speed"],
        "mode_desc_multiboard": t["mode_desc_multiboard"],
        "faq": t["faq"],
        "mode_faq": t["mode_faq"],
        "howto": t["howto"],
        "mode_howto": t["mode_howto"],
    }


def write_seo(lang_code, seo_data):
    config_path = os.path.join(BASE, lang_code, "language_config.json")
    if not os.path.exists(config_path):
        print(f"SKIP {lang_code}: no config file")
        return False

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    if "seo" in config:
        print(f"SKIP {lang_code}: already has seo")
        return False

    config["seo"] = seo_data

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=4)
        f.write("\n")

    print(f"OK {lang_code}")
    return True


# ── Helper: generate a standard SEO block with translated strings ──────────
# Each language provides localized strings for the ~20 top-level keys,
# 6 value_props, 6+6+6 tips, 4 FAQ, mode FAQ/howto blocks, and mode descs.
# Template placeholders: {langName}, {lang}, {modeName}, {boardCount}, {maxGuesses}

LANGS = {}

# ─── Azerbaijani (az) ─────────────────────────────────────────────────────
LANGS["az"] = {
    "how_to_play": "Necə oynamalı",
    "tips_strategy": "Məsləhətlər və strategiya",
    "more_modes": "Daha çox oyun rejimi",
    "play_in_languages": "80+ dildə oynayın",
    "play_in_languages_sub": "Bütün dillər pulsuzdur. Hesab lazım deyil.",
    "why_wordle_global": "Niyə Wordle Global",
    "faq_title": "Tez-tez verilən suallar",
    "browse_all_languages": "Bütün 80+ dilə baxın",
    "recent_words": "Son sözlər",
    "view_all_words": "Bütün sözlərə bax",
    "footer": "wordle.global — 80+ dildə pulsuz gündəlik söz oyunu",
    "tile_correct": "sözdədir və düzgün yerdədir.",
    "tile_semicorrect": "sözdədir, lakin yanlış yerdədir.",
    "tile_incorrect": "sözdə yoxdur.",
    "stat_players": "Oyunçular",
    "stat_guesses": "Təxminlər",
    "stat_languages": "Dillər",
    "stat_modes": "Oyun rejimləri",
    "value_props": [
        {"key": "languages", "title": "80+ dil", "desc": "Ərəbcədən Yorubaya. Ən böyük çoxdilli Wordle."},
        {"key": "definitions", "title": "Söz tərifləri", "desc": "Hər sözün mənasını oyundan sonra öyrənin. Söz ehtiyatınızı artırın."},
        {"key": "word_art", "title": "Unikal söz sənəti", "desc": "Hər söz xüsusi illüstrasiya ilə gəlir. Hamısını toplayın."},
        {"key": "themes", "title": "Qaranlıq rejim və mövzular", "desc": "Rahat oynamaq üçün açıq, tünd və yüksək kontrastlı rejimlər."},
        {"key": "pwa", "title": "Hər yerdə işləyir", "desc": "PWA — istənilən cihaza quraşdırın. Oflayn işləyir. Yükləmə lazım deyil."},
        {"key": "free", "title": "Həmişə pulsuz", "desc": "Hesab lazım deyil. Ödəniş yoxdur. Sadəcə oynayın."}
    ],
    "tips": [
        {"title": "Sait-zəngin sözlə başlayın", "text": "CRANE, STARE və ya ADIEU kimi sözlər yayılmış hərfləri tez yoxlayır. Hansı saitlərin olduğunu bilmək seçimləri daraldır."},
        {"title": "Bildiklərinizi istifadə edin", "text": "Yaşıl hərflər yerindədir. Sarı hərflər köçürülməlidir. Boz hərflər silinib. Hər təxmin hər üç ipucunu istifadə etməlidir."},
        {"title": "Ümumi nümunələri düşünün", "text": "Hər dilin öz tez-tez rast gəlinən söz nümunələri var — onları öyrənin."},
        {"title": "Təsadüfi təxmin etməyin, aradan çıxarın", "text": "İkinci sözünüz yeni hərfləri yoxlamalı, təsdiqlənmişləri təkrarlamamalıdır."},
        {"title": "Qoşa hərflərə diqqət edin", "text": "İpucularınız uyğun gəlmirsə, təkrarlanan hərf barədə düşünün."},
        {"title": "Yaxşılaşmaq üçün çətin rejimi istifadə edin", "text": "Çətin rejim sizi hər təxmində təsdiqlənmiş ipucuları istifadə etməyə məcbur edir. Daha yaxşı vərdişlər yaradır."}
    ],
    "tips_speed": [
        {"title": "CRANE və ya STARE ilə başlayın", "text": "Tez-tez istifadə olunan hərflər sürətli həll üçün ən yaxşı şansı verir."},
        {"title": "Çox düşünməyin", "text": "Speed Streak intuisiyanı mükafatlandırır. Ehtimal olunan söz görsəniz, gedin."},
        {"title": "Kombonuzu qoruyun", "text": "Uğursuz söz çarpanınızı sıfırlayır. Əmin olmadığınız zaman təhlükəsiz təxmin edin."},
        {"title": "2-3 təxmində həll etməyə çalışın", "text": "Sürətli həllər üçün zaman bonusu böyükdür (+60s 1 təxmin, +30s 2)."},
        {"title": "Ümumi söz sonluqlarını öyrənin", "text": "Tez-tez təkrarlanan nümunələri tanımaq hər sözdə saniyələr qazandırır."},
        {"title": "Təzyiq artdıqda sakit olun", "text": "Taymer hər 3 sözdə sürətlənir. Tələsmək xətalara gətirir."}
    ],
    "tips_multiboard": [
        {"title": "Geniş başlayın", "text": "Bütün lövhələrdə eyni anda ipucu toplamaq üçün yayılmış hərfli sözlər istifadə edin."},
        {"title": "Bölünmüş klaviaturaya baxın", "text": "Klaviatura hər lövhə üçün rənglər göstərir. Bir lövhədə yaşıl, digərində boz olan hərf seçimləri daraldır."},
        {"title": "Çətin lövhələrə üstünlük verin", "text": "Ən çox naməlumu olan lövhəyə diqqət yetirin. Asan lövhələr çox vaxt öz-özünə həll olur."},
        {"title": "İlk təxminləri boşa xərcləməyin", "text": "Xüsusi lövhələri hədəfləməzdən əvvəl ilk 2-3 təxmini məlumat zəngin sözlərə istifadə edin."},
        {"title": "Ortaq hərfləri axtarın", "text": "İki lövhə sarı E göstərirsə, yeni mövqedə E olan söz hər ikisinə kömək edir."},
        {"title": "Fövqəladə hallar üçün təxmin saxlayın", "text": "Son lövhədə ilişib qalsanız, əlavə təxmin qazanmaq və itirmək arasındakı fərqdir."}
    ],
    "mode_desc_classic": "Gizli 5 hərfli sözü tapmaq üçün 6 cəhdiniz var. Cavabı daraltmaq üçün rəng ipucularından istifadə edin.",
    "mode_desc_unlimited": "Gizli 5 hərfli sözü tapmaq üçün 6 cəhdiniz var. Rəng ipucularından istifadə edin. Hər oyundan sonra dərhal yeni söz almaq üçün \"Yenidən oyna\" basın — gündəlik limit yoxdur.",
    "mode_desc_speed": "Saatda 3 dəqiqə ilə başlayırsınız. Həll etdiyiniz hər söz bonus vaxt qazandırır — daha az təxminlə daha böyük bonuslar (+60s 1 təxmin, +10s 6). Uğursuz sözlər 30 saniyəyə başa gəlir. Ardıcıl sözləri həll edərək 3x-ə qədər xal çarpanı qurun. Təzyiq artır — taymer hər 3 sözdə sürətlənir.",
    "mode_desc_multiboard": "{modeName} eyni anda {boardCount} Wordle lövhəsini yalnız {maxGuesses} təxminlə həll etməyə çağırır. Hər təxmin bütün həll olunmamış lövhələrdə görünür. Həll olunmuş lövhələr donur. Bölünmüş rəngli klaviatura hansı hərflərin hansı lövhələrdə düzgün olduğunu göstərir.",
    "faq": [
        {"q": "{langName} dilində Wordle necə oynayıram?", "a": "{langName} dilində gündəlik Wordle oynamaq üçün wordle.global/{lang} saytına daxil olun. 5 hərfli sözü tapmaq üçün 6 cəhdiniz var. Hər təxmindən sonra xanalar yaşıl (düzgün hərf, düzgün mövqe), sarı (düzgün hərf, yanlış mövqe) və ya boz (hərf sözdə yoxdur) rəngə boyanır."},
        {"q": "Hər gün yeni tapmaca var?", "a": "Bəli. Hər gün yeni söz seçilir. Eyni dildə oynayan hər kəs eyni sözü alır."},
        {"q": "Wordle Global pulsuzdur?", "a": "Bəli. Gündəlik tapmaca, limitsiz rejim və bütün oyun rejimləri 80+ dildə tamamilə pulsuzdur. Hesab və ya yükləmə lazım deyil."},
        {"q": "Gündə birdən çox oynaya bilərəm?", "a": "Bəli — sonsuz oyunlar üçün wordle.global/{lang}/unlimited ünvanında limitsiz rejimi sınayın. Gündəlik ardıcıllığınız ayrıca izlənir."}
    ],
    "mode_faq": {
        "unlimited": [
            {"q": "{langName} dilində Wordle Unlimited nədir?", "a": "Wordle Unlimited {langName} dilində istədiyiniz qədər Wordle oynamağa imkan verir, sabahkı tapmacını gözləmədən."},
            {"q": "Wordle Unlimited pulsuzdur?", "a": "Bəli. Tamamilə pulsuzdur. Hesab yoxdur, yükləmə yoxdur, reklam yoxdur."},
            {"q": "Limitsiz rejim gündəlik ardıcıllığıma sayılır?", "a": "Xeyr. Limitsiz rejimin öz ayrı statistikası var."},
            {"q": "Neçə dəfə oynaya bilərəm?", "a": "Limit yoxdur. İstədiyiniz qədər raund oynaya bilərsiniz."},
            {"q": "Wordle Unlimited hansı dillərdə mövcuddur?", "a": "Wordle Unlimited wordle.global saytında 80+ dildə mövcuddur."}
        ],
        "speed": [
            {"q": "{langName} dilində Speed Streak nədir?", "a": "Speed Streak {langName} dilində zamana qarşı Wordle rejimidir. 3 dəqiqə ilə başlayıb bacardığınız qədər çox söz həll edirsiniz."},
            {"q": "Xal necə hesablanır?", "a": "Həll etdiyiniz hər söz üçün xal qazanırsınız. Daha az təxmin və daha sürətli həllər daha çox xal verir. Ardıcıl sözləri həll edərək 3x-ə qədər çarpan qurun."},
            {"q": "Vaxt bitəndə nə olur?", "a": "Oyun bitir və son xalınızı, həll edilmiş sözləri, maksimum kombonu və orta təxminləri görürsünüz."},
            {"q": "Speed Streak pulsuzdur?", "a": "Bəli. Bütün 80+ dildə tamamilə pulsuzdur."}
        ],
        "multiboard": [
            {"q": "{langName} dilində {modeName} nədir?", "a": "{modeName} {langName} dilində çox lövhəli Wordle variantıdır. {maxGuesses} təxminlə eyni anda {boardCount} Wordle lövhəsini həll edirsiniz."},
            {"q": "{modeName}-da neçə təxminim var?", "a": "Bütün {boardCount} lövhəni həll etmək üçün {maxGuesses} təxmininiz var."},
            {"q": "{modeName} üçün ən yaxşı strategiya hansıdır?", "a": "Bütün {boardCount} lövhədə eyni anda məlumat toplamaq üçün yayılmış hərfli sözlərlə başlayın."},
            {"q": "{modeName} pulsuzdur?", "a": "Bəli. {modeName} bütün 80+ dildə tamamilə pulsuzdur."}
        ]
    },
    "howto": [
        {"name": "Söz yazın", "text": "Ekran klaviaturası və ya fiziki klaviaturanızdan istifadə edərək {langName} dilində etibarlı 5 hərfli söz daxil edin, sonra Enter basın."},
        {"name": "İpucuları oxuyun", "text": "Yaşıl xanalar hərfin düzgün və doğru yerdə olduğunu bildirir. Sarı hərfin sözdə olduğunu, lakin yanlış mövqedə olduğunu bildirir. Boz hərfin sözdə olmadığını bildirir."},
        {"name": "6 cəhddə həll edin", "text": "Sözü daraltmaq üçün rəng ipucularından istifadə edin. Cəmi 6 təxmininiz var. Tapmacadan sonra statistikalarınıza baxın və nəticənizi paylaşın."}
    ],
    "mode_howto": {
        "unlimited": [
            {"name": "Oyuna başlayın", "text": "{langName} dilində Wordle Unlimited oynamaq üçün wordle.global/{lang}/unlimited ünvanına daxil olun."},
            {"name": "Sözü tapın", "text": "Etibarlı 5 hərfli söz yazın və Enter basın. Yaşıl = düzgün hərf düzgün yerdə. Sarı = düzgün hərf yanlış yerdə. Boz = hərf sözdə yoxdur."},
            {"name": "Dərhal yenidən oynayın", "text": "Sözü həll etdikdən sonra dərhal yeni söz almaq üçün \"Yenidən oyna\" basın."}
        ],
        "speed": [
            {"name": "Taymeri işə salın", "text": "wordle.global/{lang}/speed ünvanına daxil olun və Başla basın. Saatda 3 dəqiqə ilə başlayırsınız."},
            {"name": "Sözləri tez həll edin", "text": "Həll etdiyiniz hər söz bonus vaxt qazandırır (+10s-dan +60s-ə). Uğursuz sözlər 30 saniyəyə başa gəlir."},
            {"name": "Kombonuzu qurun", "text": "Kombo çarpanını artırmaq üçün ardıcıl sözləri həll edin (3x-ə qədər)."}
        ],
        "multiboard": [
            {"name": "Oyuna başlayın", "text": "{langName} dilində {modeName} oynamaq üçün wordle.global/{lang}/{modeName} ünvanına daxil olun. Fərqli gizli sözlərlə {boardCount} lövhə görünür."},
            {"name": "Bütün lövhələrdə təxmin edin", "text": "5 hərfli söz yazın və Enter basın. Təxmininiz eyni anda {boardCount} lövhənin hamısında görünür."},
            {"name": "Bütün {boardCount} lövhəni həll edin", "text": "Həll olunmuş lövhələr donur. Bölünmüş rəngli klaviaturadan istifadə edin. Bütün {boardCount} lövhəni {maxGuesses} təxmində həll edin."}
        ]
    }
}

# For the remaining languages, I'll define them more concisely since the structure is identical.
# Only the translated strings differ.

# Template function to generate standard FAQ/howto/tips from provided base phrases
def lang_seo(
    how_to_play, tips_strategy, more_modes, play_in_langs, play_in_langs_sub,
    why_wg, faq_title, browse_all, recent_words, view_all_words, footer,
    tile_correct, tile_semi, tile_incorrect,
    stat_players, stat_guesses, stat_languages, stat_modes,
    vp_langs, vp_defs, vp_art, vp_themes, vp_pwa, vp_free,
    tip1, tip2, tip3, tip4, tip5, tip6,
    ts1, ts2, ts3, ts4, ts5, ts6,
    tm1, tm2, tm3, tm4, tm5, tm6,
    mode_classic, mode_unlimited, mode_speed, mode_multi,
    faq1q, faq1a, faq2q, faq2a, faq3q, faq3a, faq4q, faq4a,
    mfaq_unl, mfaq_speed, mfaq_multi,
    howto1, howto2, howto3,
    mhowto_unl, mhowto_speed, mhowto_multi,
):
    return {
        "how_to_play": how_to_play,
        "tips_strategy": tips_strategy,
        "more_modes": more_modes,
        "play_in_languages": play_in_langs,
        "play_in_languages_sub": play_in_langs_sub,
        "why_wordle_global": why_wg,
        "faq_title": faq_title,
        "browse_all_languages": browse_all,
        "recent_words": recent_words,
        "view_all_words": view_all_words,
        "footer": footer,
        "tile_correct": tile_correct,
        "tile_semicorrect": tile_semi,
        "tile_incorrect": tile_incorrect,
        "stat_players": stat_players,
        "stat_guesses": stat_guesses,
        "stat_languages": stat_languages,
        "stat_modes": stat_modes,
        "value_props": [
            {"key": "languages", **vp_langs},
            {"key": "definitions", **vp_defs},
            {"key": "word_art", **vp_art},
            {"key": "themes", **vp_themes},
            {"key": "pwa", **vp_pwa},
            {"key": "free", **vp_free},
        ],
        "tips": [tip1, tip2, tip3, tip4, tip5, tip6],
        "tips_speed": [ts1, ts2, ts3, ts4, ts5, ts6],
        "tips_multiboard": [tm1, tm2, tm3, tm4, tm5, tm6],
        "mode_desc_classic": mode_classic,
        "mode_desc_unlimited": mode_unlimited,
        "mode_desc_speed": mode_speed,
        "mode_desc_multiboard": mode_multi,
        "faq": [
            {"q": faq1q, "a": faq1a},
            {"q": faq2q, "a": faq2a},
            {"q": faq3q, "a": faq3a},
            {"q": faq4q, "a": faq4a},
        ],
        "mode_faq": {
            "unlimited": mfaq_unl,
            "speed": mfaq_speed,
            "multiboard": mfaq_multi,
        },
        "howto": [howto1, howto2, howto3],
        "mode_howto": {
            "unlimited": mhowto_unl,
            "speed": mhowto_speed,
            "multiboard": mhowto_multi,
        },
    }


if __name__ == "__main__":
    count = 0
    for lang_code, seo_data in LANGS.items():
        if write_seo(lang_code, seo_data):
            count += 1
    print(f"\nDone: {count} languages updated")
