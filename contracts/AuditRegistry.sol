// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TrainingRegistry} from "./TrainingRegistry.sol";

contract AuditRegistry is TrainingRegistry {
    enum AuditOutcome {
        Compliant,
        NeedsReview,
        NonCompliant
    }

    struct AuditRecord {
        uint256 datasetId;
        uint256 version;
        address auditor;
        bytes32 reportHash;
        AuditOutcome outcome;
        uint256 createdAt;
        bool exists;
    }

    uint256 private _nextAuditId = 1;

    mapping(uint256 => AuditRecord)
        private _audits;

    mapping(
        uint256 =>
            mapping(
                uint256 =>
                    uint256[]
            )
    ) private _datasetVersionAudits;

    // ==================================================
    // ERRORS
    // ==================================================

    error InvalidAuditReportHash();

    error AuditNotFound(
        uint256 auditId
    );

    // ==================================================
    // EVENTS
    // ==================================================

    event AuditSubmitted(
        uint256 indexed auditId,
        uint256 indexed datasetId,
        uint256 indexed version,
        address auditor,
        bytes32 reportHash,
        AuditOutcome outcome
    );

    // ==================================================
    // AUDIT SUBMISSION
    // ==================================================

    function submitAudit(
        uint256 datasetId,
        uint256 version,
        bytes32 reportHash,
        AuditOutcome outcome
    )
        external
        onlyRole(AUDITOR_ROLE)
        whenNotPaused
        returns (uint256 auditId)
    {
        if (reportHash == bytes32(0)) {
            revert InvalidAuditReportHash();
        }

        Dataset memory dataset =
            this.getDataset(datasetId);

        if (!dataset.exists) {
            revert DatasetNotFound(
                datasetId
            );
        }

        DatasetVersion memory datasetVersion =
            this.getDatasetVersion(
                datasetId,
                version
            );

        if (!datasetVersion.exists) {
            revert DatasetVersionNotFound(
                datasetId,
                version
            );
        }

        // A revoked version is already in a terminal state.
        if (
            datasetVersion.status ==
            DatasetStatus.Revoked
        ) {
            revert InvalidDatasetStatus(
                datasetId,
                version,
                datasetVersion.status
            );
        }

        auditId = _nextAuditId;
        _nextAuditId++;

        _audits[auditId] = AuditRecord({
            datasetId: datasetId,
            version: version,
            auditor: msg.sender,
            reportHash: reportHash,
            outcome: outcome,
            createdAt: block.timestamp,
            exists: true
        });

        _datasetVersionAudits[
            datasetId
        ][version].push(
            auditId
        );

        emit AuditSubmitted(
            auditId,
            datasetId,
            version,
            msg.sender,
            reportHash,
            outcome
        );
    }

    // ==================================================
    // READ FUNCTIONS
    // ==================================================

    function getAudit(
        uint256 auditId
    )
        external
        view
        returns (AuditRecord memory)
    {
        if (!_audits[auditId].exists) {
            revert AuditNotFound(
                auditId
            );
        }

        return _audits[auditId];
    }

    function getDatasetVersionAuditCount(
        uint256 datasetId,
        uint256 version
    )
        external
        view
        returns (uint256)
    {
        return
            _datasetVersionAudits[
                datasetId
            ][version].length;
    }

    function getDatasetVersionAuditId(
        uint256 datasetId,
        uint256 version,
        uint256 index
    )
        external
        view
        returns (uint256)
    {
        return
            _datasetVersionAudits[
                datasetId
            ][version][index];
    }
}