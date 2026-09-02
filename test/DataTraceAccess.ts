import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("DataTraceAccess", async function () {
  const { viem } = await network.create();

  async function deployAccessFixture() {
    const [governance, provider, developer, auditor, attacker] =
     await viem.getWalletClients();

    const access = await viem.deployContract("DataTraceAccess");

    const accessAsProvider = await viem.getContractAt(
      "DataTraceAccess",
      access.address,
      {
        client: {
          wallet: provider,
        },
      },
    );

    const accessAsDeveloper = await viem.getContractAt(
      "DataTraceAccess",
      access.address,
      {
        client: {
          wallet: developer,
        },
      },
    );

    return {
      access,
      governance,
      provider,
      developer,
      auditor,
      accessAsProvider,
      accessAsDeveloper,
      attacker,
    };
  }

  it("Should assign GOVERNANCE_ROLE to the deployer", async function () {
    const { access, governance } = await deployAccessFixture();

    const governanceRole = await access.read.GOVERNANCE_ROLE();

    const hasRole = await access.read.hasRole([
      governanceRole,
      governance.account.address,
    ]);

    assert.equal(hasRole, true);
  });

  it("Governance should assign DATA_PROVIDER_ROLE", async function () {
    const { access, provider } = await deployAccessFixture();

    const providerRole = await access.read.DATA_PROVIDER_ROLE();

    await access.write.grantRole([
      providerRole,
      provider.account.address,
    ]);

    const hasRole = await access.read.hasRole([
      providerRole,
      provider.account.address,
    ]);

    assert.equal(hasRole, true);
  });

  it("Governance should assign AI_DEVELOPER_ROLE", async function () {
    const { access, developer } = await deployAccessFixture();

    const developerRole = await access.read.AI_DEVELOPER_ROLE();

    await access.write.grantRole([
      developerRole,
      developer.account.address,
    ]);

    const hasRole = await access.read.hasRole([
      developerRole,
      developer.account.address,
    ]);

    assert.equal(hasRole, true);
  });

  it("Governance should assign AUDITOR_ROLE", async function () {
    const { access, auditor } = await deployAccessFixture();

    const auditorRole = await access.read.AUDITOR_ROLE();

    await access.write.grantRole([
      auditorRole,
      auditor.account.address,
    ]);

    const hasRole = await access.read.hasRole([
      auditorRole,
      auditor.account.address,
    ]);

    assert.equal(hasRole, true);
  });

  it("A Data Provider should not assign roles", async function () {
    const {
      access,
      provider,
      developer,
      accessAsProvider,
    } = await deployAccessFixture();

    const providerRole = await access.read.DATA_PROVIDER_ROLE();
    const developerRole = await access.read.AI_DEVELOPER_ROLE();

    // Governance first authorizes this account as Data Provider.
    await access.write.grantRole([
      providerRole,
      provider.account.address,
    ]);

    // The Data Provider must NOT be able to grant another role.
    await assert.rejects(async () => {
      await accessAsProvider.write.grantRole([
        developerRole,
        developer.account.address,
      ]);
    });
  });
it("An unauthorized account should not assign roles", async function () {
  const {
    access,
    developer,
    attacker,
  } = await deployAccessFixture();

  const developerRole = await access.read.AI_DEVELOPER_ROLE();

  const accessAsAttacker = await viem.getContractAt(
    "DataTraceAccess",
    access.address,
    {
      client: {
        wallet: attacker,
      },
    },
  );

  await assert.rejects(async () => {
    await accessAsAttacker.write.grantRole([
      developerRole,
      developer.account.address,
    ]);
  });
});
  it("An AI Developer should not pause the contract", async function () {
    const {
      access,
      developer,
      accessAsDeveloper,
    } = await deployAccessFixture();

    const developerRole = await access.read.AI_DEVELOPER_ROLE();

    await access.write.grantRole([
      developerRole,
      developer.account.address,
    ]);

    await assert.rejects(async () => {
      await accessAsDeveloper.write.pause();
    });
  });

  it("Governance should pause the contract", async function () {
    const { access } = await deployAccessFixture();

    await access.write.pause();

    assert.equal(await access.read.paused(), true);
  });

  it("Governance should unpause the contract", async function () {
    const { access } = await deployAccessFixture();

    await access.write.pause();

    assert.equal(await access.read.paused(), true);

    await access.write.unpause();

    assert.equal(await access.read.paused(), false);
  });
});