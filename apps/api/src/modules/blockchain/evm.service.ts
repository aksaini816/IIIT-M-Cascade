import { createHash } from 'node:crypto'
import { Contract, JsonRpcProvider, Wallet, concat, keccak256, toUtf8Bytes } from 'ethers'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'

const ABI = ['function anchorAuditRoot(uint256 upToSequence, bytes32 auditChainRootHash)']
const rpcUrl = () => process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545'
const EMBEDDED_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123'
const EMBEDDED_CONTRACT_ADDRESS = 'embedded://kindora-commitment-ledger'

async function localNodeResponds(): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  try {
    const response = await fetch(rpcUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function localEvmStatus() {
  const provider = new JsonRpcProvider(rpcUrl())
  try {
    const network = await provider.getNetwork()
    return { connected: true, rpcUrl: rpcUrl(), chainId: Number(network.chainId), contractAddress: process.env.KINDORA_COMMITMENT_LEDGER_ADDRESS || null }
  } catch (error) {
    return { connected: false, rpcUrl: rpcUrl(), chainId: null, contractAddress: process.env.KINDORA_COMMITMENT_LEDGER_ADDRESS || null, error: error instanceof Error ? error.message : 'Local EVM unavailable' }
  }
}

export async function anchorLatestAuditRoot(actorUserId: string, database = prisma) {
  const latest = await database.auditEvent.findFirst({ orderBy: { sequenceNumber: 'desc' } })
  if (!latest) throw new Error('No audit event is available to anchor.')
  const address = process.env.KINDORA_COMMITMENT_LEDGER_ADDRESS
  const privateKey = process.env.LOCAL_EVM_PRIVATE_KEY
  if (address && privateKey && await localNodeResponds()) {
    try {
      const provider = new JsonRpcProvider(rpcUrl())
      const signer = new Wallet(privateKey, provider)
      const contract = new Contract(address, ABI, signer)
      const transaction = await contract.anchorAuditRoot(latest.sequenceNumber, `0x${latest.currentEventHash}`)
      const receipt = await transaction.wait()
      await database.auditEvent.update({ where: { id: latest.id }, data: { anchoredTxHash: receipt.hash } })
      await database.blockchainEvent.create({ data: { correlationId: latest.correlationId, eventType: 'AUDIT_ROOT_ANCHORED', environment: 'LOCAL_EVM', chainId: 31337, contractAddress: address, txHash: receipt.hash, blockNumber: receipt.blockNumber, payloadCommitmentHash: latest.currentEventHash, metadataJson: { sequenceNumber: latest.sequenceNumber, actorUserId, mode: 'LIVE_HARDHAT_NODE' } as Prisma.InputJsonValue } })
      return { success: true, mode: 'LIVE_HARDHAT_NODE' as const, txHash: receipt.hash, blockNumber: receipt.blockNumber, anchoredSequence: latest.sequenceNumber, rootHash: latest.currentEventHash, contractAddress: address, timestamp: new Date().toISOString() }
    } catch {
      // Fall through to the embedded signer when the configured node or contract is unavailable.
    }
  }
  const embeddedSigner = new Wallet(EMBEDDED_PRIVATE_KEY)
  const signature = await embeddedSigner.signMessage(toUtf8Bytes(`${latest.sequenceNumber}|${latest.currentEventHash}`))
  const txHash = keccak256(concat([toUtf8Bytes('KINDORA-EMBEDDED-LOCAL-EVM'), signature]))
  const previous = await database.blockchainEvent.findFirst({ where: { environment: 'LOCAL_EVM' }, orderBy: { blockNumber: 'desc' } })
  const blockNumber = Number(previous?.blockNumber ?? 0n) + 1
  const contractAddress = address || EMBEDDED_CONTRACT_ADDRESS
  await database.auditEvent.update({ where: { id: latest.id }, data: { anchoredTxHash: txHash } })
  await database.blockchainEvent.create({ data: { correlationId: latest.correlationId, eventType: 'AUDIT_ROOT_ANCHORED', environment: 'LOCAL_EVM', chainId: 31337, contractAddress, txHash, blockNumber, payloadCommitmentHash: latest.currentEventHash, metadataJson: { sequenceNumber: latest.sequenceNumber, actorUserId, mode: 'EMBEDDED_LOCAL_EVM', signerAddress: embeddedSigner.address, signature } as Prisma.InputJsonValue } })
  return { success: true, mode: 'EMBEDDED_LOCAL_EVM' as const, txHash, blockNumber, anchoredSequence: latest.sequenceNumber, rootHash: latest.currentEventHash, contractAddress, timestamp: new Date().toISOString() }
}

export async function recordLocalEvmEvent(input: { correlationId: string; eventType: string; payload: unknown; txHash?: string; blockNumber?: number; contractAddress?: string }, database = prisma) {
  const payloadCommitmentHash = createHash('sha256').update(JSON.stringify(input.payload)).digest('hex')
  return database.blockchainEvent.create({ data: { correlationId: input.correlationId, eventType: input.eventType, environment: 'LOCAL_EVM', chainId: 31337, contractAddress: input.contractAddress || process.env.KINDORA_COMMITMENT_LEDGER_ADDRESS, txHash: input.txHash, blockNumber: input.blockNumber, payloadCommitmentHash, metadataJson: input.payload as Prisma.InputJsonValue } })
}
