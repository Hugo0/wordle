const app = Vue.createApp({
    // data, functions
    delimiters: ['[[', ']]'],
    data() {
        return {
            showPopup: false,
            showAboutModal: false,
            showStatsModal: false,
            clickedLanguage: "",

            // flask data
            other_wordles: other_wordles,
            languages: languages,
            todays_idx: todays_idx,

            // copy of data for visualization
            other_wordles_vis: other_wordles,
            languages_vis: languages,

            search_text: "",
            total_stats: {},
        }
    },
    computed: {
    },
    beforeCreate() {
        // if http redirect to https unless we are in localhost/127.0.0.1:5000
        if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && window.location.protocol !== "https:") {
            window.location.href = "https://" + window.location.hostname + window.location.pathname;
        }
    },
    created() {
        

        if (localStorage.getItem("game_results") === null) {
            this.game_results = {};
            localStorage.setItem("game_results", JSON.stringify(this.game_results));
        } else {
            this.game_results = JSON.parse(localStorage.getItem("game_results"));
        }

        // calculate total stats
        this.total_stats = this.calculateTotalStats();
    },
    mounted() {
        window.addEventListener('keydown', this.keyDown);
    },
    beforeUpdate() {
        this.filterWordles(this.search_text.toLowerCase());
    },
    updated() {
    },
    methods: {
        keyDown(event) {
            key = event.key;
            if (key === "Escape") { // QoL
                this.showStatsModal = false;
                this.showAboutModal = false;
            }
        },
        selectLanguage(language_index) {
            // redirect to the language page
            if (this.languages_vue[language_index].ready) {
                window.location.href = "/" + this.languages_vue[language_index].code;
            } else {
                this.clickedLanguage = this.languages_vue[language_index].name;
                this.showPopup = true;
            }
        },
        selectLanguageWithCode(language_code) {
            window.location.href = "/" + language_code;
        },
        openLink(url) {
            console.log("open link: " + url);
            window.open(url);
        },
        filterWordles(search_text) {
            // hide items that don't match the search text
            // languages: language.name and language.name_native
            // other_wordles: wordle.name and wordle.language
            if (search_text == "") {
                this.other_wordles_vis = this.other_wordles;
                this.languages_vis = this.languages;
            } else {
                var visible_languages = [];
                var visible_wordles = [];

                // iterate through languages dictionary and update the visible languages
                var language_keys = Object.keys(this.languages);
                for (var i = 0; i < language_keys.length; i++) {
                    var language_code = language_keys[i];
                    var language = this.languages[language_code];
                    // if the language name or native name matches the search text
                    if (language.language_name.toLowerCase().includes(search_text) || language.language_name_native.toLowerCase().includes(search_text)) {
                        // add the language to the visible languages
                        visible_languages.push(language);
                    }
                }

                for (var i = 0; i < this.other_wordles.length; i++) {
                    if (this.other_wordles[i].name.toLowerCase().includes(search_text) || this.other_wordles[i].language.toLowerCase().includes(search_text)) {
                        visible_wordles.push(this.other_wordles[i]);
                    }
                }
                this.other_wordles_vis = visible_wordles;
                this.languages_vis = visible_languages;
            }
        },
        calculateStats(language_code) {
            // returns stats for the current language

            if (!this.game_results[language_code]) {
                return {
                    "n_wins": 0,
                    "n_losses": 0,
                    "n_games": 0,
                    "n_attempts": 0,
                    "avg_attempts": 0,
                    "win_percentage": 0,
                    "longest_streak": 0,
                    "current_streak": 0,
                };
            }

            var results = this.game_results[language_code];
            var n_wins = 0;
            var n_losses = 0;
            var n_attempts = 0;
            var n_games = results.length;
            var current_streak = 0;
            var longest_streak = 0;
            for (let i = 0; i < results.length; i++) {
                var result = results[i];
                if (result.won) {
                    n_wins++;
                    current_streak++;
                    if (current_streak > longest_streak) {
                        longest_streak = current_streak;
                    }
                } else {
                    n_losses++;
                    current_streak = 0;
                }
                n_attempts += result.attempts;
            }
            var avg_attempts = n_attempts / results.length;
            var win_percentage = n_wins / (n_wins + n_losses) * 100;

            return {
                "n_wins": n_wins,
                "n_losses": n_losses,
                "n_games": n_games,
                "n_attempts": n_attempts,
                "avg_attempts": avg_attempts,
                "win_percentage": win_percentage,
                "longest_streak": longest_streak,
                "current_streak": current_streak,
            };
        },
        calculateTotalStats() {
            // calculates stats for all languages

            var total_games = 0; // total number of games played
            var game_stats = {}; // holds the calculated stats for each language
            var languages_won = [];  // list of languages that have been won
            var total_win_percentage = 0; // percentage of games won by all languages
            var longest_overall_streak = 0; // the longest streak of consecutive wins for all languages
            var current_overall_streak = 0; // the current streak of won games in a row on all languages
            var longest_language_streak = 0; // the longest streak for a single language
            var current_longest_language_streak = 0; // the longest language streak for one individual language
            var current_longest_language_streak_language = ""; // the language that has the longest language streak
            var n_victories = 0; // total number of victories
            var n_losses = 0; // total number of losses

            var language_keys = Object.keys(this.game_results);

            // order all games by date and calculate overall streaks
            var all_results = [];
            for (var i = 0; i < language_keys.length; i++) {
                var language_code = language_keys[i];
                var language_results = this.game_results[language_code];
                for (let j = 0; j < language_results.length; j++) {
                    all_results.push(language_results[j]);
                }
            }
            all_results.sort(function(a, b) {
                var dateA = new Date(a.date);
                var dateB = new Date(b.date);
                if (dateA > dateB) {
                    return 1;
                } else if (dateA < dateB) {
                    return -1;
                } else {
                    return 0;
                }
            });

            for (let i = 0; i < all_results.length; i++) {
                var result = all_results[i];
                if (result.won) {
                    n_victories++;
                    current_overall_streak++;
                    if (current_overall_streak > longest_overall_streak) {
                        longest_overall_streak = current_overall_streak;
                    }
                } else {
                    n_losses++;
                    current_overall_streak = 0;
                }
            }

            total_games = n_victories + n_losses;
            total_win_percentage = n_victories / (total_games) * 100;

            // calculate stats for each language
            for (var i = 0; i < language_keys.length; i++) {
                var language_code = language_keys[i];
                var language_results = this.game_results[language_code];
                var language_stats = this.calculateStats(language_code);
                game_stats[language_code] = language_stats;
                if (language_stats.n_wins > 0) {
                    // console.log(language_code + " won " + language_stats.n_wins + " times");
                    languages_won.push(language_code);
                }
                if (language_stats.longest_streak > longest_language_streak) {
                    longest_language_streak = language_stats.longest_streak;
                }
                if (language_stats.current_streak > current_longest_language_streak) {
                    current_longest_language_streak = language_stats.current_streak;
                    current_longest_language_streak_language = language_code;
                }
            }

            
            return {
                "total_games": total_games,
                "game_stats": game_stats,
                "languages_won": languages_won,
                "total_win_percentage": total_win_percentage,
                "longest_overall_streak": longest_overall_streak,
                "current_overall_streak": current_overall_streak,
                "longest_language_streak": longest_language_streak,
                "current_longest_language_streak": current_longest_language_streak,
                "current_longest_language_streak_language": current_longest_language_streak_language,
                "n_victories": n_victories,
                "n_losses": n_losses,
            };
        }
    },
});

app.mount('#app');