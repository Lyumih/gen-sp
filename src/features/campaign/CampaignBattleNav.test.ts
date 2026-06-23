import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import type { BattleState } from '../../game/types'
import { CampaignBattleNav } from './CampaignBattleNav'

describe('CampaignBattleNav', () => {
  it('renders help section trigger in battle context nav', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignBattleNav, {
        campaign: {
          ...initialCampaignState(),
          battle: { units: [] } as unknown as BattleState,
        },
      }),
    )

    expect(html).toContain('Справка')
  })
})
