import { createHash, randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'

export async function emitSimulatedCrossChainFlow(input: { correlationId: string; purpose: string; simulatedSourceChain: string; simulatedAsset: string; simulatedAmountDisplay: string }, database = prisma) {
  const stages = ['SIMULATED_SOURCE_EVENT', 'SIMULATED_BRIDGE_INITIATED', 'SIMULATED_DESTINATION_EVENT', 'SIMULATED_BRIDGE_COMPLETED']
  const results = []
  for (const eventType of stages) {
    const syntheticReference = `SIM-NO-TX-${randomUUID()}`
    const metadata = { syntheticReference, purpose: input.purpose, simulatedSourceChain: input.simulatedSourceChain, simulatedAsset: input.simulatedAsset, simulatedAmountDisplay: input.simulatedAmountDisplay, financialEffect: 'NONE' }
    results.push(await database.blockchainEvent.create({ data: { correlationId: input.correlationId, eventType, environment: 'SIMULATED_CROSS_CHAIN', chainId: null, contractAddress: null, txHash: syntheticReference, blockNumber: null, payloadCommitmentHash: createHash('sha256').update(JSON.stringify(metadata)).digest('hex'), metadataJson: metadata as Prisma.InputJsonValue } }))
  }
  return results
}
