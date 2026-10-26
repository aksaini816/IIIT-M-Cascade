import type { Allocation, Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'
import { HttpError } from '../../middleware/errors.js'

type AllocationTransaction = Pick<Prisma.TransactionClient, 'allocation'> & {
  $queryRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>
}

export function availableAllocationPaise(allocation: Pick<Allocation, 'approvedBudgetPaise' | 'reservedPaise' | 'disbursedPaise'>): number {
  return allocation.approvedBudgetPaise - allocation.reservedPaise - allocation.disbursedPaise
}

async function lockAllocation(tx: AllocationTransaction, allocationId: string): Promise<Allocation> {
  if (tx.$queryRaw) await tx.$queryRaw`SELECT id FROM "Allocation" WHERE id = ${allocationId}::uuid FOR UPDATE`
  const allocation = await tx.allocation.findUnique({ where: { id: allocationId } })
  if (!allocation) throw new HttpError(404, 'ALLOCATION_NOT_FOUND', 'Allocation not found.')
  return allocation
}

function assertAmount(amountPaise: number) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new HttpError(400, 'INVALID_PAISA_AMOUNT', 'Amount must be a positive integer number of paise.')
}

export async function reserveAllocationFunds(tx: AllocationTransaction, allocationId: string, amountPaise: number) {
  assertAmount(amountPaise)
  const allocation = await lockAllocation(tx, allocationId)
  if (allocation.status === 'FROZEN') throw new HttpError(409, 'ALLOCATION_FROZEN', 'Frozen allocations cannot reserve funds.')
  if (amountPaise > availableAllocationPaise(allocation)) throw new HttpError(409, 'INSUFFICIENT_ALLOCATION_BALANCE', 'Insufficient available allocation balance.')
  return tx.allocation.update({ where: { id: allocationId }, data: { reservedPaise: { increment: amountPaise }, version: { increment: 1 } } })
}

export async function releaseReservedFunds(tx: AllocationTransaction, allocationId: string, amountPaise: number) {
  assertAmount(amountPaise)
  const allocation = await lockAllocation(tx, allocationId)
  if (amountPaise > allocation.reservedPaise) throw new HttpError(409, 'INSUFFICIENT_RESERVED_BALANCE', 'Cannot release more reserved funds than are held.')
  return tx.allocation.update({ where: { id: allocationId }, data: { reservedPaise: { decrement: amountPaise }, version: { increment: 1 } } })
}

export async function commitDisbursedFunds(tx: AllocationTransaction, allocationId: string, amountPaise: number) {
  assertAmount(amountPaise)
  const allocation = await lockAllocation(tx, allocationId)
  if (allocation.status === 'FROZEN') throw new HttpError(409, 'ALLOCATION_FROZEN', 'Frozen allocations cannot disburse funds.')
  if (amountPaise > allocation.reservedPaise) throw new HttpError(409, 'INSUFFICIENT_RESERVED_BALANCE', 'Only reserved funds can be disbursed.')
  return tx.allocation.update({ where: { id: allocationId }, data: { reservedPaise: { decrement: amountPaise }, disbursedPaise: { increment: amountPaise }, version: { increment: 1 }, status: availableAllocationPaise(allocation) - amountPaise === 0 ? 'EXHAUSTED' : 'ACTIVE' } })
}

export async function reserveWithDatabase(allocationId: string, amountPaise: number) {
  return prisma.$transaction((tx) => reserveAllocationFunds(tx, allocationId, amountPaise), { isolationLevel: 'Serializable' })
}
