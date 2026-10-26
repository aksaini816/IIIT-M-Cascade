import type { PayoutProviderAdapter } from './payout.types.js'
import { SimulationPayoutAdapter } from './simulation.adapter.js'
import { LiveProviderPayoutAdapter } from './live.adapter.js'
export function payoutAdapter(): PayoutProviderAdapter { return process.env.PAYOUT_MODE === 'live' ? new LiveProviderPayoutAdapter() : new SimulationPayoutAdapter() }
