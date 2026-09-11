import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  keccak256,
  toBytes,
  zeroHash,
} from "viem";

describe("DatasetRegistry", async function () {
  const { viem } = await network.create();

  async function deployRegistryFixture() {
    const [
      governance,
      provider,
      secondProvider,
      unauthorized,
    ] = await viem.getWalletClients();

    const registry =
      await viem.deployContract(
        "DatasetRegistry",
      );

    const providerRole =
      await registry.read.DATA_PROVIDER_ROLE();

    await registry.write.grantRole([
      providerRole,
      provider.account.address,
    ]);

    await registry.write.grantRole([
      providerRole,
      secondProvider.account.address,
    ]);

    const registryAsProvider =
      await viem.getContractAt(
        "DatasetRegistry",
        registry.address,
        {
          client: {
            wallet: provider,
          },
        },
      );

    const registryAsSecondProvider =
      await viem.getContractAt(
        "DatasetRegistry",
        registry.address,
        {
          client: {
            wallet: secondProvider,
          },
        },
      );

    const registryAsUnauthorized =
      await viem.getContractAt(
        "DatasetRegistry",
        registry.address,
        {
          client: {
            wallet: unauthorized,
          },
        },
      );

    return {
      registry,
      registryAsProvider,
      registryAsSecondProvider,
      registryAsUnauthorized,
      governance,
      provider,
      secondProvider,
      unauthorized,
    };
  }

  // ==================================================
  // REGISTRATION
  // ==================================================

  it("A Data Provider should register a dataset", async function () {
    const {
      registry,
      registryAsProvider,
      provider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("dataset-version-1"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    const dataset =
      await registry.read.getDataset([1n]);

    assert.equal(
      dataset.provider.toLowerCase(),
      provider.account.address.toLowerCase(),
    );

    assert.equal(dataset.latestVersion, 1n);
    assert.equal(dataset.exists, true);
  });

  it("A registered dataset should start with version 1 in Pending state", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("dataset-version-1"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    const version =
      await registry.read.getDatasetVersion([
        1n,
        1n,
      ]);

    assert.equal(
      version.contentHash,
      datasetHash,
    );

    assert.equal(version.status, 0);
    assert.equal(version.exists, true);
    assert.ok(version.createdAt > 0n);
  });

  it("An unauthorized account should not register a dataset", async function () {
    const {
      registryAsUnauthorized,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("unauthorized-dataset"),
    );

    await assert.rejects(async () => {
      await registryAsUnauthorized.write
        .registerDataset([
          datasetHash,
        ]);
    });
  });
it(
  "Governance should not register a dataset without the Data Provider role",
  async function () {
    const {
      registry,
      governance,
    } = await deployRegistryFixture();

    const providerRole =
      await registry.read.DATA_PROVIDER_ROLE();

    const hasProviderRole =
      await registry.read.hasRole([
        providerRole,
        governance.account.address,
      ]);

    assert.equal(hasProviderRole, false);

    const datasetHash =
      keccak256(
        toBytes("governance-without-provider-role"),
      );

    await assert.rejects(async () => {
      await registry.write.registerDataset([
        datasetHash,
      ]);
    });
  },
);
  it("A revoked Data Provider should not register a dataset", async function () {
    const {
      registry,
      registryAsProvider,
      provider,
    } = await deployRegistryFixture();

    const providerRole =
      await registry.read.DATA_PROVIDER_ROLE();

    // The provider is authorized by the fixture.
    const hasRoleBefore =
      await registry.read.hasRole([
        providerRole,
        provider.account.address,
      ]);

    assert.equal(hasRoleBefore, true);

    // Governance revokes the Data Provider role.
    await registry.write.revokeRole([
      providerRole,
      provider.account.address,
    ]);

    const hasRoleAfter =
      await registry.read.hasRole([
        providerRole,
        provider.account.address,
      ]);

    assert.equal(hasRoleAfter, false);

    const datasetHash = keccak256(
      toBytes("revoked-provider-dataset"),
    );

    // The revoked provider must no longer be able to register datasets.
    await assert.rejects(async () => {
      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);
    });
  });

  it("A Data Provider should not register a dataset with an empty hash", async function () {
    const {
      registryAsProvider,
    } = await deployRegistryFixture();

    await assert.rejects(async () => {
      await registryAsProvider.write
        .registerDataset([
          zeroHash,
        ]);
    });
  });

  it("Dataset registration should be blocked while the contract is paused", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    await registry.write.pause();

    const datasetHash = keccak256(
      toBytes("dataset-while-paused"),
    );

    await assert.rejects(async () => {
      await registryAsProvider.write
        .registerDataset([
          datasetHash,
        ]);
    });
  });

  // ==================================================
  // VERSIONING
  // ==================================================

  it("The dataset provider should create version 2", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const hashV1 = keccak256(
      toBytes("dataset-v1"),
    );

    const hashV2 = keccak256(
      toBytes("dataset-v2"),
    );

    await registryAsProvider.write.registerDataset([
      hashV1,
    ]);

    await registryAsProvider.write.addDatasetVersion([
      1n,
      hashV2,
    ]);

    const dataset =
      await registry.read.getDataset([1n]);

    const version2 =
      await registry.read.getDatasetVersion([
        1n,
        2n,
      ]);

    assert.equal(dataset.latestVersion, 2n);
    assert.equal(version2.contentHash, hashV2);
    assert.equal(version2.status, 0);
    assert.equal(version2.exists, true);
  });

  it("Creating a new version should not modify the previous version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const hashV1 = keccak256(
      toBytes("immutable-v1"),
    );

    const hashV2 = keccak256(
      toBytes("immutable-v2"),
    );

    await registryAsProvider.write.registerDataset([
      hashV1,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registryAsProvider.write.addDatasetVersion([
      1n,
      hashV2,
    ]);

    const version1 =
      await registry.read.getDatasetVersion([
        1n,
        1n,
      ]);

    const version2 =
      await registry.read.getDatasetVersion([
        1n,
        2n,
      ]);

    assert.equal(version1.contentHash, hashV1);
    assert.equal(version1.status, 1);

    assert.equal(version2.contentHash, hashV2);
    assert.equal(version2.status, 0);
  });

  it("Dataset versions should increment sequentially", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const hashV1 = keccak256(
      toBytes("sequential-v1"),
    );

    const hashV2 = keccak256(
      toBytes("sequential-v2"),
    );

    const hashV3 = keccak256(
      toBytes("sequential-v3"),
    );

    await registryAsProvider.write.registerDataset([
      hashV1,
    ]);

    await registryAsProvider.write.addDatasetVersion([
      1n,
      hashV2,
    ]);

    await registryAsProvider.write.addDatasetVersion([
      1n,
      hashV3,
    ]);

    const dataset =
      await registry.read.getDataset([1n]);

    const version3 =
      await registry.read.getDatasetVersion([
        1n,
        3n,
      ]);

    assert.equal(dataset.latestVersion, 3n);
    assert.equal(version3.contentHash, hashV3);
    assert.equal(version3.status, 0);
  });

  it("Another Data Provider should not create a version for someone else's dataset", async function () {
    const {
      registryAsProvider,
      registryAsSecondProvider,
    } = await deployRegistryFixture();

    const hashV1 = keccak256(
      toBytes("owner-v1"),
    );

    const maliciousHash = keccak256(
      toBytes("not-my-dataset"),
    );

    await registryAsProvider.write.registerDataset([
      hashV1,
    ]);

    await assert.rejects(async () => {
      await registryAsSecondProvider.write
        .addDatasetVersion([
          1n,
          maliciousHash,
        ]);
    });
  });

  it("An unauthorized account should not create a dataset version", async function () {
    const {
      registryAsProvider,
      registryAsUnauthorized,
    } = await deployRegistryFixture();

    const hashV1 = keccak256(
      toBytes("authorized-v1"),
    );

    const hashV2 = keccak256(
      toBytes("unauthorized-v2"),
    );

    await registryAsProvider.write.registerDataset([
      hashV1,
    ]);

    await assert.rejects(async () => {
      await registryAsUnauthorized.write
        .addDatasetVersion([
          1n,
          hashV2,
        ]);
    });
  });

  it("A new dataset version should not accept an empty hash", async function () {
    const {
      registryAsProvider,
    } = await deployRegistryFixture();

    const hashV1 = keccak256(
      toBytes("valid-v1"),
    );

    await registryAsProvider.write.registerDataset([
      hashV1,
    ]);

    await assert.rejects(async () => {
      await registryAsProvider.write
        .addDatasetVersion([
          1n,
          zeroHash,
        ]);
    });
  });

  it("A version should not be created for a non-existing dataset", async function () {
    const {
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("missing-dataset"),
    );

    await assert.rejects(async () => {
      await registryAsProvider.write
        .addDatasetVersion([
          999n,
          datasetHash,
        ]);
    });
  });

  // ==================================================
  // APPROVAL
  // ==================================================

  it("Governance should approve a Pending dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("dataset-to-approve"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    const version =
      await registry.read.getDatasetVersion([
        1n,
        1n,
      ]);

    assert.equal(version.status, 1);
  });

  it("A Data Provider should not approve a dataset version", async function () {
    const {
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("provider-dataset"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await assert.rejects(async () => {
      await registryAsProvider.write
        .approveDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("Governance should not approve a non-existing dataset", async function () {
    const {
      registry,
    } = await deployRegistryFixture();

    await assert.rejects(async () => {
      await registry.write
        .approveDatasetVersion([
          999n,
          1n,
        ]);
    });
  });

  it("Governance should not approve an already Approved dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("already-approved-dataset"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .approveDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  // ==================================================
  // SUSPENSION
  // ==================================================

  it("Governance should suspend an Approved dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("dataset-to-suspend"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.suspendDatasetVersion([
      1n,
      1n,
    ]);

    const version =
      await registry.read.getDatasetVersion([
        1n,
        1n,
      ]);

    assert.equal(version.status, 2);
  });

  it("Governance should not suspend a Pending dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("pending-dataset"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .suspendDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("A Data Provider should not suspend a dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("provider-suspend-dataset"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registryAsProvider.write
        .suspendDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("Governance should not suspend an already Suspended dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("already-suspended-dataset"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.suspendDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .suspendDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  // ==================================================
  // RESTORE
  // ==================================================

  it("Governance should restore a Suspended dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("dataset-to-restore"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.suspendDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.restoreDatasetVersion([
      1n,
      1n,
    ]);

    const version =
      await registry.read.getDatasetVersion([
        1n,
        1n,
      ]);

    assert.equal(version.status, 1);
  });

  it("Governance should not restore a Pending dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("pending-restore"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .restoreDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("Governance should not restore an Approved dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("approved-restore"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .restoreDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("A Data Provider should not restore a dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("provider-restore"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.suspendDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registryAsProvider.write
        .restoreDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  // ==================================================
  // REVOCATION
  // ==================================================

  it("Governance should revoke an Approved dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("approved-to-revoke"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.revokeDatasetVersion([
      1n,
      1n,
    ]);

    const version =
      await registry.read.getDatasetVersion([
        1n,
        1n,
      ]);

    assert.equal(version.status, 3);
  });

  it("Governance should revoke a Suspended dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("suspended-to-revoke"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.suspendDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.revokeDatasetVersion([
      1n,
      1n,
    ]);

    const version =
      await registry.read.getDatasetVersion([
        1n,
        1n,
      ]);

    assert.equal(version.status, 3);
  });

  it("Governance should not revoke a Pending dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("pending-to-revoke"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("A Data Provider should not revoke a dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("provider-revoke"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registryAsProvider.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("A Revoked dataset version should not be restored", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("revoked-restore"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.revokeDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .restoreDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("A Revoked dataset version should not be suspended", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("revoked-suspend"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.revokeDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .suspendDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("A Revoked dataset version should not be approved again", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("revoked-approve"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.revokeDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .approveDatasetVersion([
          1n,
          1n,
        ]);
    });
  });

  it("Governance should not revoke an already Revoked dataset version", async function () {
    const {
      registry,
      registryAsProvider,
    } = await deployRegistryFixture();

    const datasetHash = keccak256(
      toBytes("already-revoked"),
    );

    await registryAsProvider.write.registerDataset([
      datasetHash,
    ]);

    await registry.write.approveDatasetVersion([
      1n,
      1n,
    ]);

    await registry.write.revokeDatasetVersion([
      1n,
      1n,
    ]);

    await assert.rejects(async () => {
      await registry.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);
    });
  });
});