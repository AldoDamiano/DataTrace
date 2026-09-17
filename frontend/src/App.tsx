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
  type Hex,
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

type DatasetInfo = {
  id: bigint
  provider: Address
  latestVersion: bigint
  contentHash: Hex
  createdAt: bigint
  status: number
  allowedPurposes: boolean[]
}
type ModelInfo = {
  id: bigint
  modelHash: `0x${string}`
  developer: `0x${string}`
  status: number
  createdAt: bigint
  retiredAt: bigint
}

type TrainingDatasetReference = {
  datasetId: bigint
  version: bigint
}

type TrainingInfo = {
  id: bigint
  modelId: bigint
  developer: Address
  purpose: number
  createdAt: bigint
  datasetCount: bigint
  references: TrainingDatasetReference[]
}

type AuditInfo = {
  id: bigint
  datasetId: bigint
  version: bigint
  auditor: Address
  reportHash: Hex
  outcome: number
  createdAt: bigint
}
function App() {
  const [account, setAccount] =
    useState<Address | null>(null)

  const [chainId, setChainId] =
    useState<number | null>(null)

  const [roles, setRoles] =
    useState<string[]>([])

  const [error, setError] =
    useState('')

  const [txStatus, setTxStatus] =
    useState('')

  const [datasetInput, setDatasetInput] =
    useState('')

  const [datasetIdInput, setDatasetIdInput] =
    useState('1')

  const [datasetInfo, setDatasetInfo] =
    useState<DatasetInfo | null>(null)

  const [lookupStatus, setLookupStatus] =
    useState('')

  const [versionDatasetId, setVersionDatasetId] =
    useState('1')

  const [versionInput, setVersionInput] =
    useState('')

  const [purposeDatasetId, setPurposeDatasetId] =
    useState('1')

  const [purposeDatasetVersion, setPurposeDatasetVersion] =
    useState('3')

  const [purposeValue, setPurposeValue] =
    useState('0')
  const [modelInput, setModelInput] =
    useState('')

  const [modelIdInput, setModelIdInput] =
    useState('1')

  const [modelInfo, setModelInfo] =
    useState<ModelInfo | null>(null)

  const [modelLookupStatus, setModelLookupStatus] =
    useState('')

  const [trainingModelId, setTrainingModelId] = useState('2')
  const [trainingDatasetId, setTrainingDatasetId] = useState('1')
  const [trainingDatasetVersion, setTrainingDatasetVersion] = useState('1')
  const [trainingIdInput, setTrainingIdInput] = useState('1')
  const [trainingInfo, setTrainingInfo] = useState<TrainingInfo | null>(null)
  const [trainingLookupStatus, setTrainingLookupStatus] = useState('')

  const [auditDatasetId, setAuditDatasetId] = useState('1')
  const [auditDatasetVersion, setAuditDatasetVersion] = useState('3')
  const [auditReport, setAuditReport] = useState('datatrace-audit-report-001')
  const [auditOutcome, setAuditOutcome] = useState('0')
  const [auditIdInput, setAuditIdInput] = useState('1')
  const [auditInfo, setAuditInfo] = useState<AuditInfo | null>(null)
  const [auditLookupStatus, setAuditLookupStatus] = useState('')

  const [impactTrainingId, setImpactTrainingId] = useState('1')
  const [impactTrainingAffected, setImpactTrainingAffected] = useState<boolean | null>(null)
  const [impactTrainingStatus, setImpactTrainingStatus] = useState('')
  const [impactModelId, setImpactModelId] = useState('2')
  const [impactModelAffected, setImpactModelAffected] = useState<boolean | null>(null)
  const [impactModelStatus, setImpactModelStatus] = useState('')

  const [revokeDatasetId, setRevokeDatasetId] = useState('1')
  const [revokeDatasetVersion, setRevokeDatasetVersion] = useState('3')

  const createSepoliaPublicClient = () => {
    return createPublicClient({
      chain: sepolia,
      transport: http(),
    })
  }

  const loadRoles = async (
    address: Address,
  ) => {
    const publicClient =
      createSepoliaPublicClient()

    const governanceRole =
      await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'GOVERNANCE_ROLE',
      })

    const providerRole =
      await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'DATA_PROVIDER_ROLE',
      })

    const developerRole =
      await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'AI_DEVELOPER_ROLE',
      })

    const auditorRole =
      await publicClient.readContract({
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
        args: [
          governanceRole,
          address,
        ],
      }),

      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [
          providerRole,
          address,
        ],
      }),

      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [
          developerRole,
          address,
        ],
      }),

      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'hasRole',
        args: [
          auditorRole,
          address,
        ],
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
      setError(
        'MetaMask non è installato nel browser.',
      )
      return
    }

    try {
      const walletClient =
        createWalletClient({
          chain: sepolia,
          transport: custom(
            window.ethereum,
          ),
        })

      const accounts =
        await walletClient.requestAddresses()

      const currentChainId =
        await walletClient.getChainId()

      if (accounts.length === 0) {
        setError(
          'Nessun account MetaMask disponibile.',
        )
        return
      }

      const connectedAccount =
        accounts[0]

      setAccount(connectedAccount)
      setChainId(currentChainId)

      if (
        currentChainId ===
        sepolia.id
      ) {
        await loadRoles(
          connectedAccount,
        )
      }
    } catch (err) {
      console.error(err)

      setError(
        'Connessione a MetaMask o lettura del contratto non riuscita.',
      )
    }
  }

  const registerDataset =
    async () => {
      setError('')
      setTxStatus('')

      if (
        !window.ethereum ||
        !account
      ) {
        setError(
          'Collega prima il wallet.',
        )
        return
      }

      if (
        chainId !==
        sepolia.id
      ) {
        setError(
          'MetaMask deve essere collegato a Ethereum Sepolia.',
        )
        return
      }

      if (
        !roles.includes(
          'Data Provider',
        )
      ) {
        setError(
          'Il wallet non ha il ruolo Data Provider.',
        )
        return
      }

      if (
        !datasetInput.trim()
      ) {
        setError(
          'Inserisci un valore da registrare.',
        )
        return
      }

      try {
        const walletClient =
          createWalletClient({
            chain: sepolia,
            transport: custom(
              window.ethereum,
            ),
          })

        const publicClient =
          createSepoliaPublicClient()

        const contentHash =
          keccak256(
            toBytes(
              datasetInput.trim(),
            ),
          )

        setTxStatus(
          'Attendi conferma in MetaMask...',
        )

        const hash =
          await walletClient.writeContract({
            account,
            chain: sepolia,
            address: contractAddress,
            abi: contractAbi,
            functionName: 'registerDataset',
            args: [
              contentHash,
            ],
          })

        setTxStatus(
          `Transazione inviata: ${hash.slice(
            0,
            10,
          )}...`,
        )

        await publicClient
          .waitForTransactionReceipt({
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

  const addDatasetVersion =
    async () => {
      setError('')
      setTxStatus('')

      if (
        !window.ethereum ||
        !account
      ) {
        setError(
          'Collega prima il wallet.',
        )
        return
      }

      if (
        chainId !==
        sepolia.id
      ) {
        setError(
          'MetaMask deve essere collegato a Ethereum Sepolia.',
        )
        return
      }

      if (
        !roles.includes(
          'Data Provider',
        )
      ) {
        setError(
          'Il wallet non ha il ruolo Data Provider.',
        )
        return
      }

      if (
        !versionDatasetId.trim()
      ) {
        setError(
          'Inserisci il Dataset ID.',
        )
        return
      }

      if (
        !versionInput.trim()
      ) {
        setError(
          'Inserisci il contenuto della nuova versione.',
        )
        return
      }

      let datasetId: bigint

      try {
        datasetId =
          BigInt(
            versionDatasetId,
          )
      } catch {
        setError(
          'Il Dataset ID deve essere un numero.',
        )
        return
      }

      if (
        datasetId <= 0n
      ) {
        setError(
          'Il Dataset ID deve essere maggiore di zero.',
        )
        return
      }

      try {
        const walletClient =
          createWalletClient({
            chain: sepolia,
            transport: custom(
              window.ethereum,
            ),
          })

        const publicClient =
          createSepoliaPublicClient()

        const contentHash =
          keccak256(
            toBytes(
              versionInput.trim(),
            ),
          )

        setTxStatus(
          'Attendi conferma in MetaMask...',
        )

        const hash =
          await walletClient.writeContract({
            account,
            chain: sepolia,
            address: contractAddress,
            abi: contractAbi,
            functionName: 'addDatasetVersion',
            args: [
              datasetId,
              contentHash,
            ],
          })

        setTxStatus(
          `Transazione inviata: ${hash.slice(
            0,
            10,
          )}...`,
        )

        await publicClient
          .waitForTransactionReceipt({
            hash,
          })

        setTxStatus(
          'Nuova versione del dataset registrata correttamente.',
        )

        setVersionInput('')

        setDatasetIdInput(
          datasetId.toString(),
        )

        await loadDatasetById(
          datasetId,
        )
      } catch (err) {
        console.error(err)

        setError(
          'Creazione della nuova versione annullata o non riuscita.',
        )
      }
    }

  const updateDatasetPurpose =
    async () => {
      setError('')
      setTxStatus('')

      if (!window.ethereum || !account) {
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

      let datasetId: bigint
      let version: bigint
      let purpose: number

      try {
        datasetId = BigInt(purposeDatasetId)
        version = BigInt(purposeDatasetVersion)
        purpose = Number(purposeValue)
      } catch {
        setError('Dataset ID, versione o purpose non validi.')
        return
      }

      if (datasetId <= 0n || version <= 0n || purpose < 0 || purpose > 3) {
        setError('Dataset ID, versione o purpose non validi.')
        return
      }

      try {
        const walletClient = createWalletClient({
          chain: sepolia,
          transport: custom(window.ethereum),
        })
        const publicClient = createSepoliaPublicClient()

        setTxStatus('Attendi conferma in MetaMask...')

        const hash = await walletClient.writeContract({
          account,
          chain: sepolia,
          address: contractAddress,
          abi: contractAbi,
          functionName: 'setPurposeAllowed',
          args: [datasetId, version, purpose, true],
        })

        setTxStatus(`Transazione inviata: ${hash.slice(0, 10)}...`)
        await publicClient.waitForTransactionReceipt({ hash })
        setTxStatus('Purpose abilitato correttamente per la versione del dataset.')

        setDatasetIdInput(datasetId.toString())
        await loadDatasetById(datasetId)
      } catch (err) {
        console.error(err)
        setError('Aggiornamento del purpose annullato o non riuscito. Verifica che la versione sia Pending e che il wallet sia il provider del dataset.')
      }
    }

  const loadDatasetById =
    async (
      datasetId: bigint,
    ) => {
      setError('')
      setLookupStatus('')
      setDatasetInfo(null)

      try {
        setLookupStatus(
          'Lettura del dataset da Sepolia...',
        )

        const publicClient =
          createSepoliaPublicClient()

        const dataset =
          await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'getDataset',
            args: [
              datasetId,
            ],
          })

        if (
          !dataset.exists
        ) {
          setLookupStatus(
            'Dataset non trovato.',
          )
          return
        }

        const version =
          await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'getDatasetVersion',
            args: [
              datasetId,
              dataset.latestVersion,
            ],
          })

        if (
          !version.exists
        ) {
          setLookupStatus(
            'Versione del dataset non trovata.',
          )
          return
        }

        const allowedPurposes =
          await Promise.all(
            [0, 1, 2, 3].map(
              (purpose) =>
                publicClient.readContract({
                  address: contractAddress,
                  abi: contractAbi,
                  functionName: 'isPurposeAllowed',
                  args: [
                    datasetId,
                    dataset.latestVersion,
                    purpose,
                  ],
                }),
            ),
          )

        setDatasetInfo({
          id: datasetId,
          provider:
            dataset.provider,
          latestVersion:
            dataset.latestVersion,
          contentHash:
            version.contentHash,
          createdAt:
            version.createdAt,
          status:
            version.status,
          allowedPurposes:
            allowedPurposes as boolean[],
        })

        setLookupStatus('')
      } catch (err) {
        console.error(err)

        setError(
          'Lettura del dataset non riuscita.',
        )
      }
    }

  const loadDataset =
    async () => {
      if (
        !datasetIdInput.trim()
      ) {
        setError(
          'Inserisci un Dataset ID.',
        )
        return
      }

      let datasetId: bigint

      try {
        datasetId =
          BigInt(
            datasetIdInput,
          )
      } catch {
        setError(
          'Il Dataset ID deve essere un numero.',
        )
        return
      }

      if (
        datasetId <= 0n
      ) {
        setError(
          'Il Dataset ID deve essere maggiore di zero.',
        )
        return
      }

      await loadDatasetById(
        datasetId,
      )
    }

  const approveDataset =
    async () => {
      setError('')
      setTxStatus('')

      if (
        !window.ethereum ||
        !account
      ) {
        setError(
          'Collega prima il wallet.',
        )
        return
      }

      if (
        chainId !==
        sepolia.id
      ) {
        setError(
          'MetaMask deve essere collegato a Ethereum Sepolia.',
        )
        return
      }

      if (
        !roles.includes(
          'Governance',
        )
      ) {
        setError(
          'Il wallet non ha il ruolo Governance.',
        )
        return
      }

      if (
        !datasetInfo
      ) {
        setError(
          'Carica prima un dataset.',
        )
        return
      }

      try {
        const walletClient =
          createWalletClient({
            chain: sepolia,
            transport: custom(
              window.ethereum,
            ),
          })

        const publicClient =
          createSepoliaPublicClient()

        setTxStatus(
          'Attendi conferma in MetaMask...',
        )

        const hash =
          await walletClient.writeContract({
            account,
            chain: sepolia,
            address: contractAddress,
            abi: contractAbi,
            functionName: 'approveDatasetVersion',
            args: [
              datasetInfo.id,
              datasetInfo.latestVersion,
            ],
          })

        setTxStatus(
          `Transazione inviata: ${hash.slice(
            0,
            10,
          )}...`,
        )

        await publicClient
          .waitForTransactionReceipt({
            hash,
          })

        setTxStatus(
          'Dataset approvato correttamente.',
        )

        await loadDatasetById(
          datasetInfo.id,
        )
      } catch (err) {
        console.error(err)

        setError(
          'Approvazione del dataset annullata o non riuscita.',
        )
      }
    }
const revokeDataset = async () => {
  setError('')
  setTxStatus('')

  if (!window.ethereum || !account) {
    setError('Collega prima il wallet.')
    return
  }

  if (chainId !== sepolia.id) {
    setError('MetaMask deve essere collegato a Ethereum Sepolia.')
    return
  }

  if (!roles.includes('Governance')) {
    setError('Il wallet non ha il ruolo Governance.')
    return
  }

  let datasetId: bigint
  let version: bigint

  try {
    datasetId = BigInt(revokeDatasetId)
    version = BigInt(revokeDatasetVersion)
  } catch {
    setError('Dataset ID e versione devono essere numeri validi.')
    return
  }

  if (datasetId <= 0n || version <= 0n) {
    setError('Dataset ID e versione devono essere maggiori di zero.')
    return
  }

  try {
    const publicClient = createSepoliaPublicClient()

    const datasetVersion = await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'getDatasetVersion',
      args: [datasetId, version],
    })

    if (!datasetVersion.exists) {
      setError('La versione del dataset indicata non esiste.')
      return
    }

    // DatasetStatus: 1 = Approved, 2 = Suspended.
    if (datasetVersion.status !== 1 && datasetVersion.status !== 2) {
      setError('La versione può essere revocata solo se è Approved o Suspended.')
      return
    }

    const walletClient = createWalletClient({
      chain: sepolia,
      transport: custom(window.ethereum),
    })

    setTxStatus('Attendi conferma in MetaMask...')

    const hash = await walletClient.writeContract({
      account,
      chain: sepolia,
      address: contractAddress,
      abi: contractAbi,
      functionName: 'revokeDatasetVersion',
      args: [datasetId, version],
    })

    setTxStatus(`Transazione inviata: ${hash.slice(0, 10)}...`)

    await publicClient.waitForTransactionReceipt({ hash })

    setTxStatus('Versione del dataset revocata correttamente.')
    setImpactTrainingAffected(null)
    setImpactTrainingStatus('')
    setImpactModelAffected(null)
    setImpactModelStatus('')

    if (datasetInfo?.id === datasetId) {
      await loadDatasetById(datasetId)
    }
  } catch (err) {
    console.error(err)
    setError('Revoca del dataset annullata o non riuscita.')
  }
}

