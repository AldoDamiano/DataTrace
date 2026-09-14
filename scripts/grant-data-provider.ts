import { network } from "hardhat"

const AUDIT_REGISTRY =
  "0x4d3e064a36db3f8730079f44f75a0a72cf2a4493" as const

const PROVIDER =
  "0x1a207A8DCc596B3B60ADDd2c5F8da86763940C56" as const

async function main() {
  const { viem } = await network.create()

  const [governance] =
    await viem.getWalletClients()

  const publicClient =
    await viem.getPublicClient()

  const registry =
    await viem.getContractAt(
      "AuditRegistry",
      AUDIT_REGISTRY,
    )

  const dataProviderRole =
    await registry.read.DATA_PROVIDER_ROLE()

  console.log(
    "Governance wallet:",
    governance.account.address,
  )

  console.log(
    "Granting DATA_PROVIDER_ROLE to:",
    PROVIDER,
  )

  const hash =
    await registry.write.grantRole([
      dataProviderRole,
      PROVIDER,
    ])

  console.log(
    "Transaction submitted:",
    hash,
  )

  console.log(
    "Waiting for confirmation...",
  )

  await publicClient.waitForTransactionReceipt({
    hash,
  })

  const hasRole =
    await registry.read.hasRole([
      dataProviderRole,
      PROVIDER,
    ])

  console.log(
    "Provider role assigned:",
    hasRole,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})