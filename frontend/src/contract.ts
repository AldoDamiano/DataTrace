export const contractAddress =
  '0x4d3e064a36db3f8730079f44f75a0a72cf2a4493' as const

export const contractAbi = [
  {
    type: 'function',
    name: 'GOVERNANCE_ROLE',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'bytes32',
      },
    ],
  },
  {
    type: 'function',
    name: 'DATA_PROVIDER_ROLE',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'bytes32',
      },
    ],
  },
  {
    type: 'function',
    name: 'AI_DEVELOPER_ROLE',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'bytes32',
      },
    ],
  },
  {
    type: 'function',
    name: 'AUDITOR_ROLE',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'bytes32',
      },
    ],
  },
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
  {
    type: 'function',
    name: 'registerDataset',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'contentHash',
        type: 'bytes32',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'addDatasetVersion',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'datasetId',
        type: 'uint256',
      },
      {
        name: 'contentHash',
        type: 'bytes32',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getDataset',
    stateMutability: 'view',
    inputs: [
      {
        name: 'datasetId',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          {
            name: 'provider',
            type: 'address',
          },
          {
            name: 'latestVersion',
            type: 'uint256',
          },
          {
            name: 'exists',
            type: 'bool',
          },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getDatasetVersion',
    stateMutability: 'view',
    inputs: [
      {
        name: 'datasetId',
        type: 'uint256',
      },
      {
        name: 'version',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          {
            name: 'contentHash',
            type: 'bytes32',
          },
          {
            name: 'status',
            type: 'uint8',
          },
          {
            name: 'createdAt',
            type: 'uint256',
          },
          {
            name: 'exists',
            type: 'bool',
          },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'approveDatasetVersion',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'datasetId',
        type: 'uint256',
      },
      {
        name: 'version',
        type: 'uint256',
      },
    ],
    outputs: [],
  },
] as const