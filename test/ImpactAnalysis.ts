import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  keccak256,
  toBytes,
} from "viem";

describe("Impact Analysis", async function () {
  const { viem } = await network.create();

  async function deployImpactFixture() {
    const [
      governance,
      provider,
      developer,
    ] = await viem.getWalletClients();

    const registry =
      await viem.deployContract(
        "TrainingRegistry",
      );

    const providerRole =
      await registry.read.DATA_PROVIDER_ROLE();

    const developerRole =
      await registry.read.AI_DEVELOPER_ROLE();

    await registry.write.grantRole([
      providerRole,
      provider.account.address,
    ]);

    await registry.write.grantRole([
      developerRole,
      developer.account.address,
    ]);

    const registryAsProvider =
      await viem.getContractAt(
        "TrainingRegistry",
        registry.address,
        {
          client: {
            wallet: provider,
          },
        },
      );

    const registryAsDeveloper =
      await viem.getContractAt(
        "TrainingRegistry",
        registry.address,
        {
          client: {
            wallet: developer,
          },
        },
      );

    async function createApprovedDataset(
      label: string,
    ) {
      const hash = keccak256(
        toBytes(label),
      );

      await registryAsProvider.write
        .registerDataset([
          hash,
        ]);

      await registryAsProvider.write
        .setPurposeAllowed([
          1n,
          1n,
          0,
          true,
        ]);

      await registry.write
        .approveDatasetVersion([
          1n,
          1n,
        ]);
    }

    async function createModel(
      label: string,
    ) {
      const hash = keccak256(
        toBytes(label),
      );

      await registryAsDeveloper.write
        .registerModel([
          hash,
        ]);
    }

    async function createBasicTraining() {
      await createApprovedDataset(
        "impact-dataset",
      );

      await createModel(
        "impact-model",
      );

      await registryAsDeveloper.write
        .registerTraining([
          1n,
          [1n],
          [1n],
          0,
        ]);
    }

    return {
      registry,
      registryAsProvider,
      registryAsDeveloper,
      createBasicTraining,
    };
  }

  it(
    "A valid training should initially not be affected",
    async function () {
      const {
        registry,
        createBasicTraining,
      } = await deployImpactFixture();

      await createBasicTraining();

      assert.equal(
        await registry.read
          .isTrainingAffected([
            1n,
          ]),
        false,
      );

      assert.equal(
        await registry.read
          .isModelAffected([
            1n,
          ]),
        false,
      );
    },
  );

  it(
    "A training should become affected when a used dataset version is revoked",
    async function () {
      const {
        registry,
        createBasicTraining,
      } = await deployImpactFixture();

      await createBasicTraining();

      await registry.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);

      assert.equal(
        await registry.read
          .isTrainingAffected([
            1n,
          ]),
        true,
      );
    },
  );

  it(
    "A model should become affected when a dataset used by its training is revoked",
    async function () {
      const {
        registry,
        createBasicTraining,
      } = await deployImpactFixture();

      await createBasicTraining();

      await registry.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);

      assert.equal(
        await registry.read
          .isModelAffected([
            1n,
          ]),
        true,
      );
    },
  );

  it(
    "Revoking an unused dataset version should not affect the model",
    async function () {
      const {
        registry,
        registryAsProvider,
        registryAsDeveloper,
      } = await deployImpactFixture();

      const hash1 = keccak256(
        toBytes("used-dataset"),
      );

      await registryAsProvider.write
        .registerDataset([
          hash1,
        ]);

      await registryAsProvider.write
        .setPurposeAllowed([
          1n,
          1n,
          0,
          true,
        ]);

      await registry.write
        .approveDatasetVersion([
          1n,
          1n,
        ]);

      const hash2 = keccak256(
        toBytes("unused-dataset"),
      );

      await registryAsProvider.write
        .registerDataset([
          hash2,
        ]);

      await registryAsProvider.write
        .setPurposeAllowed([
          2n,
          1n,
          0,
          true,
        ]);

      await registry.write
        .approveDatasetVersion([
          2n,
          1n,
        ]);

      const modelHash = keccak256(
        toBytes("unaffected-model"),
      );

      await registryAsDeveloper.write
        .registerModel([
          modelHash,
        ]);

      await registryAsDeveloper.write
        .registerTraining([
          1n,
          [1n],
          [1n],
          0,
        ]);

      await registry.write
        .revokeDatasetVersion([
          2n,
          1n,
        ]);

      assert.equal(
        await registry.read
          .isModelAffected([
            1n,
          ]),
        false,
      );
    },
  );

  it(
    "Impact analysis should consider the exact dataset version",
    async function () {
      const {
        registry,
        registryAsProvider,
        registryAsDeveloper,
      } = await deployImpactFixture();

      const hashV1 = keccak256(
        toBytes("exact-v1"),
      );

      const hashV2 = keccak256(
        toBytes("exact-v2"),
      );

      await registryAsProvider.write
        .registerDataset([
          hashV1,
        ]);

      await registryAsProvider.write
        .setPurposeAllowed([
          1n,
          1n,
          0,
          true,
        ]);

      await registry.write
        .approveDatasetVersion([
          1n,
          1n,
        ]);

      await registryAsProvider.write
        .addDatasetVersion([
          1n,
          hashV2,
        ]);

      await registryAsProvider.write
        .setPurposeAllowed([
          1n,
          2n,
          0,
          true,
        ]);

      await registry.write
        .approveDatasetVersion([
          1n,
          2n,
        ]);

      const modelHash = keccak256(
        toBytes("exact-version-model"),
      );

      await registryAsDeveloper.write
        .registerModel([
          modelHash,
        ]);

      // Training uses VERSION 2.
      await registryAsDeveloper.write
        .registerTraining([
          1n,
          [1n],
          [2n],
          0,
        ]);

      // Revoke VERSION 1.
      await registry.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);

      // The model used V2, therefore it
      // must NOT be affected.
      assert.equal(
        await registry.read
          .isModelAffected([
            1n,
          ]),
        false,
      );

      // Now revoke the exact version used.
      await registry.write
        .revokeDatasetVersion([
          1n,
          2n,
        ]);

      assert.equal(
        await registry.read
          .isModelAffected([
            1n,
          ]),
        true,
      );
    },
  );

  it(
    "A Suspended dataset version should not mark historical training as revoked-affected",
    async function () {
      const {
        registry,
        createBasicTraining,
      } = await deployImpactFixture();

      await createBasicTraining();

      await registry.write
        .suspendDatasetVersion([
          1n,
          1n,
        ]);

      assert.equal(
        await registry.read
          .isModelAffected([
            1n,
          ]),
        false,
      );
    },
  );

  it(
    "A Retired model should still report historical dataset impact",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        createBasicTraining,
      } = await deployImpactFixture();

      await createBasicTraining();

      await registryAsDeveloper.write
        .retireModel([
          1n,
        ]);

      await registry.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);

      assert.equal(
        await registry.read
          .isModelAffected([
            1n,
          ]),
        true,
      );
    },
  );

  it(
    "Impact analysis should reject non-existing trainings and models",
    async function () {
      const {
        registry,
      } = await deployImpactFixture();

      await assert.rejects(async () => {
        await registry.read
          .isTrainingAffected([
            999n,
          ]);
      });

      await assert.rejects(async () => {
        await registry.read
          .isModelAffected([
            999n,
          ]);
      });
    },
  );
});