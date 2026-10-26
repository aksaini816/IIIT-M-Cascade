import { describe, expect, it, vi } from 'vitest'
import { emitSimulatedCrossChainFlow } from '../src/modules/blockchain/simulatedCrossChain.adapter.js'
import { localEvmStatus } from '../src/modules/blockchain/evm.service.js'

describe('backend blockchain namespaces', () => {
  it('stores simulated flow records only in the simulated namespace with no financial writes', async () => {
    const events: any[] = []
    const create = vi.fn().mockImplementation(({ data }) => {
      events.push(data)
      return Promise.resolve(data)
    })
    const database: any = { blockchainEvent: { create } }
    const result = await emitSimulatedCrossChainFlow({ correlationId: 'corr-1', purpose: 'education supplies', simulatedSourceChain: 'Ethereum', simulatedAsset: 'ETH', simulatedAmountDisplay: '50 ETH' }, database)
    expect(result).toHaveLength(4)
    expect(events.every((event) => event.environment === 'SIMULATED_CROSS_CHAIN')).toBe(true)
    expect(events.every((event) => event.txHash.startsWith('SIM-NO-TX-'))).toBe(true)
    expect(events.every((event) => event.metadataJson.financialEffect === 'NONE')).toBe(true)
    expect(database.campaign).toBeUndefined()
    expect(database.donation).toBeUndefined()
    expect(database.allocation).toBeUndefined()
    expect(database.payout).toBeUndefined()
  })

  it('keeps local EVM connectivity optional and reports offline status', async () => {
    const previous = process.env.LOCAL_RPC_URL
    process.env.LOCAL_RPC_URL = 'http://127.0.0.1:1'
    const status = await localEvmStatus()
    expect(status.connected).toBe(false)
    expect(status.chainId).toBeNull()
    process.env.LOCAL_RPC_URL = previous
  })
})
