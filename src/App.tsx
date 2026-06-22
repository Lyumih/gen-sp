import { Analytics } from '@vercel/analytics/react'
import { App as AntdApp, Space } from 'antd'
import { BattleScreen } from './features/battle/BattleScreen'
import { CampaignBattleNav } from './features/campaign/CampaignBattleNav'
import { CampaignHub } from './features/campaign/CampaignHub'
import { InterBattleScreen } from './features/campaign/InterBattleScreen'
import { useGameStore } from './store/gameStore'

function AppContent() {
  const campaign = useGameStore((s) => s.campaign)
  if (campaign.phase === 'inter_battle') {
    return (
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <CampaignBattleNav campaign={campaign} />
        <InterBattleScreen />
      </Space>
    )
  }
  if (campaign.battle !== null) {
    return (
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <CampaignBattleNav campaign={campaign} />
        <BattleScreen />
      </Space>
    )
  }
  return <CampaignHub />
}

function App() {
  return (
    <AntdApp>
      <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
        <AppContent />
      </div>
      <Analytics />
    </AntdApp>
  )
}

export default App
