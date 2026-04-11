<!--
  RevealTransition — smooth fade+slide entrance for content that appears asynchronously.

  Wraps Vue's <Transition> with the "reveal" animation (350ms fade + 8px slide up).
  Use for auth-dependent sections, async-loaded content, or anything that
  pops into existence after initial render.

  Usage:
    <RevealTransition>
      <div v-if="loaded">...</div>
    </RevealTransition>
-->
<template>
    <Transition name="reveal" appear>
        <slot />
    </Transition>
</template>
