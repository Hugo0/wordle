import { b as useRoute, c as createError, u as useSeoMeta, a as useHead, _ as __nuxt_component_0 } from "../server.mjs";
import { defineComponent, withAsyncContext, ref, mergeProps, unref, withCtx, createTextVNode, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate } from "vue/server-renderer";
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
  __name: "[id]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
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
    const title = `Word #${dayIdx} — ${langName} Wordle`;
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
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white" }, _attrs))}><div class="max-w-2xl mx-auto px-4 py-8">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: `/${unref(lang)}/words`,
        class: "text-green-600 hover:underline text-sm"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` ← All words `);
          } else {
            return [
              createTextVNode(" ← All words ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<h1 class="text-2xl font-bold mt-4 mb-2">${ssrInterpolate(unref(langName))} — Word #${ssrInterpolate(unref(dayIdx))}</h1>`);
      if (unref(dayIdx) === unref(todaysIdx)) {
        _push(`<div class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><p class="font-bold text-green-700 dark:text-green-400">Today&#39;s word!</p><p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1"> Play today&#39;s game to reveal this word. </p>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/${unref(lang)}`,
          class: "inline-block mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Play now → `);
            } else {
              return [
                createTextVNode(" Play now → ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else if (unref(dayIdx) > unref(todaysIdx)) {
        _push(`<div class="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><p class="text-neutral-500">This word hasn&#39;t been played yet.</p></div>`);
      } else {
        _push(`<div class="mt-4"><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"><p class="text-sm text-neutral-500">Word #${ssrInterpolate(unref(dayIdx))} — played in the past</p></div></div>`);
      }
      _push(`<div class="flex justify-between mt-8">`);
      if (unref(dayIdx) > 1) {
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/${unref(lang)}/word/${unref(dayIdx) - 1}`,
          class: "text-sm text-green-600 hover:underline"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` ← #${ssrInterpolate(unref(dayIdx) - 1)}`);
            } else {
              return [
                createTextVNode(" ← #" + toDisplayString(unref(dayIdx) - 1), 1)
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
              _push2(` #${ssrInterpolate(unref(dayIdx) + 1)} → `);
            } else {
              return [
                createTextVNode(" #" + toDisplayString(unref(dayIdx) + 1) + " → ", 1)
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
export {
  _sfc_main as default
};
//# sourceMappingURL=_id_-CsWIunpy.js.map
