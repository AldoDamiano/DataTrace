import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  keccak256,
  toBytes,
} from "viem";

describe("TrainingRegistry", async function () {
  const { viem } = await network.create();

  async function deployTrainingFixture() {
    const [
      governance,
      provider,
      developer,
      secondDeveloper,
      unauthorized,
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

    await registry.write.grantRole([
      developerRole,
      secondDeveloper.account.address,
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

    const registryAsSecondDeveloper =
      await viem.getContractAt(
        "TrainingRegistry",
        registry.address,
        {
          client: {
            wallet: secondDeveloper,
          },
        },
      );

    const registryAsUnauthorized =
      await viem.getContractAt(
        "TrainingRegistry",
        registry.address,
        {
          client: {
            wallet: unauthorized,
          },
        },
      );

    let nextDatasetId = 1n;
    let nextModelId = 1n;

    async function createPendingDataset(
      label: string,
    ) {
      const datasetId =
        nextDatasetId;

      nextDatasetId++;

      const datasetHash =
        keccak256(
          toBytes(label),
        );

      await registryAsProvider.write
        .registerDataset([
          datasetHash,
        ]);

      return datasetId;
    }

    async function createApprovedDataset(
      label: string,
      purpose = 0,
    ) {
      const datasetId =
        await createPendingDataset(
          label,
        );

      await registryAsProvider.write
        .setPurposeAllowed([
          datasetId,
          1n,
          purpose,
          true,
        ]);

      await registry.write
        .approveDatasetVersion([
          datasetId,
          1n,
        ]);

      return datasetId;
    }

    async function createActiveModel(
      label: string,
    ) {
      const modelId =
        nextModelId;

      nextModelId++;

      const modelHash =
        keccak256(
          toBytes(label),
        );

      await registryAsDeveloper.write
        .registerModel([
          modelHash,
        ]);

      return modelId;
    }

    async function createSecondDeveloperModel(
      label: string,
    ) {
      const modelId =
        nextModelId;

      nextModelId++;

      const modelHash =
        keccak256(
          toBytes(label),
        );

      await registryAsSecondDeveloper.write
        .registerModel([
          modelHash,
        ]);

      return modelId;
    }

    return {
      registry,
      registryAsProvider,
      registryAsDeveloper,
      registryAsSecondDeveloper,
      registryAsUnauthorized,
      createPendingDataset,
      createApprovedDataset,
      createActiveModel,
      createSecondDeveloperModel,
    };
  }

  // ==================================================
  // VALID TRAINING
  // ==================================================

  it(
    "An AI Developer should register a valid training",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "training-dataset",
          0,
        );

      const modelId =
        await createActiveModel(
          "training-model",
        );

      await registryAsDeveloper.write
        .registerTraining([
          modelId,
          [datasetId],
          [1n],
          0,
        ]);

      const training =
        await registry.read.getTraining([
          1n,
        ]);

      assert.equal(
        training.modelId,
        modelId,
      );

      assert.equal(
        training.purpose,
        0,
      );

      assert.equal(
        training.datasetCount,
        1n,
      );

      assert.equal(
        training.exists,
        true,
      );

      assert.ok(
        training.createdAt > 0n,
      );
    },
  );

  it(
    "A training should store multiple exact dataset references",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const dataset1 =
        await createApprovedDataset(
          "multi-dataset-1",
          2,
        );

      const dataset2 =
        await createApprovedDataset(
          "multi-dataset-2",
          2,
        );

      const modelId =
        await createActiveModel(
          "multi-model",
        );

      await registryAsDeveloper.write
        .registerTraining([
          modelId,
          [
            dataset1,
            dataset2,
          ],
          [
            1n,
            1n,
          ],
          2,
        ]);

      const reference1 =
        await registry.read
          .getTrainingDatasetReference([
            1n,
            0n,
          ]);

      const reference2 =
        await registry.read
          .getTrainingDatasetReference([
            1n,
            1n,
          ]);

      assert.equal(
        reference1.datasetId,
        dataset1,
      );

      assert.equal(
        reference1.version,
        1n,
      );

      assert.equal(
        reference2.datasetId,
        dataset2,
      );

      assert.equal(
        reference2.version,
        1n,
      );
    },
  );

  it(
    "Training registration should create reverse provenance indexes",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "indexed-dataset",
          0,
        );

      const modelId =
        await createActiveModel(
          "indexed-model",
        );

      await registryAsDeveloper.write
        .registerTraining([
          modelId,
          [datasetId],
          [1n],
          0,
        ]);

      assert.equal(
        await registry.read
          .getModelTrainingCount([
            modelId,
          ]),
        1n,
      );

      assert.equal(
        await registry.read
          .getModelTrainingId([
            modelId,
            0n,
          ]),
        1n,
      );

      assert.equal(
        await registry.read
          .getDatasetVersionTrainingCount([
            datasetId,
            1n,
          ]),
        1n,
      );

      assert.equal(
        await registry.read
          .getDatasetVersionTrainingId([
            datasetId,
            1n,
            0n,
          ]),
        1n,
      );
    },
  );

  // ==================================================
  // AUTHORIZATION
  // ==================================================

  it(
    "An unauthorized account should not register a training",
    async function () {
      const {
        registryAsUnauthorized,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "unauthorized-training-dataset",
          0,
        );

      const modelId =
        await createActiveModel(
          "unauthorized-training-model",
        );

      await assert.rejects(
        async () => {
          await registryAsUnauthorized.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              0,
            ]);
        },
      );
    },
  );

  it(
    "An AI Developer should not register training for another developer's model",
    async function () {
      const {
        registryAsDeveloper,
        createApprovedDataset,
        createSecondDeveloperModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "foreign-model-dataset",
          0,
        );

      const modelId =
        await createSecondDeveloperModel(
          "foreign-model",
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              0,
            ]);
        },
      );
    },
  );

  // ==================================================
  // MODEL VALIDATION
  // ==================================================

  it(
    "A Retired model should not be used for a new training",
    async function () {
      const {
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "retired-model-dataset",
          0,
        );

      const modelId =
        await createActiveModel(
          "retired-model",
        );

      await registryAsDeveloper.write
        .retireModel([
          modelId,
        ]);

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              0,
            ]);
        },
      );
    },
  );

  // ==================================================
  // DATASET STATE VALIDATION
  // ==================================================

  it(
    "A Pending dataset version should not be used for training",
    async function () {
      const {
        registryAsDeveloper,
        createPendingDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createPendingDataset(
          "pending-training-dataset",
        );

      const modelId =
        await createActiveModel(
          "pending-training-model",
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              0,
            ]);
        },
      );
    },
  );

  it(
    "A Suspended dataset version should not be used for training",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "suspended-training-dataset",
          0,
        );

      await registry.write
        .suspendDatasetVersion([
          datasetId,
          1n,
        ]);

      const modelId =
        await createActiveModel(
          "suspended-training-model",
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              0,
            ]);
        },
      );
    },
  );

  it(
    "A Revoked dataset version should not be used for training",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "revoked-training-dataset",
          0,
        );

      await registry.write
        .revokeDatasetVersion([
          datasetId,
          1n,
        ]);

      const modelId =
        await createActiveModel(
          "revoked-training-model",
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              0,
            ]);
        },
      );
    },
  );

  // ==================================================
  // PURPOSE VALIDATION
  // ==================================================

  it(
    "A dataset version should not be used for a disallowed purpose",
    async function () {
      const {
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      // Research = 0 is allowed.
      const datasetId =
        await createApprovedDataset(
          "purpose-validation-dataset",
          0,
        );

      const modelId =
        await createActiveModel(
          "purpose-validation-model",
        );

      // Classification = 1 is NOT allowed.
      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              1,
            ]);
        },
      );
    },
  );

  // ==================================================
  // INPUT VALIDATION
  // ==================================================

  it(
    "Dataset IDs and versions should have the same length",
    async function () {
      const {
        registryAsDeveloper,
        createActiveModel,
      } = await deployTrainingFixture();

      const modelId =
        await createActiveModel(
          "mismatch-model",
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [1n],
              [],
              0,
            ]);
        },
      );
    },
  );

  it(
    "A training should contain at least one dataset version",
    async function () {
      const {
        registryAsDeveloper,
        createActiveModel,
      } = await deployTrainingFixture();

      const modelId =
        await createActiveModel(
          "empty-training-model",
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [],
              [],
              0,
            ]);
        },
      );
    },
  );

  it(
    "A non-existing dataset version should not be used for training",
    async function () {
      const {
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "missing-version-dataset",
          0,
        );

      const modelId =
        await createActiveModel(
          "missing-version-model",
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [999n],
              0,
            ]);
        },
      );
    },
  );

  it(
    "A training should not contain more than the maximum number of datasets",
    async function () {
      const {
        registryAsDeveloper,
        createActiveModel,
      } = await deployTrainingFixture();

      const modelId =
        await createActiveModel(
          "too-many-datasets-model",
        );

      const datasetIds =
        Array.from(
          { length: 21 },
          () => 1n,
        );

      const versions =
        Array.from(
          { length: 21 },
          () => 1n,
        );

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              datasetIds,
              versions,
              0,
            ]);
        },
      );
    },
  );

  // ==================================================
  // EMERGENCY PAUSE
  // ==================================================

  it(
    "Training registration should be blocked while the contract is paused",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        createApprovedDataset,
        createActiveModel,
      } = await deployTrainingFixture();

      const datasetId =
        await createApprovedDataset(
          "paused-training-dataset",
          0,
        );

      const modelId =
        await createActiveModel(
          "paused-training-model",
        );

      await registry.write.pause();

      await assert.rejects(
        async () => {
          await registryAsDeveloper.write
            .registerTraining([
              modelId,
              [datasetId],
              [1n],
              0,
            ]);
        },
      );
    },
  );
});