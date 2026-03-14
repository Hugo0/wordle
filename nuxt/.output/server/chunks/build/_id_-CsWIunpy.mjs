import { b as useRoute$1, c as createError, u as useSeoMeta, a as useHead, _ as __nuxt_component_0$1 } from './server.mjs';
import { defineComponent, withAsyncContext, ref, mergeProps, unref, withCtx, createTextVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate } from 'vue/server-renderer';
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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[id]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute$1();
    const lang = route.params.lang;
    const dayIdx = parseInt(route.params.id, 10);
    const { data: gameData, error: gameError } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/api/${lang}/data`,
      "$WgolSAbrP3"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    if (gameError.value || !gameData.value) {
      throw createError({ statusCode: 404, message: "Language not found" });
    }
    const config = gameData.value.config;
    const todaysIdx = gameData.value.todays_idx;
    const langName = config.name_native || config.name;
    const title = `Word #${dayIdx} \u2014 ${langName} Wordle`;
    const description = `${langName} Wordle word #${dayIdx}. See the definition, community stats, and AI-generated art.`;
    useSeoMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: `https://wordle.global/${lang}/word/${dayIdx}`
    });
    useHead({
      link: [{ rel: "canonical", href: `https://wordle.global/${lang}/word/${dayIdx}` }]
    });
    ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white" }, _attrs))}><div class="max-w-2xl mx-auto px-4 py-8">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: `/${unref(lang)}/words`,
        class: "text-green-600 hover:underline text-sm"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` \u2190 All words `);
          } else {
            return [
              createTextVNode(" \u2190 All words ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<h1 class="text-2xl font-bold mt-4 mb-2">${ssrInterpolate(unref(langName))} \u2014 Word #${ssrInterpolate(unref(dayIdx))}</h1>`);
      if (unref(dayIdx) === unref(todaysIdx)) {
        _push(`<div class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><p class="font-bold text-green-700 dark:text-green-400">Today&#39;s word!</p><p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1"> Play today&#39;s game to reveal this word. </p>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/${unref(lang)}`,
          class: "inline-block mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Play now \u2192 `);
            } else {
              return [
                createTextVNode(" Play now \u2192 ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else if (unref(dayIdx) > unref(todaysIdx)) {
        _push(`<div class="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><p class="text-neutral-500">This word hasn&#39;t been played yet.</p></div>`);
      } else {
        _push(`<div class="mt-4"><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><p class="text-sm text-neutral-500">Word #${ssrInterpolate(unref(dayIdx))} \u2014 played in the past</p></div></div>`);
      }
      _push(`<div class="flex justify-between mt-8">`);
      if (unref(dayIdx) > 1) {
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/${unref(lang)}/word/${unref(dayIdx) - 1}`,
          class: "text-sm text-green-600 hover:underline"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` \u2190 #${ssrInterpolate(unref(dayIdx) - 1)}`);
            } else {
              return [
                createTextVNode(" \u2190 #" + toDisplayString(unref(dayIdx) - 1), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<span></span>`);
      }
      if (unref(dayIdx) < unref(todaysIdx)) {
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/${unref(lang)}/word/${unref(dayIdx) + 1}`,
          class: "text-sm text-green-600 hover:underline"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` #${ssrInterpolate(unref(dayIdx) + 1)} \u2192 `);
            } else {
              return [
                createTextVNode(" #" + toDisplayString(unref(dayIdx) + 1) + " \u2192 ", 1)
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/[lang]/word/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-CsWIunpy.mjs.map
