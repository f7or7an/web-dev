<script setup lang="ts">
// Quelle: WebSites/_bausteine/barrierefreiheit/SiteSkipLink.vue – Änderungen dort pflegen und in die Projekte übernehmen.
// „Zum Inhalt springen“ (WCAG 2.4.1). Erstes fokussierbares Element im Layout.
// Das Ziel braucht eine id und tabindex="-1", z. B. <main id="main" tabindex="-1">.
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  target?: string
  label?: string
  class?: HTMLAttributes['class']
}>(), {
  target: '#main',
  label: 'Zum Inhalt springen',
})

// Fokus per Skript setzen: Ein reiner Anker-Sprung verschiebt den Fokus nicht in jedem Browser
// und wird vom Vue-Router teils abgefangen.
function skipToContent(event: MouseEvent) {
  const target = document.querySelector<HTMLElement>(props.target)
  if (!target) return
  event.preventDefault()
  target.focus()
  target.scrollIntoView()
}
</script>

<template>
  <a
    :href="props.target"
    :class="cn(
      'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-ring',
      props.class,
    )"
    @click="skipToContent"
  >
    {{ props.label }}
  </a>
</template>
