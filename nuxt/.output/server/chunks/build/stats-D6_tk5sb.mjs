import { u as useSeoMeta, _ as __nuxt_component_0$1 } from './server.mjs';
import { defineComponent, withAsyncContext, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent } from 'vue/server-renderer';
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
  __name: "stats",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { data: stats } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      "/api/stats",
      "$dif7Q1pzrN"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    useSeoMeta({
      title: "Wordle Global \u2014 Statistics",
      description: "Site-wide statistics for Wordle Global across all languages."
    });
    return (_ctx, _push, _parent, _attrs) => {
      var _a, _b;
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "max-w-4xl mx-auto px-4 py-8" }, _attrs))}><h1 class="text-2xl font-bold mb-4">Wordle Global Statistics</h1>`);
      if (unref(stats)) {
        _push(`<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate(unref(stats).total_languages)}</div><div class="text-sm text-neutral-500">Languages</div></div><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate((_a = unref(stats).total_words) == null ? void 0 : _a.toLocaleString())}</div><div class="text-sm text-neutral-500">Total Words</div></div><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate((_b = unref(stats).global_plays) == null ? void 0 : _b.toLocaleString())}</div><div class="text-sm text-neutral-500">Total Plays</div></div><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate(unref(stats).global_win_rate)}%</div><div class="text-sm text-neutral-500">Win Rate</div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/",
        class: "text-green-600 hover:underline text-sm mt-4 inline-block"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` \u2190 Back to languages `);
          } else {
            return [
              createTextVNode(" \u2190 Back to languages ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/stats.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=stats-D6_tk5sb.mjs.map
