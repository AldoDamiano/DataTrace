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
  {
  type: 'function',
  name: 'registerModel',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'modelHash', type: 'bytes32' },
  ],
  outputs: [
    { name: 'modelId', type: 'uint256' },
  ],
},
{
  type: 'function',
  name: 'getModel',
  stateMutability: 'view',
  inputs: [
    { name: 'modelId', type: 'uint256' },
  ],
  outputs: [
    {
      name: '',
      type: 'tuple',
      components: [
        { name: 'modelHash', type: 'bytes32' },
        { name: 'developer', type: 'address' },
        { name: 'status', type: 'uint8' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'retiredAt', type: 'uint256' },
        { name: 'exists', type: 'bool' },
      ],
    },
  ],
},
{
  type: 'function',
  name: 'retireModel',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'modelId', type: 'uint256' },
  ],
  outputs: [],
},
{
  type: 'function',
  name: 'registerTraining',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'modelId',
      type: 'uint256',
    },
    {
      name: 'datasetIds',
      type: 'uint256[]',
    },
    {
      name: 'versions',
      type: 'uint256[]',
    },
    {
      name: 'purpose',
      type: 'uint8',
    },
  ],
  outputs: [
    {
      name: 'trainingId',
      type: 'uint256',
    },
  ],
},
{
  type: 'function',
  name: 'getTraining',
  stateMutability: 'view',
  inputs: [
    {
      name: 'trainingId',
      type: 'uint256',
    },
  ],
  outputs: [
    {
      name: '',
      type: 'tuple',
      components: [
        {
          name: 'modelId',
          type: 'uint256',
        },
        {
          name: 'developer',
          type: 'address',
        },
        {
          name: 'purpose',
          type: 'uint8',
        },
        {
          name: 'createdAt',
          type: 'uint256',
        },
        {
          name: 'datasetCount',
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
  name: 'getTrainingDatasetReference',
  stateMutability: 'view',
  inputs: [
    {
      name: 'trainingId',
      type: 'uint256',
    },
    {
      name: 'index',
      type: 'uint256',
    },
  ],
  outputs: [
    {
      name: '',
      type: 'tuple',
      components: [
        {
          name: 'datasetId',
          type: 'uint256',
        },
        {
          name: 'version',
          type: 'uint256',
        },
      ],
    },
  ],
},
{
  type: 'function',
  name: 'isPurposeAllowed',
  stateMutability: 'view',
  inputs: [
    { name: 'datasetId', type: 'uint256' },
    { name: 'version', type: 'uint256' },
    { name: 'purpose', type: 'uint8' },
  ],
  outputs: [
    { name: '', type: 'bool' },
  ],
},
{
  type: 'function',
  name: 'setPurposeAllowed',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'datasetId', type: 'uint256' },
    { name: 'version', type: 'uint256' },
    { name: 'purpose', type: 'uint8' },
    { name: 'allowed', type: 'bool' },
  ],
  outputs: [],
},
{
  type: 'function',
  name: 'submitAudit',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'datasetId', type: 'uint256' },
    { name: 'version', type: 'uint256' },
    { name: 'reportHash', type: 'bytes32' },
    { name: 'outcome', type: 'uint8' },
  ],
  outputs: [
    { name: 'auditId', type: 'uint256' },
  ],
},
{
  type: 'function',
  name: 'getAudit',
  stateMutability: 'view',
  inputs: [
    { name: 'auditId', type: 'uint256' },
  ],
  outputs: [
    {
      name: '',
      type: 'tuple',
      components: [
        { name: 'datasetId', type: 'uint256' },
        { name: 'version', type: 'uint256' },
        { name: 'auditor', type: 'address' },
        { name: 'reportHash', type: 'bytes32' },
        { name: 'outcome', type: 'uint8' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'exists', type: 'bool' },
      ],
    },
  ],
},
{
  type: 'function',
  name: 'isTrainingAffected',
  stateMutability: 'view',
  inputs: [
    { name: 'trainingId', type: 'uint256' },
  ],
  outputs: [
    { name: '', type: 'bool' },
  ],
},
{
  type: 'function',
  name: 'isModelAffected',
  stateMutability: 'view',
  inputs: [
    { name: 'modelId', type: 'uint256' },
  ],
  outputs: [
    { name: '', type: 'bool' },
  ],
},
{
  type: 'function',
  name: 'revokeDatasetVersion',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'datasetId', type: 'uint256' },
    { name: 'version', type: 'uint256' },
  ],
  outputs: [],
},
] as const