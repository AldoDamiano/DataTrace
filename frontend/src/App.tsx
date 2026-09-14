import { useState } from 'react'
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  keccak256,
  toBytes,
  type Address,
  type EIP1193Provider,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  contractAbi,
  contractAddress,
} from './contract'
import './App.css'

declare global {
  interface Window {
    ethereum?: EIP1193Provider
  }
}

function App() {
  const [account, setAccount] = useState<Address | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [error, setError] = useState('')

  const [datasetInput, setDatasetInput] = useState('')
  const [txStatus, setTxStatus] = useState('')

  const loadRoles = async (address: Address) => {
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    const governanceRole = await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'GOVERNANCE_ROLE',
    })

    const providerRole = await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'DATA_PROVIDER_ROLE',
    })

    const developerRole = await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'AI_DEVELOPER_ROLE',
    })

    const auditorRole = await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'AUDITOR_ROLE',
    })

    const [
      isGovernance,
      isProvider,
      isDeveloper,
      isAuditor,
    ] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [governanceRole, address],
      }),

      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [providerRole, address],
      }),

      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [developerRole, address],
      }),

      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [auditorRole, address],
      }),
    ])

    const detectedRoles: string[] = []

    if (isGovernance) {
      detectedRoles.push('Governance')
    }

    if (isProvider) {
      detectedRoles.push('Data Provider')
    }

    if (isDeveloper) {
      detectedRoles.push('AI Developer')
    }

    if (isAuditor) {
      detectedRoles.push('Auditor')
    }

    setRoles(detectedRoles)
  }

  const connectWallet = async () => {
    setError('')
    setRoles([])
    setTxStatus('')

    if (!window.ethereum) {
      setError('MetaMask non è installato nel browser.')
      return
    }

    try {
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      })

      const accounts = await walletClient.requestAddresses()
      const currentChainId = await walletClient.getChainId()

      if (accounts.length === 0) {
        setError('Nessun account MetaMask disponibile.')
        return
      }

      const connectedAccount = accounts[0]

      setAccount(connectedAccount)
      setChainId(currentChainId)

      if (currentChainId === sepolia.id) {
        await loadRoles(connectedAccount)
      }
    } catch (err) {
      console.error(err)

      setError(
        'Connessione a MetaMask o lettura del contratto non riuscita.',
      )
    }
  }

  const registerDataset = async () => {
    setError('')
    setTxStatus('')

    if (!window.ethereum) {
      setError('MetaMask non è disponibile.')
      return
    }

    if (!account) {
      setError('Collega prima il wallet.')
      return
    }

    if (chainId !== sepolia.id) {
      setError('MetaMask deve essere collegato a Ethereum Sepolia.')
      return
    }

    if (!roles.includes('Data Provider')) {
      setError('Il wallet non ha il ruolo Data Provider.')
      return
    }

    if (!datasetInput.trim()) {
      setError('Inserisci un valore da registrare.')
      return
    }

    try {
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      })

      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      })

      const contentHash = keccak256(
        toBytes(datasetInput.trim()),
      )

      setTxStatus('Attendi conferma in MetaMask...')

      const hash = await walletClient.writeContract({
        account,
        chain: sepolia,
        address: contractAddress,
        abi: contractAbi,
        functionName: 'registerDataset',
        args: [contentHash],
      })

      setTxStatus(
        `Transazione inviata: ${hash.slice(0, 10)}...`,
      )

      await publicClient.waitForTransactionReceipt({
        hash,
      })

      setTxStatus(
        'Dataset registrato correttamente su Sepolia.',
      )

      setDatasetInput('')
    } catch (err) {
      console.error(err)

      setError(
        'Registrazione del dataset annullata o non riuscita.',
      )
    }
  }

  const isSepolia = chainId === sepolia.id

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : ''

  return (
    <main className="app">
      <header className="navbar">
        <div>
          <h1>DataTrace</h1>

          <p>
            AI Data Provenance & Audit Registry
          </p>
        </div>

        {account ? (
          <div className="wallet-badge">
            {shortAddress}
          </div>
        ) : (
          <button
            className="connect-button"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        )}
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <span className="network-label">
            Ethereum Sepolia
          </span>

          <h2>
            Trace the provenance of AI data.
          </h2>

          <p>
            DataTrace registra dataset, modelli,
            training e audit su blockchain,
            garantendo tracciabilità e integrità
            della provenance.
          </p>

          {!account && (
            <button
              className="primary-button"
              onClick={connectWallet}
            >
              Connect MetaMask
            </button>
          )}
        </div>
      </section>

      <section className="status-section">
        <h3>Connection Status</h3>

        <div className="status-grid">
          <div className="status-card">
            <span className="status-title">
              Wallet
            </span>

            <strong>
              {account
                ? shortAddress
                : 'Not connected'}
            </strong>
          </div>

          <div className="status-card">
            <span className="status-title">
              Network
            </span>

            <strong>
              {chainId === null
                ? 'Unknown'
                : isSepolia
                  ? 'Sepolia'
                  : `Wrong network (${chainId})`}
            </strong>
          </div>

          <div className="status-card">
            <span className="status-title">
              Contract
            </span>

            <strong>
              0x4d3e...4493
            </strong>
          </div>

          <div className="status-card">
            <span className="status-title">
              Roles
            </span>

            <strong>
              {roles.length > 0
                ? roles.join(', ')
                : 'No assigned roles'}
            </strong>
          </div>
        </div>

        {account && !isSepolia && (
          <div className="warning">
            ⚠️ MetaMask non è collegato a Ethereum Sepolia.
          </div>
        )}

        {account && isSepolia && (
          <div className="success">
            ✓ Wallet collegato correttamente a Sepolia.
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}
      </section>

      {roles.includes('Data Provider') && (
        <section className="status-section">
          <h3>Dataset Management</h3>

          <div className="status-card">
            <span className="status-title">
              Register Dataset
            </span>

            <input
              type="text"
              placeholder="Es. dataset-cats-v1.csv"
              value={datasetInput}
              onChange={(event) =>
                setDatasetInput(event.target.value)
              }
            />

            <button
              className="primary-button"
              onClick={registerDataset}
            >
              Register Dataset
            </button>

            {txStatus && (
              <p>
                {txStatus}
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

export default App