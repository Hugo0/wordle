
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


export const GameBoard: typeof import("../components/game/GameBoard.vue")['default']
export const GameHeader: typeof import("../components/game/GameHeader.vue")['default']
export const GameKeyboard: typeof import("../components/game/GameKeyboard.vue")['default']
export const GameHelpModal: typeof import("../components/game/HelpModal.vue")['default']
export const GameKeyboardKey: typeof import("../components/game/KeyboardKey.vue")['default']
export const GameNotificationToast: typeof import("../components/game/NotificationToast.vue")['default']
export const GameSettingsModal: typeof import("../components/game/SettingsModal.vue")['default']
export const GameStatsModal: typeof import("../components/game/StatsModal.vue")['default']
export const GameTile: typeof import("../components/game/Tile.vue")['default']
export const GameTileRow: typeof import("../components/game/TileRow.vue")['default']
export const SharedModalBackdrop: typeof import("../components/shared/ModalBackdrop.vue")['default']
export const SharedToggleSwitch: typeof import("../components/shared/ToggleSwitch.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const VitePwaManifest: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
export const NuxtPwaManifest: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
export const NuxtPwaAssets: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']
export const PwaAppleImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']
export const PwaAppleSplashScreenImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']
export const PwaFaviconImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']
export const PwaMaskableImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']
export const PwaTransparentImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']
export const NuxtPage: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyGameBoard: LazyComponent<typeof import("../components/game/GameBoard.vue")['default']>
export const LazyGameHeader: LazyComponent<typeof import("../components/game/GameHeader.vue")['default']>
export const LazyGameKeyboard: LazyComponent<typeof import("../components/game/GameKeyboard.vue")['default']>
export const LazyGameHelpModal: LazyComponent<typeof import("../components/game/HelpModal.vue")['default']>
export const LazyGameKeyboardKey: LazyComponent<typeof import("../components/game/KeyboardKey.vue")['default']>
export const LazyGameNotificationToast: LazyComponent<typeof import("../components/game/NotificationToast.vue")['default']>
export const LazyGameSettingsModal: LazyComponent<typeof import("../components/game/SettingsModal.vue")['default']>
export const LazyGameStatsModal: LazyComponent<typeof import("../components/game/StatsModal.vue")['default']>
export const LazyGameTile: LazyComponent<typeof import("../components/game/Tile.vue")['default']>
export const LazyGameTileRow: LazyComponent<typeof import("../components/game/TileRow.vue")['default']>
export const LazySharedModalBackdrop: LazyComponent<typeof import("../components/shared/ModalBackdrop.vue")['default']>
export const LazySharedToggleSwitch: LazyComponent<typeof import("../components/shared/ToggleSwitch.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyVitePwaManifest: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
export const LazyNuxtPwaManifest: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
export const LazyNuxtPwaAssets: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']>
export const LazyPwaAppleImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']>
export const LazyPwaAppleSplashScreenImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']>
export const LazyPwaFaviconImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']>
export const LazyPwaMaskableImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']>
export const LazyPwaTransparentImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@0.10.8_magicast@0.5.2_vite@7.3.1_@types+node@25.5.0_jiti@2.6.1_lightning_0b2042d5f13b662e8348d280bd554952/node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@3.21.2_@parcel+watcher@2.5.6_@types+node@25.5.0_@vue+compiler-sfc@3.5.30_cac@6.7.1_6d7d18c5e2216e9bd85e418e561ff949/node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
