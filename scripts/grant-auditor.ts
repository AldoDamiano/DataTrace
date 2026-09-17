import { network } from "hardhat";

const AUDIT_REGISTRY_ADDRESS =
  "0x4d3e064a36db3f8730079f44f75a0a72cf2a4493";

const AUDITOR_ADDRESS =
  "0xdf522Bea43C05361763015778519335BffD80B26";

async function main() {
  const { viem } = await network.connect({
    network: "sepolia",
  });

  const [governance] = await viem.getWalletClients();

  const contract = await viem.getContractAt(
    "AuditRegistry",
    AUDIT_REGISTRY_ADDRESS
  );

  const auditorRole = await contract.read.AUDITOR_ROLE();

  console.log("Governance:", governance.account.address);
  console.log("Auditor:", AUDITOR_ADDRESS);
  console.log("Granting AUDITOR_ROLE...");

  const txHash = await contract.write.grantRole(
    [auditorRole, AUDITOR_ADDRESS],
    {
      account: governance.account,
    }
  );

  console.log("Transaction:", txHash);

  const publicClient = await viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  const hasRole = await contract.read.hasRole([
    auditorRole,
    AUDITOR_ADDRESS,
  ]);

  console.log("AUDITOR_ROLE granted:", hasRole);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});