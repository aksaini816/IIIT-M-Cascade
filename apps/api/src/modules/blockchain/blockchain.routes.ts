import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../prisma.js'
import { requireAuth } from '../../middleware/rbac.js'
import { anchorLatestAuditRoot, localEvmStatus } from './evm.service.js'
import { emitSimulatedCrossChainFlow } from './simulatedCrossChain.adapter.js'

const simulationSchema = z.object({ correlationId: z.string().min(1), purpose: z.string().min(1), simulatedSourceChain: z.string().min(1), simulatedAsset: z.string().min(1), simulatedAmountDisplay: z.string().min(1) })
export const blockchainRouter = Router()
blockchainRouter.get('/status', async (_request, response, next) => { try { response.json(await localEvmStatus()) } catch (error) { next(error) } })
blockchainRouter.get('/events', async (request, response, next) => {
  try {
    const environment = typeof request.query.environment === 'string' ? request.query.environment : undefined
    const events = await prisma.blockchainEvent.findMany({ where: environment ? { environment: environment as 'LOCAL_EVM' | 'SIMULATED_CROSS_CHAIN' } : undefined, orderBy: { createdAt: 'desc' } })
    response.json({ events: events.map((event) => ({ ...event, blockNumber: event.blockNumber === null ? null : event.blockNumber.toString() })) })
  } catch (error) { next(error) }
})
blockchainRouter.post('/simulate-cross-chain', requireAuth, async (request, response, next) => { try { response.status(201).json({ events: await emitSimulatedCrossChainFlow(simulationSchema.parse(request.body)) }) } catch (error) { next(error) } })
blockchainRouter.post('/anchor-audit', requireAuth, async (request, response, next) => { try { response.status(201).json(await anchorLatestAuditRoot(request.sessionContext!.userId)) } catch (error) { next(error) } })
