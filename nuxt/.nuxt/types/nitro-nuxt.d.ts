
/// <reference path="nitro-layouts.d.ts" />
/// <reference path="app.config.d.ts" />
/// <reference path="runtime-config.d.ts" />
/// <reference path="../../node_modules/.pnpm/@nuxt+nitro-server@3.21.2_db0@0.3.4_ioredis@5.10.0_magicast@0.5.2_nuxt@3.21.2_@parcel+w_5f6482d5f82f46663f3fe203fa79cafa/node_modules/@nuxt/nitro-server/dist/index.d.mts" />
/// <reference path="nitro-middleware.d.ts" />
/// <reference path="./schema.d.ts" />

import type { RuntimeConfig } from 'nuxt/schema'
import type { H3Event } from 'h3'
import type { LogObject } from 'consola'
import type { NuxtIslandContext, NuxtIslandResponse, NuxtRenderHTMLContext } from 'nuxt/app'

declare module 'nitropack' {
  interface NitroRuntimeConfigApp {
    buildAssetsDir: string
    cdnURL: string
  }
  interface NitroRuntimeConfig extends RuntimeConfig {}
  interface NitroRouteConfig {
    ssr?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
  }
  interface NitroRouteRules {
    ssr?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
    appMiddleware?: Record<string, boolean>
    appLayout?: string | false
  }
  interface NitroRuntimeHooks {
    'dev:ssr-logs': (ctx: { logs: LogObject[], path: string }) => void | Promise<void>
    'render:html': (htmlContext: NuxtRenderHTMLContext, context: { event: H3Event }) => void | Promise<void>
    'render:island': (islandResponse: NuxtIslandResponse, context: { event: H3Event, islandContext: NuxtIslandContext }) => void | Promise<void>
  }
}
