import { u as useSeoMeta, _ as __nuxt_component_0 } from "../server.mjs";
import { defineComponent, withAsyncContext, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent } from "vue/server-renderer";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/hookable@5.5.3/node_modules/hookable/dist/index.mjs";
import { u as useFetch } from "./fetch-CcWu1k-3.js";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
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
      title: "Wordle Global — Statistics",
      description: "Site-wide statistics for Wordle Global across all languages."
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "max-w-4xl mx-auto px-4 py-8" }, _attrs))}><h1 class="text-2xl font-bold mb-4">Wordle Global Statistics</h1>`);
      if (unref(stats)) {
        _push(`<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate(unref(stats).total_languages)}</div><div class="text-sm text-neutral-500">Languages</div></div><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate(unref(stats).total_words?.toLocaleString())}</div><div class="text-sm text-neutral-500">Total Words</div></div><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate(unref(stats).global_plays?.toLocaleString())}</div><div class="text-sm text-neutral-500">Total Plays</div></div><div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center"><div class="text-2xl font-bold">${ssrInterpolate(unref(stats).global_win_rate)}%</div><div class="text-sm text-neutral-500">Win Rate</div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/",
        class: "text-green-600 hover:underline text-sm mt-4 inline-block"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` ← Back to languages `);
          } else {
            return [
              createTextVNode(" ← Back to languages ")
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
export {
  _sfc_main as default
};
//# sourceMappingURL=stats-D6_tk5sb.js.map
