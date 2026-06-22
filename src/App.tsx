import { Analytics } from '@vercel/analytics/react'
import { App as AntdApp } from 'antd'
import { BattleScreen } from './features/battle/BattleScreen'
import { CampaignHub } from './features/campaign/CampaignHub'
import { InterBattleScreen } from './features/campaign/InterBattleScreen'
import { useGameStore } from './store/gameStore'

function AppContent() {
  const campaign = useGameStore((s) => s.campaign)
  if (campaign.phase === 'inter_battle') return <InterBattleScreen />
  if (campaign.battle !== null) return <BattleScreen />
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
