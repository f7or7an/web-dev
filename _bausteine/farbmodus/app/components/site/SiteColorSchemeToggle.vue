<script setup lang="ts">
// Herkunft: _bausteine/farbmodus/app/components/site/SiteColorSchemeToggle.vue (Stand 21.11.2026)
// Drei echte Buttons (System, Hell, Dunkel) mit aria-pressed. Bei i18n die Texte per `labels` übergeben.
import type { HTMLAttributes } from 'vue'
import { Monitor, Moon, Sun } from '@lucide/vue'
import { cn } from '@/lib/utils'

interface ColorSchemeLabels {
  group: string
  system: string
  light: string
  dark: string
}

const props = withDefaults(defineProps<{
  labels?: ColorSchemeLabels
  // Standard true: sichtbarer Name (Regel Farbmodus Punkt 7). false nur als begründete Ausnahme
  // für sehr enge Kopfzeilen; der Name steht dann als sr-only-Text im Button.
  showLabels?: boolean
  class?: HTMLAttributes['class']
}>(), {
  labels: () => ({ group: 'Farbmodus', system: 'Wie System', light: 'Hell', dark: 'Dunkel' }),
  showLabels: true,
})

const { preference, isReady, setPreference } = useColorScheme()

const options = computed(() => [
  { value: 'system' as const, label: props.labels.system, icon: Monitor },
  { value: 'light' as const, label: props.labels.light, icon: Sun },
  { value: 'dark' as const, label: props.labels.dark, icon: Moon },
])
</script>

<template>
  <div
    role="group"
    :aria-label="props.labels.group"
    :class="cn('inline-flex flex-wrap items-center gap-0.5 rounded-md border border-input p-0.5', props.class)"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="isReady ? preference === option.value : undefined"
      :class="cn(
        'inline-flex min-h-8 min-w-8 items-center justify-center gap-1.5 rounded-sm px-2 text-sm whitespace-nowrap text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        // Gewählt = Vorder- und Hintergrundfarbe vertauscht: hat in jedem Projekt und Modus den Text-Kontrast
        'aria-pressed:bg-foreground aria-pressed:text-background',
      )"
      @click="setPreference(option.value)"
    >
      <component
        :is="option.icon"
        class="size-4 shrink-0"
        aria-hidden="true"
      />
      <span :class="props.showLabels ? undefined : 'sr-only'">{{ option.label }}</span>
    </button>
  </div>
</template>
