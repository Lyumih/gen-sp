import { App as AntdApp } from 'antd'
import { BattleScreen } from './features/battle/BattleScreen'
import { CampaignHub } from './features/campaign/CampaignHub'
import { useGameStore } from './store/gameStore'

function AppContent() {
  const battle = useGameStore((s) => s.campaign.battle)
  if (battle) return <BattleScreen />
  return <CampaignHub />
}

function App() {
  return (
    <AntdApp>
      <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
        <AppContent />
      </div>
    </AntdApp>
  )
}

export default App
