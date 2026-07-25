import { Analytics } from '@vercel/analytics/react'
import { App as AntdApp, ConfigProvider, Space } from 'antd'
import { antdGameTheme } from './theme/antdGameTheme'
import { BattleScreen } from './features/battle/BattleScreen'
import { CampaignBattleNav } from './features/campaign/CampaignBattleNav'
import { CampaignHub } from './features/campaign/CampaignHub'
import { InterBattleScreen } from './features/campaign/InterBattleScreen'
import { CampaignReferenceDrawer } from './features/campaign/CampaignReferenceDrawer'
import { useGameStore } from './store/gameStore'

function AppContent() {
  const campaign = useGameStore((s) => s.campaign)
  if (campaign.phase === 'inter_battle') {
    return (
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <CampaignBattleNav campaign={campaign} />
        <InterBattleScreen />
      </Space>
    )
  }
  if (campaign.battle !== null) {
    return (
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <CampaignBattleNav campaign={campaign} />
        <BattleScreen />
      </Space>
    )
  }
  return <CampaignHub />
}

function GameRoot() {
  const campaign = useGameStore((s) => s.campaign)
  return (
    <>
      <AppContent />
      <CampaignReferenceDrawer campaign={campaign} />
    </>
  )
}

function App() {
  return (
    <ConfigProvider theme={antdGameTheme}>
      <AntdApp>
        <div
          className="game-app-shell"
          style={{ maxWidth: 1280, margin: '0 auto', padding: 8 }}
        >
          <GameRoot />
        </div>
        <Analytics />
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
