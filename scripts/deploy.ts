import { network } from "hardhat";

async function main() {
  const { viem } = await network.create();

  const [deployer] =
    await viem.getWalletClients();

  console.log("Deploying DataTrace...");

  const auditRegistry =
    await viem.deployContract(
      "AuditRegistry",
    );

  console.log(
    "AuditRegistry deployed at:",
    auditRegistry.address,
  );

  const governanceRole =
    await auditRegistry.read.GOVERNANCE_ROLE();

  const hasGovernanceRole =
    await auditRegistry.read.hasRole([
      governanceRole,
      deployer.account.address,
    ]);

  console.log(
    "Deployer:",
    deployer.account.address,
  );

  console.log(
    "Deployer has GOVERNANCE_ROLE:",
    hasGovernanceRole,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});