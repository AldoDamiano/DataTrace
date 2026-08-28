import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  keccak256,
  toBytes,
  zeroHash,
} from "viem";

describe("AuditRegistry", async function () {
  const { viem } = await network.create();

  async function deployAuditFixture() {
    const [
      governance,
      provider,
      auditor,
      secondAuditor,
      unauthorized,
    ] = await viem.getWalletClients();

    const registry =
      await viem.deployContract(
        "AuditRegistry",
      );

    const providerRole =
      await registry.read.DATA_PROVIDER_ROLE();

    const auditorRole =
      await registry.read.AUDITOR_ROLE();

    await registry.write.grantRole([
      providerRole,
      provider.account.address,
    ]);

    await registry.write.grantRole([
      auditorRole,
      auditor.account.address,
    ]);

    await registry.write.grantRole([
      auditorRole,
      secondAuditor.account.address,
    ]);

    const registryAsProvider =
      await viem.getContractAt(
        "AuditRegistry",
        registry.address,
        {
          client: {
            wallet: provider,
          },
        },
      );

    const registryAsAuditor =
      await viem.getContractAt(
        "AuditRegistry",
        registry.address,
        {
          client: {
            wallet: auditor,
          },
        },
      );

    const registryAsSecondAuditor =
      await viem.getContractAt(
        "AuditRegistry",
        registry.address,
        {
          client: {
            wallet: secondAuditor,
          },
        },
      );

    const registryAsUnauthorized =
      await viem.getContractAt(
        "AuditRegistry",
        registry.address,
        {
          client: {
            wallet: unauthorized,
          },
        },
      );

    async function createPendingDataset(
      label: string,
    ) {
      const datasetHash =
        keccak256(
          toBytes(label),
        );

      await registryAsProvider.write
        .registerDataset([
          datasetHash,
        ]);
    }

    return {
      registry,
      registryAsProvider,
      registryAsAuditor,
      registryAsSecondAuditor,
      registryAsUnauthorized,
      auditor,
      secondAuditor,
      createPendingDataset,
    };
  }

  // ==================================================
  // AUDIT SUBMISSION
  // ==================================================

  it(
    "An Auditor should submit an audit for a dataset version",
    async function () {
      const {
        registry,
        registryAsAuditor,
        auditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "audited-dataset",
      );

      const reportHash =
        keccak256(
          toBytes("audit-report-1"),
        );

      await registryAsAuditor.write
        .submitAudit([
          1n,
          1n,
          reportHash,
          0,
        ]);

      const audit =
        await registry.read.getAudit([
          1n,
        ]);

      assert.equal(
        audit.datasetId,
        1n,
      );

      assert.equal(
        audit.version,
        1n,
      );

      assert.equal(
        audit.auditor.toLowerCase(),
        auditor.account.address.toLowerCase(),
      );

      assert.equal(
        audit.reportHash,
        reportHash,
      );

      // Compliant = 0
      assert.equal(
        audit.outcome,
        0,
      );

      assert.equal(
        audit.exists,
        true,
      );

      assert.ok(
        audit.createdAt > 0n,
      );
    },
  );

  it(
    "Audit IDs should increment sequentially",
    async function () {
      const {
        registry,
        registryAsAuditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "sequential-audit-dataset",
      );

      const report1 =
        keccak256(
          toBytes("report-1"),
        );

      const report2 =
        keccak256(
          toBytes("report-2"),
        );

      await registryAsAuditor.write
        .submitAudit([
          1n,
          1n,
          report1,
          0,
        ]);

      await registryAsAuditor.write
        .submitAudit([
          1n,
          1n,
          report2,
          1,
        ]);

      const audit1 =
        await registry.read.getAudit([
          1n,
        ]);

      const audit2 =
        await registry.read.getAudit([
          2n,
        ]);

      assert.equal(
        audit1.reportHash,
        report1,
      );

      assert.equal(
        audit2.reportHash,
        report2,
      );
    },
  );

  it(
    "Multiple audits should be preserved for the same dataset version",
    async function () {
      const {
        registry,
        registryAsAuditor,
        registryAsSecondAuditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "multiple-audit-dataset",
      );

      const report1 =
        keccak256(
          toBytes("first-audit"),
        );

      const report2 =
        keccak256(
          toBytes("second-audit"),
        );

      await registryAsAuditor.write
        .submitAudit([
          1n,
          1n,
          report1,
          0,
        ]);

      await registryAsSecondAuditor.write
        .submitAudit([
          1n,
          1n,
          report2,
          1,
        ]);

      assert.equal(
        await registry.read
          .getDatasetVersionAuditCount([
            1n,
            1n,
          ]),
        2n,
      );

      assert.equal(
        await registry.read
          .getDatasetVersionAuditId([
            1n,
            1n,
            0n,
          ]),
        1n,
      );

      assert.equal(
        await registry.read
          .getDatasetVersionAuditId([
            1n,
            1n,
            1n,
          ]),
        2n,
      );
    },
  );

  it(
    "Different auditors should be able to submit independent audits",
    async function () {
      const {
        registry,
        registryAsAuditor,
        registryAsSecondAuditor,
        auditor,
        secondAuditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "independent-audit-dataset",
      );

      await registryAsAuditor.write
        .submitAudit([
          1n,
          1n,
          keccak256(
            toBytes("auditor-a"),
          ),
          0,
        ]);

      await registryAsSecondAuditor.write
        .submitAudit([
          1n,
          1n,
          keccak256(
            toBytes("auditor-b"),
          ),
          2,
        ]);

      const audit1 =
        await registry.read.getAudit([
          1n,
        ]);

      const audit2 =
        await registry.read.getAudit([
          2n,
        ]);

      assert.equal(
        audit1.auditor.toLowerCase(),
        auditor.account.address.toLowerCase(),
      );

      assert.equal(
        audit2.auditor.toLowerCase(),
        secondAuditor.account.address.toLowerCase(),
      );

      assert.equal(
        audit1.outcome,
        0,
      );

      assert.equal(
        audit2.outcome,
        2,
      );
    },
  );

  // ==================================================
  // AUTHORIZATION
  // ==================================================

  it(
    "An unauthorized account should not submit an audit",
    async function () {
      const {
        registryAsUnauthorized,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "unauthorized-audit",
      );

      const reportHash =
        keccak256(
          toBytes("invalid-auditor"),
        );

      await assert.rejects(
        async () => {
          await registryAsUnauthorized.write
            .submitAudit([
              1n,
              1n,
              reportHash,
              0,
            ]);
        },
      );
    },
  );

  it(
    "A Data Provider should not submit an audit without the Auditor role",
    async function () {
      const {
        registryAsProvider,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "provider-audit-attempt",
      );

      const reportHash =
        keccak256(
          toBytes("provider-report"),
        );

      await assert.rejects(
        async () => {
          await registryAsProvider.write
            .submitAudit([
              1n,
              1n,
              reportHash,
              0,
            ]);
        },
      );
    },
  );

  // ==================================================
  // VALIDATION
  // ==================================================

  it(
    "An audit should not accept an empty report hash",
    async function () {
      const {
        registryAsAuditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "empty-report",
      );

      await assert.rejects(
        async () => {
          await registryAsAuditor.write
            .submitAudit([
              1n,
              1n,
              zeroHash,
              0,
            ]);
        },
      );
    },
  );

  it(
    "An audit should not be submitted for a non-existing dataset",
    async function () {
      const {
        registryAsAuditor,
      } = await deployAuditFixture();

      const reportHash =
        keccak256(
          toBytes("missing-dataset"),
        );

      await assert.rejects(
        async () => {
          await registryAsAuditor.write
            .submitAudit([
              999n,
              1n,
              reportHash,
              0,
            ]);
        },
      );
    },
  );

  it(
    "An audit should not be submitted for a non-existing dataset version",
    async function () {
      const {
        registryAsAuditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "missing-version",
      );

      const reportHash =
        keccak256(
          toBytes("missing-version-report"),
        );

      await assert.rejects(
        async () => {
          await registryAsAuditor.write
            .submitAudit([
              1n,
              999n,
              reportHash,
              0,
            ]);
        },
      );
    },
  );

  it(
    "A Revoked dataset version should not accept new audits",
    async function () {
      const {
        registry,
        registryAsAuditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "revoked-audit-dataset",
      );

      await registry.write
        .approveDatasetVersion([
          1n,
          1n,
        ]);

      await registry.write
        .revokeDatasetVersion([
          1n,
          1n,
        ]);

      const reportHash =
        keccak256(
          toBytes("late-audit"),
        );

      await assert.rejects(
        async () => {
          await registryAsAuditor.write
            .submitAudit([
              1n,
              1n,
              reportHash,
              2,
            ]);
        },
      );
    },
  );

  it(
    "Audit submission should be blocked while the contract is paused",
    async function () {
      const {
        registry,
        registryAsAuditor,
        createPendingDataset,
      } = await deployAuditFixture();

      await createPendingDataset(
        "paused-audit-dataset",
      );

      await registry.write.pause();

      const reportHash =
        keccak256(
          toBytes("paused-report"),
        );

      await assert.rejects(
        async () => {
          await registryAsAuditor.write
            .submitAudit([
              1n,
              1n,
              reportHash,
              0,
            ]);
        },
      );
    },
  );

  it(
    "Reading a non-existing audit should fail",
    async function () {
      const {
        registry,
      } = await deployAuditFixture();

      await assert.rejects(
        async () => {
          await registry.read.getAudit([
            999n,
          ]);
        },
      );
    },
  );
});