const registerModel = async () => {
  setError('')
  setTxStatus('')

  if (!window.ethereum || !account) {
    setError('Collega prima il wallet.')
    return
  }

  if (chainId !== sepolia.id) {
    setError(
      'MetaMask deve essere collegato a Ethereum Sepolia.',
    )
    return
  }

  if (!roles.includes('AI Developer')) {
    setError(
      'Il wallet non ha il ruolo AI Developer.',
    )
    return
  }

  if (!modelInput.trim()) {
    setError(
      'Inserisci un valore per il modello.',
    )
    return
  }

  try {
    const walletClient =
      createWalletClient({
        chain: sepolia,
        transport: custom(
          window.ethereum,
        ),
      })

    const publicClient =
      createSepoliaPublicClient()

    const modelHash =
      keccak256(
        toBytes(
          modelInput.trim(),
        ),
      )

    setTxStatus(
      'Attendi conferma in MetaMask...',
    )

    const hash =
      await walletClient.writeContract({
        account,
        chain: sepolia,
        address: contractAddress,
        abi: contractAbi,
        functionName: 'registerModel',
        args: [modelHash],
      })

    setTxStatus(
      `Transazione inviata: ${hash.slice(
        0,
        10,
      )}...`,
    )

    await publicClient
      .waitForTransactionReceipt({
        hash,
      })

    setTxStatus(
      'Modello registrato correttamente su Sepolia.',
    )

    setModelInput('')
  } catch (err) {
    console.error(err)

    setError(
      'Registrazione del modello annullata o non riuscita.',
    )
  }
}
const loadModel = async () => {
  setError('')
  setModelLookupStatus('')
  setModelInfo(null)

  if (!modelIdInput.trim()) {
    setError(
      'Inserisci un Model ID.',
    )
    return
  }

  let modelId: bigint

  try {
    modelId =
      BigInt(modelIdInput)
  } catch {
    setError(
      'Il Model ID deve essere un numero.',
    )
    return
  }

  if (modelId <= 0n) {
    setError(
      'Il Model ID deve essere maggiore di zero.',
    )
    return
  }

  try {
    setModelLookupStatus(
      'Lettura del modello da Sepolia...',
    )

    const publicClient =
      createSepoliaPublicClient()

    const model =
      await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getModel',
        args: [modelId],
      })

    if (!model.exists) {
      setModelLookupStatus(
        'Modello non trovato.',
      )
      return
    }

    setModelInfo({
      id: modelId,
      modelHash: model.modelHash,
      developer: model.developer,
      status: model.status,
      createdAt: model.createdAt,
      retiredAt: model.retiredAt,
    })

    setModelLookupStatus('')
  } catch (err) {
    console.error(err)

    setError(
      'Lettura del modello non riuscita.',
    )
  }
}
  const retireModel = async () => {
    setError('')
    setTxStatus('')

    if (!window.ethereum || !account) {
      setError('Collega prima il wallet.')
      return
    }

    if (chainId !== sepolia.id) {
      setError(
        'MetaMask deve essere collegato a Ethereum Sepolia.',
      )
      return
    }

    if (!roles.includes('AI Developer')) {
      setError(
        'Il wallet non ha il ruolo AI Developer.',
      )
      return
    }

    if (!modelInfo) {
      setError(
        'Carica prima un modello.',
      )
      return
    }

    if (
      modelInfo.developer.toLowerCase() !==
      account.toLowerCase()
    ) {
      setError(
        'Solo il developer proprietario può ritirare questo modello.',
      )
      return
    }

    if (modelInfo.status !== 0) {
      setError(
        'Il modello non è Active.',
      )
      return
    }

    try {
      const walletClient =
        createWalletClient({
          chain: sepolia,
          transport: custom(
            window.ethereum,
          ),
        })

      const publicClient =
        createSepoliaPublicClient()

      setTxStatus(
        'Attendi conferma in MetaMask...',
      )

      const hash =
        await walletClient.writeContract({
          account,
          chain: sepolia,
          address: contractAddress,
          abi: contractAbi,
          functionName: 'retireModel',
          args: [
            modelInfo.id,
          ],
        })

      setTxStatus(
        `Transazione inviata: ${hash.slice(
          0,
          10,
        )}...`,
      )

      await publicClient
        .waitForTransactionReceipt({
          hash,
        })

      setTxStatus(
        'Modello ritirato correttamente.',
      )

      await loadModel()
    } catch (err) {
      console.error(err)

      setError(
        'Retirement del modello annullato o non riuscito.',
      )
    }
  }


  const registerTraining = async () => {
    setError('')
    setTxStatus('')

    if (!window.ethereum || !account) {
      setError('Collega prima il wallet.')
      return
    }
    if (chainId !== sepolia.id) {
      setError('MetaMask deve essere collegato a Ethereum Sepolia.')
      return
    }
    if (!roles.includes('AI Developer')) {
      setError('Il wallet non ha il ruolo AI Developer.')
      return
    }

    let modelId: bigint
    let datasetId: bigint
    let version: bigint
    try {
      modelId = BigInt(trainingModelId)
      datasetId = BigInt(trainingDatasetId)
      version = BigInt(trainingDatasetVersion)
    } catch {
      setError('Model ID, Dataset ID e Version devono essere numeri validi.')
      return
    }
    if (modelId <= 0n || datasetId <= 0n || version <= 0n) {
      setError('Model ID, Dataset ID e Version devono essere maggiori di zero.')
      return
    }

    try {
      const publicClient = createSepoliaPublicClient()
      const model = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getModel',
        args: [modelId],
      })
      if (!model.exists || model.status !== 0) {
        setError('Il modello deve esistere ed essere Active.')
        return
      }
      if (model.developer.toLowerCase() !== account.toLowerCase()) {
        setError('Il modello deve appartenere all’AI Developer collegato.')
        return
      }

      const datasetVersion = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getDatasetVersion',
        args: [datasetId, version],
      })
      if (!datasetVersion.exists || datasetVersion.status !== 1) {
        setError('La versione del dataset deve esistere ed essere Approved.')
        return
      }

      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      })
      setTxStatus('Attendi conferma in MetaMask...')
      const hash = await walletClient.writeContract({
        account,
        chain: sepolia,
        address: contractAddress,
        abi: contractAbi,
        functionName: 'registerTraining',
        args: [modelId, [datasetId], [version], 0],
      })
      setTxStatus(`Training inviato: ${hash.slice(0, 10)}...`)
      await publicClient.waitForTransactionReceipt({ hash })
      setTxStatus('Training registrato correttamente su Sepolia.')
    } catch (err) {
      console.error(err)
      setError('Registrazione del training non riuscita. Verifica che il purpose Research sia consentito per questa versione del dataset.')
    }
  }

  const loadTraining = async () => {
    setError('')
    setTrainingLookupStatus('')
    setTrainingInfo(null)

    let trainingId: bigint
    try {
      trainingId = BigInt(trainingIdInput)
    } catch {
      setError('Il Training ID deve essere un numero.')
      return
    }
    if (trainingId <= 0n) {
      setError('Il Training ID deve essere maggiore di zero.')
      return
    }

    try {
      setTrainingLookupStatus('Lettura del training e della provenance da Sepolia...')
      const publicClient = createSepoliaPublicClient()
      const training = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getTraining',
        args: [trainingId],
      })
      const references = await Promise.all(
        Array.from({ length: Number(training.datasetCount) }, (_, index) =>
          publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'getTrainingDatasetReference',
            args: [trainingId, BigInt(index)],
          }),
        ),
      )
      setTrainingInfo({
        id: trainingId,
        modelId: training.modelId,
        developer: training.developer,
        purpose: training.purpose,
        createdAt: training.createdAt,
        datasetCount: training.datasetCount,
        references: references.map((reference) => ({
          datasetId: reference.datasetId,
          version: reference.version,
        })),
      })
      setTrainingLookupStatus('')
    } catch (err) {
      console.error(err)
      setTrainingLookupStatus('Training non trovato o lettura non riuscita.')
    }
  }

  const submitAudit = async () => {
    setError('')
    setTxStatus('')

    if (!window.ethereum || !account) {
      setError('Collega prima il wallet.')
      return
    }
    if (chainId !== sepolia.id) {
      setError('MetaMask deve essere collegato a Ethereum Sepolia.')
      return
    }
    if (!roles.includes('Auditor')) {
      setError('Il wallet non ha il ruolo Auditor.')
      return
    }

    let datasetId: bigint
    let version: bigint
    let outcome: number
    try {
      datasetId = BigInt(auditDatasetId)
      version = BigInt(auditDatasetVersion)
      outcome = Number(auditOutcome)
    } catch {
      setError('Dataset ID, Version e Outcome devono essere validi.')
      return
    }

    if (datasetId <= 0n || version <= 0n) {
      setError('Dataset ID e Version devono essere maggiori di zero.')
      return
    }
    if (![0, 1, 2].includes(outcome)) {
      setError('Outcome non valido.')
      return
    }
    if (!auditReport.trim()) {
      setError('Inserisci un riferimento o contenuto per il report di audit.')
      return
    }

    try {
      const publicClient = createSepoliaPublicClient()
      const datasetVersion = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getDatasetVersion',
        args: [datasetId, version],
      })

      if (!datasetVersion.exists) {
        setError('La versione del dataset non esiste.')
        return
      }
      if (datasetVersion.status === 3) {
        setError('Non è possibile aggiungere un nuovo audit a una versione Revoked.')
        return
      }

      const reportHash = keccak256(toBytes(auditReport.trim()))
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      })

      setTxStatus('Attendi conferma in MetaMask...')
      const hash = await walletClient.writeContract({
        account,
        chain: sepolia,
        address: contractAddress,
        abi: contractAbi,
        functionName: 'submitAudit',
        args: [datasetId, version, reportHash, outcome],
      })

      setTxStatus(`Audit inviato: ${hash.slice(0, 10)}...`)
      await publicClient.waitForTransactionReceipt({ hash })
      setTxStatus('Audit registrato correttamente su Sepolia.')
    } catch (err) {
      console.error(err)
      setError('Registrazione dell audit non riuscita. Verifica ruolo Auditor, dataset/versione e stato del contratto.')
    }
  }

  const loadAudit = async () => {
    setError('')
    setAuditLookupStatus('')
    setAuditInfo(null)

    let auditId: bigint
    try {
      auditId = BigInt(auditIdInput)
    } catch {
      setError('Audit ID deve essere un numero.')
      return
    }
    if (auditId <= 0n) {
      setError('Audit ID deve essere maggiore di zero.')
      return
    }

    try {
      setAuditLookupStatus('Lettura dell audit da Sepolia...')
      const publicClient = createSepoliaPublicClient()
      const audit = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getAudit',
        args: [auditId],
      })

      if (!audit.exists) {
        setAuditLookupStatus('Audit non trovato.')
        return
      }

      setAuditInfo({
        id: auditId,
        datasetId: audit.datasetId,
        version: audit.version,
        auditor: audit.auditor,
        reportHash: audit.reportHash,
        outcome: audit.outcome,
        createdAt: audit.createdAt,
      })
      setAuditLookupStatus('')
    } catch (err) {
      console.error(err)
      setAuditLookupStatus('Audit non trovato o lettura non riuscita.')
    }
  }

  const checkTrainingImpact = async () => {
    setError('')
    setImpactTrainingStatus('')
    setImpactTrainingAffected(null)

    let trainingId: bigint
    try {
      trainingId = BigInt(impactTrainingId)
    } catch {
      setError('Training ID deve essere un numero.')
      return
    }

    if (trainingId <= 0n) {
      setError('Training ID deve essere maggiore di zero.')
      return
    }

    try {
      setImpactTrainingStatus('Analisi del training su Sepolia...')
      const publicClient = createSepoliaPublicClient()
      const affected = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'isTrainingAffected',
        args: [trainingId],
      })

      setImpactTrainingAffected(affected)
      setImpactTrainingStatus('')
    } catch (err) {
      console.error(err)
      setImpactTrainingStatus('Analisi non riuscita. Verifica che il Training ID esista.')
    }
  }

  const checkModelImpact = async () => {
    setError('')
    setImpactModelStatus('')
    setImpactModelAffected(null)

    let modelId: bigint
    try {
      modelId = BigInt(impactModelId)
    } catch {
      setError('Model ID deve essere un numero.')
      return
    }

    if (modelId <= 0n) {
      setError('Model ID deve essere maggiore di zero.')
      return
    }

    try {
      setImpactModelStatus('Analisi del modello su Sepolia...')
      const publicClient = createSepoliaPublicClient()
      const affected = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'isModelAffected',
        args: [modelId],
      })

      setImpactModelAffected(affected)
      setImpactModelStatus('')
    } catch (err) {
      console.error(err)
      setImpactModelStatus('Analisi non riuscita. Verifica che il Model ID esista.')
    }
  }

  const auditOutcomeName = (outcome: number) => {
    switch (outcome) {
      case 0:
        return 'Compliant'
      case 1:
        return 'Needs Review'
      case 2:
        return 'Non Compliant'
      default:
        return `Unknown (${outcome})`
    }
  }

  const trainingPurposeName = (purpose: number) =>
    purpose === 0 ? 'Research' : `Purpose ${purpose}`

