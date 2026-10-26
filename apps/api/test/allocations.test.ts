import { describe, expect, it } from 'vitest'
import { reserveAllocationFunds } from '../src/modules/allocations/allocation.service.js'

describe('allocation reservation concurrency', () => {
  it('allows exactly one of two concurrent reservations that each exceed the remaining balance', async () => {
    const allocation: any = { id: 'allocation-1', approvedBudgetPaise: 1_000_000, reservedPaise: 0, disbursedPaise: 0, version: 1, status: 'ACTIVE' }
    let available = Promise.resolve()
    let releaseLock: (() => void) | undefined
    const tx: any = {
      $queryRaw: async (_strings: TemplateStringsArray, ..._values: unknown[]) => {
        const prior = available
        let resolveCurrent!: () => void
        available = new Promise<void>((resolve) => { resolveCurrent = resolve })
        await prior
        releaseLock = resolveCurrent
        return null
      },
      allocation: {
        findUnique: async () => ({ ...allocation }),
        update: async ({ data }: any) => {
          allocation.reservedPaise += data.reservedPaise.increment
          allocation.version += data.version.increment
          releaseLock?.()
          releaseLock = undefined
          return { ...allocation }
        },
      },
    }

    const results = await Promise.allSettled([
      reserveAllocationFunds(tx, 'allocation-1', 700_000),
      reserveAllocationFunds(tx, 'allocation-1', 700_000),
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect((results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason.code).toBe('INSUFFICIENT_ALLOCATION_BALANCE')
  })
})
