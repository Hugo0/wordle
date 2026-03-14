
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T

interface _GlobalComponents {
  GameBoard: typeof import("../../components/game/GameBoard.vue")['default']
  GameHeader: typeof import("../../components/game/GameHeader.vue")['default']
  GameKeyboard: typeof import("../../components/game/GameKeyboard.vue")['default']
  GameHelpModal: typeof import("../../components/game/HelpModal.vue")['default']
  GameKeyboardKey: typeof import("../../components/game/KeyboardKey.vue")['default']
  GameNotificationToast: typeof import("../../components/game/NotificationToast.vue")['default']
  GameSettingsModal: typeof import("../../components/game/SettingsModal.vue")['default']
  GameStatsModal: typeof import("../../components/game/StatsModal.vue")['default']
  GameTile: typeof import("../../components/game/Tile.vue")['default']
  GameTileRow: typeof import("../../components/game/TileRow.vue")['default']
  SharedModalBackdrop: typeof import("../../components/shared/ModalBackdrop.vue")['default']
  SharedToggleSwitch: typeof import("../../components/shared/ToggleSwitch.vue")['default']
  NuxtWelcome: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtImg: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  NuxtPicture: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  VitePwaManifest: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
  NuxtPwaManifest: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
  NuxtPwaAssets: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']
  PwaAppleImage: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']
  PwaAppleSplashScreenImage: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']
  PwaFaviconImage: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']
  PwaMaskableImage: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']
  PwaTransparentImage: typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']
  NuxtPage: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Body']
  NuxtIsland: typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyGameBoard: LazyComponent<typeof import("../../components/game/GameBoard.vue")['default']>
  LazyGameHeader: LazyComponent<typeof import("../../components/game/GameHeader.vue")['default']>
  LazyGameKeyboard: LazyComponent<typeof import("../../components/game/GameKeyboard.vue")['default']>
  LazyGameHelpModal: LazyComponent<typeof import("../../components/game/HelpModal.vue")['default']>
  LazyGameKeyboardKey: LazyComponent<typeof import("../../components/game/KeyboardKey.vue")['default']>
  LazyGameNotificationToast: LazyComponent<typeof import("../../components/game/NotificationToast.vue")['default']>
  LazyGameSettingsModal: LazyComponent<typeof import("../../components/game/SettingsModal.vue")['default']>
  LazyGameStatsModal: LazyComponent<typeof import("../../components/game/StatsModal.vue")['default']>
  LazyGameTile: LazyComponent<typeof import("../../components/game/Tile.vue")['default']>
  LazyGameTileRow: LazyComponent<typeof import("../../components/game/TileRow.vue")['default']>
  LazySharedModalBackdrop: LazyComponent<typeof import("../../components/shared/ModalBackdrop.vue")['default']>
  LazySharedToggleSwitch: LazyComponent<typeof import("../../components/shared/ToggleSwitch.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  LazyNuxtPicture: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  LazyVitePwaManifest: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
  LazyNuxtPwaManifest: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
  LazyNuxtPwaAssets: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']>
  LazyPwaAppleImage: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']>
  LazyPwaAppleSplashScreenImage: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']>
  LazyPwaFaviconImage: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']>
  LazyPwaMaskableImage: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']>
  LazyPwaTransparentImage: LazyComponent<typeof import("../../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']>
  LazyNuxtPage: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyNuxtIsland: LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
