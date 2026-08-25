import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  keccak256,
  toBytes,
} from "viem";

describe("Dataset Purpose", async function () {
  const { viem } = await network.create();

  async function deployPurposeFixture() {
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
    };
  }

  it(
    "The dataset provider should allow a purpose",
    async function () {
      const {
        registry,
        registryAsProvider,
      } = await deployPurposeFixture();

      const datasetHash = keccak256(
        toBytes("purpose-dataset"),
      );

      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);

      // Research = 0
      await registryAsProvider.write.setPurposeAllowed([
        1n,
        1n,
        0,
        true,
      ]);

      const allowed =
        await registry.read.isPurposeAllowed([
          1n,
          1n,
          0,
        ]);

      assert.equal(allowed, true);
    },
  );

  it(
    "A dataset version should support multiple allowed purposes",
    async function () {
      const {
        registry,
        registryAsProvider,
      } = await deployPurposeFixture();

      const datasetHash = keccak256(
        toBytes("multi-purpose-dataset"),
      );

      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);

      // Research
      await registryAsProvider.write.setPurposeAllowed([
        1n,
        1n,
        0,
        true,
      ]);

      // Analytics
      await registryAsProvider.write.setPurposeAllowed([
        1n,
        1n,
        2,
        true,
      ]);

      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          1n,
          0,
        ]),
        true,
      );

      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          1n,
          2,
        ]),
        true,
      );

      // Classification was never allowed
      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          1n,
          1,
        ]),
        false,
      );
    },
  );

  it(
    "The provider should remove an allowed purpose while the version is Pending",
    async function () {
      const {
        registry,
        registryAsProvider,
      } = await deployPurposeFixture();

      const datasetHash = keccak256(
        toBytes("remove-purpose"),
      );

      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);

      await registryAsProvider.write.setPurposeAllowed([
        1n,
        1n,
        3,
        true,
      ]);

      await registryAsProvider.write.setPurposeAllowed([
        1n,
        1n,
        3,
        false,
      ]);

      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          1n,
          3,
        ]),
        false,
      );
    },
  );

  it(
    "Another Data Provider should not modify purposes of someone else's dataset",
    async function () {
      const {
        registryAsProvider,
        registryAsSecondProvider,
      } = await deployPurposeFixture();

      const datasetHash = keccak256(
        toBytes("owned-purpose"),
      );

      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);

      await assert.rejects(async () => {
        await registryAsSecondProvider.write
          .setPurposeAllowed([
            1n,
            1n,
            0,
            true,
          ]);
      });
    },
  );

  it(
    "An unauthorized account should not modify dataset purposes",
    async function () {
      const {
        registryAsProvider,
        registryAsUnauthorized,
      } = await deployPurposeFixture();

      const datasetHash = keccak256(
        toBytes("unauthorized-purpose"),
      );

      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);

      await assert.rejects(async () => {
        await registryAsUnauthorized.write
          .setPurposeAllowed([
            1n,
            1n,
            0,
            true,
          ]);
      });
    },
  );

  it(
    "Purposes should not be changed after the dataset version is Approved",
    async function () {
      const {
        registry,
        registryAsProvider,
      } = await deployPurposeFixture();

      const datasetHash = keccak256(
        toBytes("locked-purpose"),
      );

      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);

      await registryAsProvider.write.setPurposeAllowed([
        1n,
        1n,
        0,
        true,
      ]);

      await registry.write.approveDatasetVersion([
        1n,
        1n,
      ]);

      await assert.rejects(async () => {
        await registryAsProvider.write
          .setPurposeAllowed([
            1n,
            1n,
            1,
            true,
          ]);
      });
    },
  );

  it(
    "Purpose permissions should be independent for each dataset version",
    async function () {
      const {
        registry,
        registryAsProvider,
      } = await deployPurposeFixture();

      const hashV1 = keccak256(
        toBytes("purpose-v1"),
      );

      const hashV2 = keccak256(
        toBytes("purpose-v2"),
      );

      await registryAsProvider.write.registerDataset([
        hashV1,
      ]);

      // V1 allows Research
      await registryAsProvider.write.setPurposeAllowed([
        1n,
        1n,
        0,
        true,
      ]);

      await registryAsProvider.write.addDatasetVersion([
        1n,
        hashV2,
      ]);

      // V2 allows Classification
      await registryAsProvider.write.setPurposeAllowed([
        1n,
        2n,
        1,
        true,
      ]);

      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          1n,
          0,
        ]),
        true,
      );

      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          1n,
          1,
        ]),
        false,
      );

      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          2n,
          0,
        ]),
        false,
      );

      assert.equal(
        await registry.read.isPurposeAllowed([
          1n,
          2n,
          1,
        ]),
        true,
      );
    },
  );

  it(
    "Purpose changes should be blocked while the contract is paused",
    async function () {
      const {
        registry,
        registryAsProvider,
      } = await deployPurposeFixture();

      const datasetHash = keccak256(
        toBytes("paused-purpose"),
      );

      await registryAsProvider.write.registerDataset([
        datasetHash,
      ]);

      await registry.write.pause();

      await assert.rejects(async () => {
        await registryAsProvider.write
          .setPurposeAllowed([
            1n,
            1n,
            0,
            true,
          ]);
      });
    },
  );
});