import { u as useSeoMeta, a as useHead, _ as __nuxt_component_0 } from "../server.mjs";
import { defineComponent, withAsyncContext, computed, ref, mergeProps, unref, withCtx, createVNode, toDisplayString, openBlock, createBlock, createCommentVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderAttr, ssrRenderList, ssrRenderComponent } from "vue/server-renderer";
import { u as useFetch } from "./fetch-CcWu1k-3.js";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/hookable@5.5.3/node_modules/hookable/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unctx@2.5.0/node_modules/unctx/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/h3@1.15.6/node_modules/h3/dist/index.mjs";
import "pinia";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/defu@6.1.4/node_modules/defu/dist/defu.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ufo@1.6.3/node_modules/ufo/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/klona@2.0.6/node_modules/klona/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/@unhead+vue@2.1.12_vue@3.5.30_typescript@5.9.3_/node_modules/@unhead/vue/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ohash@2.0.11/node_modules/ohash/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/perfect-debounce@2.1.0/node_modules/perfect-debounce/dist/index.mjs";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { data: langData } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      "/api/languages",
      "$hZ0pDtR488"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    const langCount = computed(() => langData.value?.language_codes?.length || 65);
    useSeoMeta({
      title: `Wordle Global — Play the Free Daily Word Game in ${langCount.value}+ Languages`,
      description: `Play Wordle today in ${langCount.value}+ languages — free, daily 5-letter word puzzle. Guess the word in 6 tries. No account needed.`,
      ogTitle: `Wordle Global — Daily Word Puzzle in ${langCount.value}+ Languages`,
      ogDescription: `Free daily word game in ${langCount.value}+ languages. Guess the hidden 5-letter word in 6 tries.`,
      ogUrl: "https://wordle.global/",
      ogType: "website",
      ogLocale: "en",
      twitterCard: "summary_large_image"
    });
    useHead({
      link: [
        { rel: "canonical", href: "https://wordle.global/" },
        { rel: "sitemap", type: "application/xml", title: "Sitemap", href: "/sitemap.xml" }
      ],
      meta: [{ name: "msvalidate.01", content: "609E2DD36EFFA9A3C673F46020FDF0D3" }],
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Wordle Global",
            url: "https://wordle.global",
            applicationCategory: "GameApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            inLanguage: langData.value?.language_codes || []
          })
        }
      ]
    });
    const searchQuery = ref("");
    const sortedLanguages = computed(() => {
      if (!langData.value) return [];
      const langs = langData.value.language_popularity || langData.value.language_codes || [];
      const langMap = langData.value.languages || {};
      let filtered = langs.map((lc) => ({
        code: lc,
        name: langMap[lc]?.language_name || lc,
        nameNative: langMap[lc]?.language_name_native || lc
      }));
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        filtered = filtered.filter(
          (l) => l.name.toLowerCase().includes(q) || l.nameNative.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
        );
      }
      return filtered;
    });
    const playedLanguages = ref(/* @__PURE__ */ new Set());
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white" }, _attrs))}><div class="container mx-auto max-w-2xl px-4 py-8"><div class="text-center mb-8"><h1 class="text-4xl font-bold tracking-wider mb-2"> WORDLE <span class="text-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded px-2 py-0.5"> GLOBAL </span></h1><p class="text-neutral-500 dark:text-neutral-400"> Daily word puzzle in ${ssrInterpolate(unref(langCount))}+ languages </p></div><div class="mb-6"><input${ssrRenderAttr("value", unref(searchQuery))} type="text" placeholder="Search languages..." class="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"></div><div class="grid grid-cols-2 sm:grid-cols-3 gap-3"><!--[-->`);
      ssrRenderList(unref(sortedLanguages), (lang) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: lang.code,
          to: `/${lang.code}`,
          class: "flex flex-col p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-green-500 dark:hover:border-green-500 transition-colors"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<span class="font-bold text-sm"${_scopeId}>${ssrInterpolate(lang.nameNative)}</span><span class="text-xs text-neutral-500"${_scopeId}>${ssrInterpolate(lang.name)}</span>`);
              if (unref(playedLanguages).has(lang.code)) {
                _push2(`<span class="text-xs text-green-500 mt-1"${_scopeId}> Played </span>`);
              } else {
                _push2(`<!---->`);
              }
            } else {
              return [
                createVNode("span", { class: "font-bold text-sm" }, toDisplayString(lang.nameNative), 1),
                createVNode("span", { class: "text-xs text-neutral-500" }, toDisplayString(lang.name), 1),
                unref(playedLanguages).has(lang.code) ? (openBlock(), createBlock("span", {
                  key: 0,
                  class: "text-xs text-green-500 mt-1"
                }, " Played ")) : createCommentVNode("", true)
              ];
            }
          }),
          _: 2
        }, _parent));
      });
      _push(`<!--]--></div><div class="text-center mt-12 text-sm text-neutral-400"><p><a href="https://github.com/Hugo0/wordle" class="hover:text-green-500 transition-colors" target="_blank"> Open Source </a> · No ads · Free forever </p></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=index-DFL9FbB_.js.map
