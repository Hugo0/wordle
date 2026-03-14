import { b as useRoute$1, c as createError, u as useSeoMeta, a as useHead, _ as __nuxt_component_0$1 } from './server.mjs';
import { defineComponent, computed, withAsyncContext, mergeProps, unref, withCtx, createTextVNode, createVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderList } from 'vue/server-renderer';
import { u as useFetch } from './fetch-CcWu1k-3.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/plugins';
import 'unhead/utils';
import 'pinia';
import 'perfect-debounce';

const WORDS_PER_PAGE = 50;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "words",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute$1();
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
    const title = `Wordle ${langName} \u2014 All Words`;
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
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white" }, _attrs))}><div class="max-w-2xl mx-auto px-4 py-8"><div class="mb-6">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: `/${unref(lang)}`,
        class: "text-green-600 hover:underline text-sm"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` \u2190 Back to game `);
          } else {
            return [
              createTextVNode(" \u2190 Back to game ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<h1 class="text-2xl font-bold mt-2">${ssrInterpolate(unref(langName))} \u2014 Word Archive</h1><p class="text-sm text-neutral-500">${ssrInterpolate(unref(todaysIdx))} words and counting</p></div><div class="space-y-1"><!--[-->`);
      ssrRenderList(unref(wordIndices), (idx) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: idx,
          to: `/${unref(lang)}/word/${idx}`,
          class: "flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<span class="font-mono text-sm text-neutral-500"${_scopeId}>#${ssrInterpolate(idx)}</span><span class="text-sm text-green-600"${_scopeId}>View \u2192</span>`);
            } else {
              return [
                createVNode("span", { class: "font-mono text-sm text-neutral-500" }, "#" + toDisplayString(idx), 1),
                createVNode("span", { class: "text-sm text-green-600" }, "View \u2192")
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
              _push2(` \u2190 Newer `);
            } else {
              return [
                createTextVNode(" \u2190 Newer ")
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
              _push2(` Older \u2192 `);
            } else {
              return [
                createTextVNode(" Older \u2192 ")
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

export { _sfc_main as default };
//# sourceMappingURL=words-D0LJzL4J.mjs.map
