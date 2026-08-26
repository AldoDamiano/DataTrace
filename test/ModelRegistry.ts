import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  keccak256,
  toBytes,
  zeroHash,
} from "viem";

describe("ModelRegistry", async function () {
  const { viem } = await network.create();

  async function deployModelFixture() {
    const [
      governance,
      developer,
      secondDeveloper,
      unauthorized,
    ] = await viem.getWalletClients();

    const registry =
      await viem.deployContract(
        "ModelRegistry",
      );

    const developerRole =
      await registry.read.AI_DEVELOPER_ROLE();

    await registry.write.grantRole([
      developerRole,
      developer.account.address,
    ]);

    await registry.write.grantRole([
      developerRole,
      secondDeveloper.account.address,
    ]);

    const registryAsDeveloper =
      await viem.getContractAt(
        "ModelRegistry",
        registry.address,
        {
          client: {
            wallet: developer,
          },
        },
      );

    const registryAsSecondDeveloper =
      await viem.getContractAt(
        "ModelRegistry",
        registry.address,
        {
          client: {
            wallet: secondDeveloper,
          },
        },
      );

    const registryAsUnauthorized =
      await viem.getContractAt(
        "ModelRegistry",
        registry.address,
        {
          client: {
            wallet: unauthorized,
          },
        },
      );

    return {
      registry,
      registryAsDeveloper,
      registryAsSecondDeveloper,
      registryAsUnauthorized,
      governance,
      developer,
      secondDeveloper,
      unauthorized,
    };
  }

  // ==================================================
  // REGISTRATION
  // ==================================================

  it(
    "An AI Developer should register a model",
    async function () {
      const {
        registry,
        registryAsDeveloper,
        developer,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("model-v1"),
      );

      await registryAsDeveloper.write.registerModel([
        modelHash,
      ]);

      const model =
        await registry.read.getModel([1n]);

      assert.equal(
        model.modelHash,
        modelHash,
      );

      assert.equal(
        model.developer.toLowerCase(),
        developer.account.address.toLowerCase(),
      );

      assert.equal(
        model.exists,
        true,
      );
    },
  );

  it(
    "A registered model should start in Active state",
    async function () {
      const {
        registry,
        registryAsDeveloper,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("active-model"),
      );

      await registryAsDeveloper.write.registerModel([
        modelHash,
      ]);

      const model =
        await registry.read.getModel([1n]);

      // Active = 0
      assert.equal(
        model.status,
        0,
      );

      assert.equal(
        model.retiredAt,
        0n,
      );

      assert.ok(
        model.createdAt > 0n,
      );
    },
  );

  it(
    "Model IDs should increment sequentially",
    async function () {
      const {
        registry,
        registryAsDeveloper,
      } = await deployModelFixture();

      const hash1 = keccak256(
        toBytes("model-1"),
      );

      const hash2 = keccak256(
        toBytes("model-2"),
      );

      await registryAsDeveloper.write.registerModel([
        hash1,
      ]);

      await registryAsDeveloper.write.registerModel([
        hash2,
      ]);

      const model1 =
        await registry.read.getModel([1n]);

      const model2 =
        await registry.read.getModel([2n]);

      assert.equal(
        model1.modelHash,
        hash1,
      );

      assert.equal(
        model2.modelHash,
        hash2,
      );

      assert.equal(
        model1.exists,
        true,
      );

      assert.equal(
        model2.exists,
        true,
      );
    },
  );

  it(
    "An unauthorized account should not register a model",
    async function () {
      const {
        registryAsUnauthorized,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("unauthorized-model"),
      );

      await assert.rejects(async () => {
        await registryAsUnauthorized.write
          .registerModel([
            modelHash,
          ]);
      });
    },
  );

  it(
    "An AI Developer should not register a model with an empty hash",
    async function () {
      const {
        registryAsDeveloper,
      } = await deployModelFixture();

      await assert.rejects(async () => {
        await registryAsDeveloper.write
          .registerModel([
            zeroHash,
          ]);
      });
    },
  );

  it(
    "Model registration should be blocked while the contract is paused",
    async function () {
      const {
        registry,
        registryAsDeveloper,
      } = await deployModelFixture();

      await registry.write.pause();

      const modelHash = keccak256(
        toBytes("paused-model"),
      );

      await assert.rejects(async () => {
        await registryAsDeveloper.write
          .registerModel([
            modelHash,
          ]);
      });
    },
  );

  // ==================================================
  // RETIREMENT
  // Active -> Retired
  // ==================================================

  it(
    "The model developer should retire an Active model",
    async function () {
      const {
        registry,
        registryAsDeveloper,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("model-to-retire"),
      );

      await registryAsDeveloper.write.registerModel([
        modelHash,
      ]);

      await registryAsDeveloper.write.retireModel([
        1n,
      ]);

      const model =
        await registry.read.getModel([1n]);

      // Retired = 1
      assert.equal(
        model.status,
        1,
      );

      assert.ok(
        model.retiredAt > 0n,
      );
    },
  );

  it(
    "Another AI Developer should not retire someone else's model",
    async function () {
      const {
        registryAsDeveloper,
        registryAsSecondDeveloper,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("owned-model"),
      );

      await registryAsDeveloper.write.registerModel([
        modelHash,
      ]);

      await assert.rejects(async () => {
        await registryAsSecondDeveloper.write
          .retireModel([
            1n,
          ]);
      });
    },
  );

  it(
    "An unauthorized account should not retire a model",
    async function () {
      const {
        registryAsDeveloper,
        registryAsUnauthorized,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("protected-model"),
      );

      await registryAsDeveloper.write.registerModel([
        modelHash,
      ]);

      await assert.rejects(async () => {
        await registryAsUnauthorized.write
          .retireModel([
            1n,
          ]);
      });
    },
  );

  it(
    "A model should not be retired twice",
    async function () {
      const {
        registryAsDeveloper,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("already-retired-model"),
      );

      await registryAsDeveloper.write.registerModel([
        modelHash,
      ]);

      await registryAsDeveloper.write.retireModel([
        1n,
      ]);

      await assert.rejects(async () => {
        await registryAsDeveloper.write
          .retireModel([
            1n,
          ]);
      });
    },
  );

  it(
    "A non-existing model should not be retired",
    async function () {
      const {
        registryAsDeveloper,
      } = await deployModelFixture();

      await assert.rejects(async () => {
        await registryAsDeveloper.write
          .retireModel([
            999n,
          ]);
      });
    },
  );

  it(
    "Model retirement should be blocked while the contract is paused",
    async function () {
      const {
        registry,
        registryAsDeveloper,
      } = await deployModelFixture();

      const modelHash = keccak256(
        toBytes("pause-retirement-model"),
      );

      await registryAsDeveloper.write.registerModel([
        modelHash,
      ]);

      await registry.write.pause();

      await assert.rejects(async () => {
        await registryAsDeveloper.write
          .retireModel([
            1n,
          ]);
      });
    },
  );
});