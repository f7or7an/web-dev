// Herkunft: _bausteine/sicherheit/tests/unit/zod-config.test.ts (Stand 24.11.2026)
// Die Wirkung im gebauten Server prüft das Testprojekt zusätzlich (README, „Geprüft“).
import { describe, expect, it } from 'vitest'
import { configureZod, z } from '../../shared/zod'

describe('shared/zod', () => {
  it('stellt jitless schon beim Import ein (vor dem ersten Schema)', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('liefert deutsche Fehlertexte, auch nach erneutem configureZod() (Server-Plugin)', () => {
    configureZod()
    const tooLong = z.string().max(3).safeParse('abcd')
    expect(tooLong.error?.issues[0]?.message).toBe('Zu groß: erwartet, dass string <=3 Zeichen hat')
    expect(z.string().min(1).safeParse('').error?.issues[0]?.message).toBe('Zu klein: erwartet, dass string >=1 Zeichen hat')
    expect(z.config().jitless).toBe(true)
  })
})