const modelStatusName = (
  status: number,
) => {
  switch (status) {
    case 0:
      return 'Active'

    case 1:
      return 'Retired'

    default:
      return `Unknown (${status})`
  }
}
  const datasetStatusName = (
    status: number,
  ) => {
    switch (status) {
      case 0:
        return 'Pending'

      case 1:
        return 'Approved'

      case 2:
        return 'Suspended'

      case 3:
        return 'Revoked'

      default:
        return `Unknown (${status})`
    }
  }

  const formatTimestamp = (
    timestamp: bigint,
  ) => {
    return new Date(
      Number(timestamp) * 1000,
    ).toLocaleString()
  }

  const isSepolia =
    chainId === sepolia.id

  const shortAddress =
    account
      ? `${account.slice(
          0,
          6,
        )}...${account.slice(
          -4,
        )}`
      : ''

  return (
    <main className="app">
      <header className="navbar">
        <div>
          <h1>
            DataTrace
          </h1>

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
            onClick={
              connectWallet
            }
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
              onClick={
                connectWallet
              }
            >
              Connect MetaMask
            </button>
          )}
        </div>
      </section>

      <section className="status-section">
        <h3>
          Connection Status
        </h3>

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

        {account &&
          !isSepolia && (
            <div className="warning">
              ⚠️ MetaMask non è collegato a Ethereum Sepolia.
            </div>
          )}

        {account &&
          isSepolia && (
            <div className="success">
              ✓ Wallet collegato correttamente a Sepolia.
            </div>
          )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {txStatus && (
          <div className="success">
            {txStatus}
          </div>
        )}
      </section>

      {roles.includes(
        'Data Provider',
      ) && (
        <section className="status-section">
          <h3>
            Dataset Management
          </h3>

          <div className="status-grid">
            <div className="status-card">
              <span className="status-title">
                Register Dataset
              </span>

              <input
                type="text"
                placeholder="Es. dataset-cats-v1.csv"
                value={
                  datasetInput
                }
                onChange={(
                  event,
                ) =>
                  setDatasetInput(
                    event.target.value,
                  )
                }
              />

              <button
                className="primary-button"
                onClick={
                  registerDataset
                }
              >
                Register Dataset
              </button>
            </div>

            <div className="status-card">
              <span className="status-title">
                Add Dataset Version
              </span>

              <input
                type="number"
                min="1"
                placeholder="Dataset ID"
                value={
                  versionDatasetId
                }
                onChange={(
                  event,
                ) =>
                  setVersionDatasetId(
                    event.target.value,
                  )
                }
              />

              <input
                type="text"
                placeholder="Es. dataset-cats-v2.csv"
                value={
                  versionInput
                }
                onChange={(
                  event,
                ) =>
                  setVersionInput(
                    event.target.value,
                  )
                }
              />

              <button
                className="primary-button"
                onClick={
                  addDatasetVersion
                }
              >
                Add Version
              </button>
            </div>

            <div className="status-card">
              <span className="status-title">
                Purpose Management
              </span>

              <input
                type="number"
                min="1"
                placeholder="Dataset ID"
                value={purposeDatasetId}
                onChange={(event) => setPurposeDatasetId(event.target.value)}
              />

              <input
                type="number"
                min="1"
                placeholder="Dataset Version"
                value={purposeDatasetVersion}
                onChange={(event) => setPurposeDatasetVersion(event.target.value)}
              />

              <select
                value={purposeValue}
                onChange={(event) => setPurposeValue(event.target.value)}
              >
                <option value="0">Research</option>
                <option value="1">Classification</option>
                <option value="2">Analytics</option>
                <option value="3">Testing</option>
              </select>

              <button
                className="primary-button"
                onClick={updateDatasetPurpose}
              >
                Allow Purpose
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="status-section">
        <h3>
          Dataset Lookup
        </h3>

        <div className="status-card">
          <span className="status-title">
            Dataset ID
          </span>

          <input
            type="number"
            min="1"
            value={
              datasetIdInput
            }
            onChange={(
              event,
            ) =>
              setDatasetIdInput(
                event.target.value,
              )
            }
          />

          <button
            className="primary-button"
            onClick={
              loadDataset
            }
          >
            Load Dataset
          </button>

          {lookupStatus && (
            <p>
              {lookupStatus}
            </p>
          )}
        </div>

        {datasetInfo && (
          <>
            <div className="status-grid">
              <div className="status-card">
                <span className="status-title">
                  Dataset ID
                </span>

                <strong>
                  {datasetInfo.id
                    .toString()}
                </strong>
              </div>

              <div className="status-card">
                <span className="status-title">
                  Provider
                </span>

                <strong>
                  {`${datasetInfo.provider.slice(
                    0,
                    6,
                  )}...${datasetInfo.provider.slice(
                    -4,
                  )}`}
                </strong>
              </div>

              <div className="status-card">
                <span className="status-title">
                  Latest Version
                </span>

                <strong>
                  {datasetInfo.latestVersion
                    .toString()}
                </strong>
              </div>

              <div className="status-card">
                <span className="status-title">
                  Status
                </span>

                <strong>
                  {datasetStatusName(
                    datasetInfo.status,
                  )}
                </strong>
              </div>

              <div className="status-card">
                <span className="status-title">
                  Created At
                </span>

                <strong>
                  {formatTimestamp(
                    datasetInfo.createdAt,
                  )}
                </strong>
              </div>

              <div className="status-card">
                <span className="status-title">
                  Content Hash
                </span>

                <strong>
                  {`${datasetInfo.contentHash.slice(
                    0,
                    12,
                  )}...${datasetInfo.contentHash.slice(
                    -8,
                  )}`}
                </strong>
              </div>

              <div className="status-card">
                <span className="status-title">
                  Allowed Purposes
                </span>

                <strong>
                  {datasetInfo.allowedPurposes
                    .map((allowed, index) => {
                      const names = [
                        'Research',
                        'Classification',
                        'Analytics',
                        'Testing',
                      ]

                      return `${names[index]}: ${
                        allowed
                          ? 'Allowed'
                          : 'Not Allowed'
                      }`
                    })
                    .join(' | ')}
                </strong>
              </div>
            </div>

            {roles.includes(
              'Governance',
            ) &&
              datasetInfo.status ===
                0 && (
                <button
                  className="primary-button"
                  onClick={
                    approveDataset
                  }
                >
                  Approve Dataset
                </button>
              )}
          </>
        )}
      </section>

      {roles.includes('Governance') && (
        <section className="status-section">
          <h3>Dataset Revocation</h3>
          <p>
            Revoca una versione Approved o Suspended. La provenance storica resta
            registrata e l'Impact Analysis può rilevare training e modelli coinvolti.
          </p>

          <div className="status-grid">
            <div className="status-card">
              <span className="status-title">Dataset ID</span>
              <input
                type="number"
                min="1"
                value={revokeDatasetId}
                onChange={(event) => setRevokeDatasetId(event.target.value)}
              />
            </div>

            <div className="status-card">
              <span className="status-title">Dataset Version</span>
              <input
                type="number"
                min="1"
                value={revokeDatasetVersion}
                onChange={(event) => setRevokeDatasetVersion(event.target.value)}
              />
            </div>
          </div>

          <button className="primary-button" onClick={revokeDataset}>
            Revoke Dataset Version
          </button>
        </section>
      )}

      {roles.includes(
        'AI Developer',
      ) && (
        <section className="status-section">
          <h3>
            Model Management
          </h3>

          <div className="status-card">
            <span className="status-title">
              Register Model
            </span>

            <input
              type="text"
              placeholder="Es. datatrace-model-v1"
              value={
                modelInput
              }
              onChange={(
                event,
              ) =>
                setModelInput(
                  event.target.value,
                )
              }
            />

            <button
              className="primary-button"
              onClick={
                registerModel
              }
            >
              Register Model
            </button>
          </div>
        </section>
      )}

      <section className="status-section">
        <h3>
          Model Lookup
        </h3>

        <div className="status-card">
          <span className="status-title">
            Model ID
          </span>

          <input
            type="number"
            min="1"
            value={
              modelIdInput
            }
            onChange={(
              event,
            ) =>
              setModelIdInput(
                event.target.value,
              )
            }
          />

          <button
            className="primary-button"
            onClick={
              loadModel
            }
          >
            Load Model
          </button>

          {modelLookupStatus && (
            <p>
              {modelLookupStatus}
            </p>
          )}
        </div>

        {modelInfo && (
          <>
            <div className="status-grid">
            <div className="status-card">
              <span className="status-title">
                Model ID
              </span>

              <strong>
                {modelInfo.id
                  .toString()}
              </strong>
            </div>

            <div className="status-card">
              <span className="status-title">
                Developer
              </span>

              <strong>
                {`${modelInfo.developer.slice(
                  0,
                  6,
                )}...${modelInfo.developer.slice(
                  -4,
                )}`}
              </strong>
            </div>

            <div className="status-card">
              <span className="status-title">
                Status
              </span>

              <strong>
                {modelStatusName(
                  modelInfo.status,
                )}
              </strong>
            </div>

            <div className="status-card">
              <span className="status-title">
                Created At
              </span>

              <strong>
                {formatTimestamp(
                  modelInfo.createdAt,
                )}
              </strong>
            </div>

            {modelInfo.status === 1 &&
              modelInfo.retiredAt > 0n && (
                <div className="status-card">
                  <span className="status-title">
                    Retired At
                  </span>

                  <strong>
                    {formatTimestamp(
                      modelInfo.retiredAt,
                    )}
                  </strong>
                </div>
              )}

            <div className="status-card">
              <span className="status-title">
                Model Hash
              </span>

              <strong>
                {`${modelInfo.modelHash.slice(
                  0,
                  12,
                )}...${modelInfo.modelHash.slice(
                  -8,
                )}`}
              </strong>
            </div>
          </div>

            {roles.includes(
              'AI Developer',
            ) &&
              modelInfo.status === 0 &&
              account &&
              modelInfo.developer.toLowerCase() ===
                account.toLowerCase() && (
                <button
                  className="primary-button"
                  onClick={
                    retireModel
                  }
                >
                  Retire Model
                </button>
              )}
          </>
        )}
      </section>

      {roles.includes('AI Developer') && (
        <section className="status-section">
          <h3>Training Management</h3>
          <div className="status-grid">
            <div className="status-card">
              <span className="status-title">Model ID</span>
              <input type="number" min="1" value={trainingModelId}
                onChange={(event) => setTrainingModelId(event.target.value)} />
            </div>
            <div className="status-card">
              <span className="status-title">Dataset ID</span>
              <input type="number" min="1" value={trainingDatasetId}
                onChange={(event) => setTrainingDatasetId(event.target.value)} />
            </div>
            <div className="status-card">
              <span className="status-title">Dataset Version</span>
              <input type="number" min="1" value={trainingDatasetVersion}
                onChange={(event) => setTrainingDatasetVersion(event.target.value)} />
            </div>
            <div className="status-card">
              <span className="status-title">Purpose</span>
              <strong>Research</strong>
              <p>Purpose 0</p>
            </div>
          </div>
          <button className="primary-button" onClick={registerTraining}>
            Register Training
          </button>
        </section>
      )}

      <section className="status-section">
        <h3>Training Lookup & Provenance</h3>
        <div className="status-card">
          <span className="status-title">Training ID</span>
          <input type="number" min="1" value={trainingIdInput}
            onChange={(event) => setTrainingIdInput(event.target.value)} />
          <button className="primary-button" onClick={loadTraining}>
            Load Training
          </button>
          {trainingLookupStatus && <p>{trainingLookupStatus}</p>}
        </div>

        {trainingInfo && (
          <>
            <div className="status-grid">
              <div className="status-card">
                <span className="status-title">Training ID</span>
                <strong>{trainingInfo.id.toString()}</strong>
              </div>
              <div className="status-card">
                <span className="status-title">Model ID</span>
                <strong>{trainingInfo.modelId.toString()}</strong>
              </div>
              <div className="status-card">
                <span className="status-title">Developer</span>
                <strong>{`${trainingInfo.developer.slice(0, 6)}...${trainingInfo.developer.slice(-4)}`}</strong>
              </div>
              <div className="status-card">
                <span className="status-title">Purpose</span>
                <strong>{trainingPurposeName(trainingInfo.purpose)}</strong>
              </div>
              <div className="status-card">
                <span className="status-title">Created At</span>
                <strong>{formatTimestamp(trainingInfo.createdAt)}</strong>
              </div>
              <div className="status-card">
                <span className="status-title">Dataset Count</span>
                <strong>{trainingInfo.datasetCount.toString()}</strong>
              </div>
            </div>

            <h3>Exact Dataset Provenance</h3>
            <div className="status-grid">
              {trainingInfo.references.map((reference, index) => (
                <div className="status-card"
                  key={`${reference.datasetId}-${reference.version}-${index}`}>
                  <span className="status-title">
                    Dataset Reference #{index + 1}
                  </span>
                  <strong>Dataset {reference.datasetId.toString()}</strong>
                  <p>Exact Version: {reference.version.toString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="status-section">
        <h3>Impact Analysis</h3>
        <p>
          Verifica se un training o un modello dipende da una versione di dataset revocata.
          L'analisi è read-only e non richiede gas.
        </p>

        <div className="status-grid">
          <div className="status-card">
            <span className="status-title">Training Impact</span>
            <input
              type="number"
              min="1"
              value={impactTrainingId}
              onChange={(event) => setImpactTrainingId(event.target.value)}
            />
            <button className="primary-button" onClick={checkTrainingImpact}>
              Check Training Impact
            </button>
            {impactTrainingStatus && <p>{impactTrainingStatus}</p>}
            {impactTrainingAffected !== null && (
              <strong>
                {impactTrainingAffected ? 'AFFECTED' : 'NOT AFFECTED'}
              </strong>
            )}
          </div>

          <div className="status-card">
            <span className="status-title">Model Impact</span>
            <input
              type="number"
              min="1"
              value={impactModelId}
              onChange={(event) => setImpactModelId(event.target.value)}
            />
            <button className="primary-button" onClick={checkModelImpact}>
              Check Model Impact
            </button>
            {impactModelStatus && <p>{impactModelStatus}</p>}
            {impactModelAffected !== null && (
              <strong>
                {impactModelAffected ? 'AFFECTED' : 'NOT AFFECTED'}
              </strong>
            )}
          </div>
        </div>
      </section>

      {roles.includes('Auditor') && (
        <section className="status-section">
          <h3>Audit Management</h3>
          <div className="status-grid">
            <div className="status-card">
              <span className="status-title">Dataset ID</span>
              <input type="number" min="1" value={auditDatasetId}
                onChange={(event) => setAuditDatasetId(event.target.value)} />
            </div>
            <div className="status-card">
              <span className="status-title">Dataset Version</span>
              <input type="number" min="1" value={auditDatasetVersion}
                onChange={(event) => setAuditDatasetVersion(event.target.value)} />
            </div>
            <div className="status-card">
              <span className="status-title">Audit Report</span>
              <input type="text" value={auditReport}
                onChange={(event) => setAuditReport(event.target.value)} />
              <p>Il report resta off-chain; DataTrace registra solo il suo hash.</p>
            </div>
            <div className="status-card">
              <span className="status-title">Outcome</span>
              <select value={auditOutcome}
                onChange={(event) => setAuditOutcome(event.target.value)}>
                <option value="0">Compliant</option>
                <option value="1">Needs Review</option>
                <option value="2">Non Compliant</option>
              </select>
            </div>
          </div>
          <button className="primary-button" onClick={submitAudit}>
            Submit Audit
          </button>
        </section>
      )}

      <section className="status-section">
        <h3>Audit Lookup</h3>
        <div className="status-card">
          <span className="status-title">Audit ID</span>
          <input type="number" min="1" value={auditIdInput}
            onChange={(event) => setAuditIdInput(event.target.value)} />
          <button className="primary-button" onClick={loadAudit}>
            Load Audit
          </button>
          {auditLookupStatus && <p>{auditLookupStatus}</p>}
        </div>

        {auditInfo && (
          <div className="status-grid">
            <div className="status-card">
              <span className="status-title">Audit ID</span>
              <strong>{auditInfo.id.toString()}</strong>
            </div>
            <div className="status-card">
              <span className="status-title">Dataset ID</span>
              <strong>{auditInfo.datasetId.toString()}</strong>
            </div>
            <div className="status-card">
              <span className="status-title">Exact Version</span>
              <strong>{auditInfo.version.toString()}</strong>
            </div>
            <div className="status-card">
              <span className="status-title">Auditor</span>
              <strong>{`${auditInfo.auditor.slice(0, 6)}...${auditInfo.auditor.slice(-4)}`}</strong>
            </div>
            <div className="status-card">
              <span className="status-title">Outcome</span>
              <strong>{auditOutcomeName(auditInfo.outcome)}</strong>
            </div>
            <div className="status-card">
              <span className="status-title">Created At</span>
              <strong>{formatTimestamp(auditInfo.createdAt)}</strong>
            </div>
            <div className="status-card">
              <span className="status-title">Report Hash</span>
              <strong>{`${auditInfo.reportHash.slice(0, 12)}...${auditInfo.reportHash.slice(-8)}`}</strong>
            </div>
          </div>
        )}
      </section>

    </main>
  )
}

export default App