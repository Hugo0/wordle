import { d as defineEventHandler, s as setResponseHeader } from '../nitro/nitro.mjs';
import { l as loadAllData } from '../_/data-loader.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'fs';
import 'path';

const llms_txt = defineEventHandler((event) => {
  const data = loadAllData();
  const langLines = [...data.languageCodes].sort().map((lc) => {
    var _a;
    return `- [${(_a = data.languages[lc]) == null ? void 0 : _a.language_name}](https://wordle.global/${lc})`;
  }).join("\n");
  setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8");
  return `# Wordle Global

> Free, open-source Wordle in ${data.languageCodes.length}+ languages. A new 5-letter word to guess every day.

Play at https://wordle.global

## Languages

${langLines}

## About

- Each day has a new 5-letter word to guess in 6 tries
- Green = correct letter in correct position
- Yellow = correct letter in wrong position
- Gray = letter not in the word
- Free, no account required, works offline (PWA)
- Open source: https://github.com/Hugo0/wordle
`;
});

export { llms_txt as default };
//# sourceMappingURL=llms.txt.mjs.map
