<script setup lang="ts">
// Herkunft: _bausteine/sicherheit/tests/build/fixtures/ErrorLogTestPage.vue (Stand 24.11.2026)
// Nur für den Build-Test (error-log-test-env.ts): Seitenfehler beim SSR. `boom` = unbehandelt, sonst fatal 404,
// dessen Meldung Nuxts Fehlerseite zeigen muss. Explizite Importe, weil die Datei außerhalb von app/ liegt.
import { createError, useRoute } from '#app'

const route = useRoute()
if (route.params.token === 'boom') throw new Error('geheim person@example.org')
throw createError({ status: 404, statusText: 'Nicht gefunden', message: 'Diese Seite gibt es nicht', fatal: true })
</script>

<template>
  <p>Nie sichtbar</p>
</template>
