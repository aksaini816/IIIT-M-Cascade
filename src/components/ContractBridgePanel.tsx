import { useState } from 'react'
import { createPublicClient, createWalletClient, custom, defineChain, http, parseEther, type Address, type Hex, type PublicClient, type WalletClient } from 'viem'
import artifact from '../contracts/TraceTrustEscrow.json'

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
declare global { interface Window { ethereum?: EthereumProvider } }

const localChain = defineChain({ id: 31337, name: 'Hardhat Local', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } } })
const abi = artifact.abi
const bytecode = artifact.bytecode as Hex

export function ContractBridgePanel() {
  const [mode, setMode] = useState<'simulated' | 'rpc'>('simulated')
  const [rpcStatus, setRpcStatus] = useState('Not checked')
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null)
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null)
  const [account, setAccount] = useState<Address | null>(null)
  const [contractAddress, setContractAddress] = useState<Address | ''>('')
  const [allocationId, setAllocationId] = useState('')
  const [claimId, setClaimId] = useState('')
  const [evidenceHash, setEvidenceHash] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const errors = abi.filter((item) => item.type === 'error')
  const connectLocal = async () => {
    setBusy(true); setMessage('')
    try {
      const client = createPublicClient({ chain: localChain, transport: http() })
      const block = await client.getBlockNumber()
      setPublicClient(client); setMode('rpc'); setRpcStatus(`Connected to localhost:8545 at block ${block.toString()}`)
    } catch { setPublicClient(null); setRpcStatus('No Hardhat node detected; simulated mode remains available.'); setMode('simulated') } finally { setBusy(false) }
  }
  const connectWallet = async () => {
    if (!window.ethereum) return setMessage('No injected wallet detected. Start npx hardhat node or use an injected EVM wallet.')
    setBusy(true); setMessage('')
    try {
      const client = createWalletClient({ chain: localChain, transport: custom(window.ethereum) })
      const addresses = await client.requestAddresses()
      setWalletClient(client); setAccount(addresses[0] ?? null); setMode('rpc'); setRpcStatus(`Wallet connected: ${addresses[0] ?? 'no account'}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Wallet connection failed.') } finally { setBusy(false) }
  }
  const deploy = async () => {
    if (!walletClient || !account) return setMessage('Connect an injected wallet before deploying.')
    setBusy(true)
    try { const hash = await walletClient.deployContract({ abi, bytecode, account, chain: localChain }); setMessage(`Deployment submitted: ${hash}`) } catch (error) { setMessage(error instanceof Error ? error.message : 'Deployment failed.') } finally { setBusy(false) }
  }
  const fund = async () => {
    if (!walletClient || !account || !publicClient || !contractAddress || !allocationId) return setMessage('Connect wallet, detect RPC, enter contract address and allocation ID.')
    setBusy(true)
    try { const hash = await walletClient.writeContract({ address: contractAddress, abi, functionName: 'fundAllocation', args: [allocationId as Hex, `0x${'0'.repeat(64)}` as Hex, 1], value: parseEther('0.01'), account, chain: localChain }); await publicClient.waitForTransactionReceipt({ hash }); setMessage(`fundAllocation confirmed: ${hash}`) } catch (error) { setMessage(error instanceof Error ? error.message : 'fundAllocation failed.') } finally { setBusy(false) }
  }
  const release = async () => {
    if (!walletClient || !account || !publicClient || !contractAddress || !claimId) return setMessage('Connect wallet, detect RPC, enter contract address and claim ID.')
    setBusy(true)
    try { const hash = await walletClient.writeContract({ address: contractAddress, abi, functionName: 'releaseFunds', args: [claimId as Hex], account, chain: localChain }); await publicClient.waitForTransactionReceipt({ hash }); setMessage(`releaseFunds confirmed: ${hash}`) } catch (error) { setMessage(error instanceof Error ? error.message : 'releaseFunds failed.') } finally { setBusy(false) }
  }
  const registerClaim = async () => {
    if (!walletClient || !account || !publicClient || !contractAddress || !allocationId || !claimId || !evidenceHash) return setMessage('Connect wallet, detect RPC, enter contract, allocation, claim, and evidence bytes32 values.')
    setBusy(true)
    try { const hash = await walletClient.writeContract({ address: contractAddress, abi, functionName: 'registerEvidenceAndClaim', args: [claimId as Hex, allocationId as Hex, evidenceHash as Hex, 1, 1n, account, true], account, chain: localChain }); await publicClient.waitForTransactionReceipt({ hash }); setMessage(`registerEvidenceAndClaim confirmed: ${hash}`) } catch (error) { setMessage(error instanceof Error ? error.message : 'registerEvidenceAndClaim failed.') } finally { setBusy(false) }
  }
  return <section className="border border-stone-300 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Optional contract bridge</p><h3 className="mt-1 text-lg font-semibold">Smart Contract Inspector</h3><p className="mt-1 text-xs text-stone-500">ABI loaded from the compiled Hardhat artifact; no public network is assumed.</p></div><div className="flex border border-stone-300 text-xs"><button onClick={() => setMode('simulated')} className={`px-3 py-2 ${mode === 'simulated' ? 'bg-[#1B4332] text-white' : 'bg-white'}`}>Simulated Demo State</button><button onClick={() => setMode('rpc')} className={`px-3 py-2 ${mode === 'rpc' ? 'bg-[#1B4332] text-white' : 'bg-white'}`}>Optional Live Contract Mode</button></div></div>
    {mode === 'simulated' ? <div className="mt-4 border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">The browser demo is running against the local deterministic TraceTrust state engine. No wallet or RPC connection is active.</div> : <div className="mt-4 space-y-4"><div className="grid gap-2 sm:grid-cols-2"><button disabled={busy} onClick={() => void connectLocal()} className="border border-stone-400 px-3 py-2 text-xs font-semibold">Detect Hardhat RPC :8545</button><button disabled={busy} onClick={() => void connectWallet()} className="border border-stone-400 px-3 py-2 text-xs font-semibold">Connect injected wallet</button></div><p className="text-xs text-stone-600">{rpcStatus}</p><div className="grid gap-2 md:grid-cols-[1fr_auto]"><input value={contractAddress} onChange={(e) => setContractAddress(e.target.value as Address)} placeholder="Deployed contract address (0x…)" className="border border-stone-300 px-3 py-2 font-mono text-xs" /><button disabled={busy} onClick={() => void deploy()} className="bg-[#1B4332] px-3 py-2 text-xs font-semibold text-white">Deploy artifact</button></div><div className="grid gap-2 md:grid-cols-2"><input value={allocationId} onChange={(e) => setAllocationId(e.target.value)} placeholder="bytes32 allocation ID" className="border border-stone-300 px-3 py-2 font-mono text-xs" /><button disabled={busy} onClick={() => void fund()} className="border border-[#1B4332] px-3 py-2 text-xs font-semibold text-[#1B4332]">Call fundAllocation (0.01 ETH)</button><input value={claimId} onChange={(e) => setClaimId(e.target.value)} placeholder="bytes32 claim ID" className="border border-stone-300 px-3 py-2 font-mono text-xs" /><input value={evidenceHash} onChange={(e) => setEvidenceHash(e.target.value)} placeholder="bytes32 evidence SHA-256 commitment" className="border border-stone-300 px-3 py-2 font-mono text-xs" /><button disabled={busy} onClick={() => void registerClaim()} className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">Call registerEvidenceAndClaim</button><button disabled={busy} onClick={() => void release()} className="border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">Call releaseFunds</button></div>{account && <p className="font-mono text-xs text-stone-500">Connected account: {account}</p>}{message && <p className="break-all border border-stone-300 bg-stone-50 p-3 text-xs">{message}</p>}</div>}
    <details className="mt-4 border-t border-stone-200 pt-4"><summary className="cursor-pointer text-xs font-semibold">Inspect compiled ABI, functions, and custom errors</summary><div className="mt-3 grid gap-4 text-xs md:grid-cols-2"><div><p className="font-semibold">Functions</p><ul className="mt-2 space-y-1 font-mono text-stone-600">{abi.filter((item) => item.type === 'function').map((item) => <li key={item.name}>{item.name}({item.inputs?.map((input) => input.type).join(', ')})</li>)}</ul></div><div><p className="font-semibold">Custom errors</p><ul className="mt-2 space-y-1 font-mono text-stone-600">{errors.map((item) => <li key={item.name}>{item.name}({item.inputs?.map((input) => input.type).join(', ')})</li>)}</ul></div></div></details>
  </section>
}
