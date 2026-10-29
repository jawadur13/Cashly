import { describe, expect, it } from 'vitest'
import { GUIDE, guideItemText } from './guide'

describe('user guide content', () => {
  it('has unique anchors, so /help#… links always land on one place', () => {
    const ids = GUIDE.flatMap((s) => [s.id, ...s.items.map((i) => i.id)])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no empty sections or answers', () => {
    for (const section of GUIDE) {
      expect(section.items.length).toBeGreaterThan(0)
      for (const item of section.items) expect(item.answer.join('').trim().length).toBeGreaterThan(0)
    }
  })

  it('makes every item searchable by its words', () => {
    const item = GUIDE.find((s) => s.id === 'transfers')!.items[0]
    expect(guideItemText(item)).toContain('atm')
  })
})
