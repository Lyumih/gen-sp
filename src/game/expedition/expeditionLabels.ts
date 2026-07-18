import { getExpeditionChainById } from './config'

export function getExpeditionChainLabel(chainId: string): string {
  return getExpeditionChainById(chainId)?.label ?? chainId
}
