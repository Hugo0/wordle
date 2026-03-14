import { b as useRoute, c as createError, u as useSeoMeta, a as useHead, _ as __nuxt_component_0 } from "../server.mjs";
import { defineComponent, computed, withAsyncContext, mergeProps, unref, withCtx, createTextVNode, createVNode, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderList } from "vue/server-renderer";
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
const WORDS_PER_PAGE = 50;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "words",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const lang = route.params.lang;
    const page = computed(() => parseInt(route.query.page || "1", 10));
    const { data: gameData, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/api/${lang}/data`,
      "$F2zML9xTbM"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    if (error.value || !gameData.value) {
      throw createError({ statusCode: 404, message: "Language not found" });
    }
    const config = gameData.value.config;
    const todaysIdx = gameData.value.todays_idx;
    const totalPages = computed(() => Math.ceil(todaysIdx / WORDS_PER_PAGE));
    const wordIndices = computed(() => {
      const start = todaysIdx - (page.value - 1) * WORDS_PER_PAGE;
      const end = Math.max(start - WORDS_PER_PAGE, 0);
      const indices = [];
      for (let i = start; i > end; i--) {
        indices.push(i);
      }
      return indices;
    });
    const langName = config.name_native || config.name;
    const title = `Wordle ${langName} — All Words`;
    const description = `Browse all ${todaysIdx} past Wordle words in ${config.name}. See definitions and community stats for every daily word.`;
    useSeoMeta({
      title,
      description,
      ogTitle: title,
      ogUrl: `https://wordle.global/${lang}/words`
    });
    useHead({
      link: [
        { rel: "canonical", href: `https://wordle.global/${lang}/words${page.value > 1 ? `?page=${page.value}` : ""}` },
        ...page.value > 1 ? [{ rel: "prev", href: `https://wordle.global/${lang}/words${page.value > 2 ? `?page=${page.value - 1}` : ""}` }] : [],
        ...page.value < totalPages.value ? [{ rel: "next", href: `https://wordle.global/${lang}/words?page=${page.value + 1}` }] : []
      ]
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white" }, _attrs))}><div class="max-w-2xl mx-auto px-4 py-8"><div class="mb-6">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: `/${unref(lang)}`,
        class: "text-green-600 hover:underline text-sm"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` ← Back to game `);
          } else {
            return [
              createTextVNode(" ← Back to game ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<h1 class="text-2xl font-bold mt-2">${ssrInterpolate(unref(langName))} — Word Archive</h1><p class="text-sm text-neutral-500">${ssrInterpolate(unref(todaysIdx))} words and counting</p></div><div class="space-y-1"><!--[-->`);
      ssrRenderList(unref(wordIndices), (idx) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: idx,
          to: `/${unref(lang)}/word/${idx}`,
          class: "flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<span class="font-mono text-sm text-neutral-500"${_scopeId}>#${ssrInterpolate(idx)}</span><span class="text-sm text-green-600"${_scopeId}>View →</span>`);
            } else {
              return [
                createVNode("span", { class: "font-mono text-sm text-neutral-500" }, "#" + toDisplayString(idx), 1),
                createVNode("span", { class: "text-sm text-green-600" }, "View →")
              ];
            }
          }),
          _: 2
        }, _parent));
      });
      _push(`<!--]--></div><div class="flex justify-between items-center mt-8">`);
      if (unref(page) > 1) {
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/${unref(lang)}/words${unref(page) > 2 ? `?page=${unref(page) - 1}` : ""}`,
          class: "px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg text-sm"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` ← Newer `);
            } else {
              return [
                createTextVNode(" ← Newer ")
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<span></span>`);
      }
      _push(`<span class="text-sm text-neutral-500">Page ${ssrInterpolate(unref(page))} of ${ssrInterpolate(unref(totalPages))}</span>`);
      if (unref(page) < unref(totalPages)) {
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/${unref(lang)}/words?page=${unref(page) + 1}`,
          class: "px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg text-sm"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Older → `);
            } else {
              return [
                createTextVNode(" Older → ")
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<span></span>`);
      }
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/[lang]/words.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=words-D0LJzL4J.js.map
