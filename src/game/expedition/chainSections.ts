import { EXPEDITION_CHAINS, type ExpeditionChainConfig } from './config'

export function getTrialChains(): readonly ExpeditionChainConfig[] {
  return EXPEDITION_CHAINS.filter(
    (c) => c.tier === 'featured' && c.kind === 'procedural',
  )
}

export function getTrainingChain(): ExpeditionChainConfig | undefined {
  return EXPEDITION_CHAINS.find((c) => c.id === 'campaign-main')
}

export function getDevChains(showDev: boolean): readonly ExpeditionChainConfig[] {
  if (!showDev) return []
  return EXPEDITION_CHAINS.filter((c) => c.id === 'test-single-battle')
}
