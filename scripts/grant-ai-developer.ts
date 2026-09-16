import { network } from "hardhat";

const DEVELOPER =
  "0xD27861AA2C2bbe8aC4EAc5Bc0d1aeFd563E80AaA";

const CONTRACT =
  "0x4d3e064a36db3f8730079f44f75a0a72cf2a4493";

async function main() {
  const { viem } = await network.create();

  const [governance] =
    await viem.getWalletClients();

  const publicClient =
    await viem.getPublicClient();

  const registry =
    await viem.getContractAt(
      "AuditRegistry",
      CONTRACT,
      {
        client: {
          wallet: governance,
        },
      },
    );

  console.log(
    "Governance wallet:",
    governance.account.address,
  );

  console.log(
    "Granting AI_DEVELOPER_ROLE to:",
    DEVELOPER,
  );

  const developerRole =
    await registry.read.AI_DEVELOPER_ROLE();

  const hash =
    await registry.write.grantRole([
      developerRole,
      DEVELOPER,
    ]);

  console.log(
    "Transaction submitted:",
    hash,
  );

  console.log(
    "Waiting for confirmation...",
  );

  await publicClient.waitForTransactionReceipt({
    hash,
  });

  const hasRole =
    await registry.read.hasRole([
      developerRole,
      DEVELOPER,
    ]);

  console.log(
    "AI Developer role assigned:",
    hasRole,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});