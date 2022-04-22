// Probably should add some js to deal with mobile url bar here, but I've tried a bunch of approaches and have no idea how.

// Vue stuff below
const app = Vue.createApp({
    delimiters: ['[[', ']]'],  // don't want to clash with Jinja (backend templating coming from flask)
    data() {
        return {
            active_row: 0,
            active_cell: 0,
            full_word_inputted: false,
            game_over: false,
            game_lost: false,
            game_won: false,

            // these variables come from Jinja
            todays_word: todays_word,
            todays_idx: todays_idx,
            word_list: word_list,
            word_list_supplement: word_list_supplement,
            characters: characters,
            config: config,
            right_to_left: config.right_to_left == "true",
            allow_any_word: false,


            showHelpModal: false,
            show_stats_modal: false,
            show_options_modal: false,
            show_not_valid_notif: false,

            notification: {
                show: false,
                message: "",
                top: 0,
                timeout: 0,
            },

            tiles: [
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
            ],
            tile_classes: [
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
            ],

            // have to split it in two because of right to left text (arabic, hebrew, etc) and this was easiest way to do it
            tiles_visual: [
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
                ["", "", "", "", ""],
            ],
            tile_classes_visual: [
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
                ["border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300", "border-2 border-neutral-300"],
            ],

            // constantly updating time until next day
            time_until_next_day() {
                return this.get_time_until_next_day();
            },

            emoji_board: "⬜⬜⬜⬜⬜\n",
            attempts: "0",

            stats: {},
        }
    },
    computed: {
        // computed properties
        key_classes: {
            get() {
                let keys = {};
                for (let i = 0; i < characters.length; i++) {
                    keys[characters[i]] = "";
                }
                keys["⟹"] = "";
                keys["ENTER"] = "";
                keys["DEL"] = "";
                keys["⌫"] = "";
                return keys;
            },
            set(new_key_classes) {
                // this.key_classes = new_key_classes; // this doesn't work, recursive                
                // set key classes without recursion
                for (let i = 0; i < characters.length; i++) {
                    this.key_classes[characters[i]] = new_key_classes[characters[i]];
                }
            }
        },        
        
        acceptable_characters() {
            return characters.join("");
        },
    },
    beforeCreate() {
        // if http redirect to same url in https
        if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && window.location.protocol !== "https:") {
            window.location.href = "https://" + window.location.hostname + window.location.pathname;
        }
    },
    created() {
        // listen for any keypresses
        window.addEventListener('keydown', this.keyDown);

        // load results
        if (localStorage.getItem("game_results") === null) {
            this.game_results = {};
            this.game_results[this.config.language_code] = [];
            localStorage.setItem("game_results", JSON.stringify(this.game_results));
        } else {
            this.game_results = JSON.parse(localStorage.getItem("game_results"));
            if (!this.game_results[this.config.language_code]) {
                this.game_results[this.config.language_code] = [];
            }
        }

        //calculate stats
        this.stats = this.calculateStats(this.config.language_code);

        this.time_until_next_day = this.get_time_until_next_day();
    },
    mounted() {
        // print time until next day every 5 seconds
        setInterval(() => {
            this.time_until_next_day = this.get_time_until_next_day();
        }, 1000);
        this.loadFromLocalStorage();
        this.showTiles();

        if (this.game_over) {
            this.show_stats_modal = true;
        }
    },
    beforeUpdate() {
        if (this.show_stats_modal) {
            this.emoji_board = this.getEmojiBoard();
        }
    },
    updated() {
        if (this.show_stats_modal) {
            // if config.name_native is not set, use to config.language_code
            var text_to_share;
            if (!this.config.name_native) {
                text_to_share = "Wordle (" + this.config.language_code + ") #" + this.todays_idx + " " + this.attempts + "/6" + "\n" + "www.wordle.global/" + this.config.language_code + "\n" + "\n" + this.emoji_board;
            } else {
                text_to_share = "Wordle " + this.config.name_native + " #" + this.todays_idx + " " + this.attempts + "/6" + "\n" + "www.wordle.global/" + this.config.language_code + "\n" + "\n" + this.emoji_board;
            }
            document.querySelector('#copy_button').addEventListener('click', async event => {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            text: text_to_share,
                        });
                    } catch (error) {
                        console.log('Error sharing: ', error);
                    }
                } else if (navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(text_to_share);
                        this.showNotification("Copied to clipboard");
                    } catch (error) {
                        console.log('Error copying: ', error);
                    }
                } else {
                    console.log("No navigator.share or navigator.clipboard");
                    alert("I'm sorry, but your browser doesn't support sharing. Please copy the text and share it yourself.");
                }
            });
        }
    },
    methods: {
        get_time_until_next_day() {
            // returns time until next UTC day formatted as "h m s"

            var d = new Date();
            var h = d.getUTCHours();
            var m = d.getUTCMinutes();
            var s = d.getUTCSeconds();
            
            var time_until_next_day = ""
            if (h < 23) {
                time_until_next_day += (23 - h) + "h ";
            } else {
                time_until_next_day += "0h ";
            }
            if (m < 59) {
                time_until_next_day += (59 - m) + "m ";
            } else {
                time_until_next_day += "0m ";
            }
            if (s < 59) {
                time_until_next_day += (59 - s) + "s";
            } else {
                time_until_next_day += "0s";
            }
            return time_until_next_day;
        },
        handleEvent(event) {
        },

        addChar(char) {
            this.tiles[this.active_row][this.active_cell] = char;
            this.tile_classes[this.active_row][this.active_cell] = "text-2xl tiny:text-4xl uppercase font-bold select-none border-2 border-neutral-500 pop";
            this.active_cell = Math.min(this.active_cell + 1, 5);
            if (this.active_cell == 5) {
                this.full_word_inputted = true;
            }
        },

        checkWord(word) {
            if (this.allow_any_word) {
                return true;
            } else if (word_list.indexOf(word) == -1 && word_list_supplement.indexOf(word) == -1) {
                console.log(word + " is not in either word list and thus not valid");
                return false;
            } else {
                console.log(word + " is in the word list and thus valid");
                return true;
            }
        },

        updateColors() {
            // NOTE: if a character appears only once in the final word, but multiple times in submitted word
            // then we want to only color one. The hierarchy is correct first, then the semi-correct ones by position.
            var todays_word = this.todays_word;
            const base_class = "text-2xl tiny:text-4xl uppercase font-bold select-none text-white";
            var charcounts = {};

            // count characters
            for (let i = 0; i < todays_word.length; i++) {
                var character = todays_word[i];
                if (charcounts[character] == undefined) {
                    charcounts[character] = 1;
                } else {
                    charcounts[character] += 1;
                }
            }

            // color correct characters
            for (let i = 0; i < this.tiles[this.active_row].length; i++) {
                var character = this.tiles[this.active_row][i];
                if (character == todays_word[i]) {
                    this.tile_classes[this.active_row][i] = "correct" + " " + base_class;
                    this.key_classes[character] = "correct"
                    charcounts[character] -= 1;
                }
            }
            for (let i = 0; i < this.tiles[this.active_row].length; i++) {
                var character = this.tiles[this.active_row][i];
                if (todays_word.indexOf(character) != -1 && charcounts[character] > 0 && this.tile_classes[this.active_row][i].indexOf("correct") == -1) {
                    // if the tile is not already colored
                    this.tile_classes[this.active_row][i] = "semicorrect" + " " + base_class;
                    if (this.key_classes[character] != "correct") {
                        this.key_classes[character] = "semicorrect"
                    }
                    charcounts[character] -= 1;
                } else if (this.tile_classes[this.active_row][i].indexOf("correct") == -1) {
                    this.tile_classes[this.active_row][i] = "incorrect" + " " + base_class;
                    if (this.key_classes[character] != "correct" && this.key_classes[character] != "semicorrect") {
                        this.key_classes[character] = "incorrect"
                    }
                }
            }
        },
        keyClick(key) {
            // emit event that key was pressed
            var event = new Event('keydown');
            event.key = key;
            this.keyDown(event);
        },
        keyDown(event) {
            key = event.key;
            if (key === "Escape") { // QoL
                this.showHelpModal = false;
                this.show_stats_modal = false;
                this.show_options_modal = false;
                this.show_not_valid_notif = false;
            }

            if (this.game_over) {
                return;
            }
            // console.log('keyDown', this.active_cell, this.active_row, event.key);
            if (key === "Enter" || key === "⇨") {
                if (!this.full_word_inputted) {
                    this.showNotification("Please enter a full word");
                    return;
                }
                // if checkWord returns true, then go to next row
                var word = this.tiles[this.active_row].join("").toLowerCase();
                var word_is_valid = this.checkWord(word);
                if (word_is_valid) {
                    this.updateColors();
                    this.active_row++;
                    this.active_cell = 0;
                    this.full_word_inputted = false;
                } else {
                    this.showNotification("Word is not valid");
                }

                if (word === this.todays_word) {
                    this.gameWon();
                } else if (this.active_row == 6) {
                    this.gameLost();
                }

            } else if ((key === "Backspace" || key === "Delete" || key === "⌫") && this.active_cell > 0) {
                // set current active cell to empty and move backwards one
                this.tiles[this.active_row][this.active_cell - 1] = "";
                this.active_cell = Math.max(this.active_cell - 1, 0);
                this.tile_classes[this.active_row][this.active_cell] = "border-2 border-neutral-300";
                this.full_word_inputted = false;
                // if key is esc, close any modal

            } else {
                if (!this.full_word_inputted) {
                    if (this.acceptable_characters.indexOf(key) >= 0) {
                        this.addChar(key);
                    }
                }
            }
            this.showTiles();
            this.saveToLocalStorage();
        },
        showTiles() {
            // if left to right, then reverse the tiles visuals. else copy normally.
            if (!this.right_to_left) {
                for (let i = 0; i < this.tiles.length; i++) {
                    this.tiles_visual[i] = this.tiles[i].map(x => x)
                    this.tile_classes_visual[i] = this.tile_classes[i].map(x => x)
                }
            } else {
                for (let i = 0; i < this.tiles.length; i++) {
                    this.tiles_visual[i] = this.tiles[i].map(x => x).reverse();
                    this.tile_classes_visual[i] = this.tile_classes[i].map(x => x).reverse();
                }
            }
        },
        gameWon() {
            // set game_over to true with time delay
            this.game_over = true;
            this.game_won = true;
            this.emoji_board = this.getEmojiBoard();
            this.showNotification(this.todays_word.toUpperCase(), 12);
            setTimeout(() => {
                this.show_stats_modal = true;
            }, 400);

            // save a win to localStorage
            const result = { "won": true, "attempts": this.attempts, "date": new Date() };
            this.game_results[this.config.language_code].push(result);
            localStorage.setItem("game_results", JSON.stringify(this.game_results));
            
            // refresh stats
            this.stats = this.calculateStats(this.config.language_code);

        },
        gameLost() {
            this.showNotification(this.todays_word.toUpperCase(), 12);

            this.game_over = true;
            this.game_won = false;
            this.attempts = "X";
            setTimeout(() => {
                this.show_stats_modal = true;
            }, 400);
            // save a loss to local storage game results
            this.game_results[this.config.language_code].push({ "won": false, "attempts": this.attempts, "date": new Date() });
            localStorage.setItem("game_results", JSON.stringify(this.game_results));

            // refresh stats
            this.stats = this.calculateStats(this.config.language_code);

        },
        showNotification(message, duration = 3) {
            // if there's already a notification, wait for it to finish then show new one
            if (this.notification.show) {
                this.notification.show = false;
                // clear existing timeout
                clearTimeout(this.notification.timeout);
                this.showNotification(message);
                return;
            }

            // show notification for 3 seconds
            this.notification.show = true;
            this.notification.message = message;
            this.notification.timeout = setTimeout(() => {
                this.notification.show = false;
            }, duration * 1000);
            
            // make notification appear at top of screen and move down continuously
            // this actually stopped working for some reason but whtv, was bad anyways
            this.notification.top = 0;
            var notification_interval = setInterval(() => {
                this.notification.top += 1;
                if (this.notification.top > 50) {
                    // stop moving down
                    clearInterval(notification_interval);
                }
            }, 2);
        },

        getEmojiBoard() {
            // turns tiles board into emojis
            // correct: 🟩
            // semi-correct: 🟨
            // incorrect: ⬜
            var emoji_board = "";
            for (let i = 0; i < this.tile_classes.length; i++) {
                var row = this.tile_classes[i];
                for (let j = 0; j < row.length; j++) {
                    var tile_class = row[j];
                    if (tile_class.indexOf("correct") >= 0 && tile_class.indexOf("semicorrect") == -1 && tile_class.indexOf("incorrect") == -1) {
                        emoji_board += "🟩";
                    } else if (tile_class.indexOf("semicorrect") >= 0) {
                        emoji_board += "🟨";
                    } else if (tile_class.indexOf("incorrect") >= 0) {
                        emoji_board += "⬜";
                    } else {
                        return emoji_board;
                    }
                }

                // add newline if not last row
                if (i < this.tile_classes.length - 1) {
                    emoji_board += "\n";
                }
                
                this.attempts = String(i+1);
                // if game lost, show X
                if (this.game_over && !this.game_won) {
                    this.attempts = "X";
                }
            }
            return emoji_board;
        },

        saveToLocalStorage() {
            // saves tiles, tile_classes, active_row and active_cell to local storage with key: page_name
            var url = window.location.href;
            var page_name = url.substring(url.lastIndexOf('/') + 1);
            var data = {
                tiles: this.tiles,
                tile_classes: this.tile_classes,
                key_classes: this.key_classes,
                active_row: this.active_row,
                active_cell: this.active_cell,
                todays_word: this.todays_word,
                game_over: this.game_over,
                game_won: this.game_won,
                emoji_board: this.emoji_board,
                attempts: this.attempts,
                full_word_inputted: this.full_word_inputted,
            };
            localStorage.setItem(page_name, JSON.stringify(data));
        },
        loadFromLocalStorage() {
            // if local storage has data and the daily word is the same as the todays word, then load data
            var url = window.location.href;
            var page_name = url.substring(url.lastIndexOf('/') + 1);
            var data = JSON.parse(localStorage.getItem(page_name));
            if (data && data.todays_word === this.todays_word) {
                this.tiles = data.tiles;
                this.tile_classes = data.tile_classes;
                this.key_classes = data.key_classes;
                this.active_row = data.active_row;
                this.active_cell = data.active_cell;
                this.todays_word = data.todays_word;
                this.game_over = data.game_over;
                this.game_won = data.game_won;
                this.emoji_board = data.emoji_board;
                this.attempts = data.attempts;
                this.full_word_inputted = data.full_word_inputted;
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
    },
});

app.mount('#app'); // mount vue on #app div
