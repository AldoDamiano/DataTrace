// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DataTraceAccess} from "./DataTraceAccess.sol";

contract DatasetRegistry is DataTraceAccess {
    enum DatasetStatus {
        Pending,
        Approved,
        Suspended,
        Revoked
    }

    enum Purpose {
        Research,
        Classification,
        Analytics,
        Testing
    }

    struct Dataset {
        address provider;
        uint256 latestVersion;
        bool exists;
    }

    struct DatasetVersion {
        bytes32 contentHash;
        DatasetStatus status;
        uint256 createdAt;
        bool exists;
    }

    uint256 private _nextDatasetId = 1;

    mapping(uint256 => Dataset) private _datasets;

    mapping(uint256 => mapping(uint256 => DatasetVersion))
        private _datasetVersions;

    mapping(
        uint256 =>
            mapping(
                uint256 =>
                    mapping(Purpose => bool)
            )
    ) private _allowedPurposes;

    // ==================================================
    // ERRORS
    // ==================================================

    error InvalidDatasetHash();

    error DatasetNotFound(
        uint256 datasetId
    );

    error DatasetVersionNotFound(
        uint256 datasetId,
        uint256 version
    );

    error InvalidDatasetStatus(
        uint256 datasetId,
        uint256 version,
        DatasetStatus currentStatus
    );

    error NotDatasetProvider(
        uint256 datasetId,
        address caller
    );

    // ==================================================
    // EVENTS
    // ==================================================

    event DatasetRegistered(
        uint256 indexed datasetId,
        address indexed provider,
        uint256 version,
        bytes32 contentHash
    );

    event DatasetVersionCreated(
        uint256 indexed datasetId,
        uint256 indexed version,
        address indexed provider,
        bytes32 contentHash
    );

    event DatasetPurposeUpdated(
        uint256 indexed datasetId,
        uint256 indexed version,
        Purpose purpose,
        bool allowed,
        address indexed updatedBy
    );

    event DatasetApproved(
        uint256 indexed datasetId,
        uint256 indexed version,
        address indexed approvedBy
    );

    event DatasetSuspended(
        uint256 indexed datasetId,
        uint256 indexed version,
        address indexed suspendedBy
    );

    event DatasetRestored(
        uint256 indexed datasetId,
        uint256 indexed version,
        address indexed restoredBy
    );

    event DatasetRevoked(
        uint256 indexed datasetId,
        uint256 indexed version,
        address indexed revokedBy
    );

    // ==================================================
    // DATASET REGISTRATION
    // ==================================================

    function registerDataset(
        bytes32 contentHash
    )
        external
        onlyRole(DATA_PROVIDER_ROLE)
        whenNotPaused
        returns (uint256 datasetId)
    {
        if (contentHash == bytes32(0)) {
            revert InvalidDatasetHash();
        }

        datasetId = _nextDatasetId;
        _nextDatasetId++;

        _datasets[datasetId] = Dataset({
            provider: msg.sender,
            latestVersion: 1,
            exists: true
        });

        _datasetVersions[datasetId][1] = DatasetVersion({
            contentHash: contentHash,
            status: DatasetStatus.Pending,
            createdAt: block.timestamp,
            exists: true
        });

        emit DatasetRegistered(
            datasetId,
            msg.sender,
            1,
            contentHash
        );

        emit DatasetVersionCreated(
            datasetId,
            1,
            msg.sender,
            contentHash
        );
    }

    // ==================================================
    // CREATE NEW VERSION
    // ==================================================

    function addDatasetVersion(
        uint256 datasetId,
        bytes32 contentHash
    )
        external
        onlyRole(DATA_PROVIDER_ROLE)
        whenNotPaused
        returns (uint256 version)
    {
        if (!_datasets[datasetId].exists) {
            revert DatasetNotFound(datasetId);
        }

        if (contentHash == bytes32(0)) {
            revert InvalidDatasetHash();
        }

        Dataset storage dataset =
            _datasets[datasetId];

        if (dataset.provider != msg.sender) {
            revert NotDatasetProvider(
                datasetId,
                msg.sender
            );
        }

        version = dataset.latestVersion + 1;

        dataset.latestVersion = version;

        _datasetVersions[datasetId][version] =
            DatasetVersion({
                contentHash: contentHash,
                status: DatasetStatus.Pending,
                createdAt: block.timestamp,
                exists: true
            });

        emit DatasetVersionCreated(
            datasetId,
            version,
            msg.sender,
            contentHash
        );
    }

    // ==================================================
    // PURPOSE MANAGEMENT
    // ==================================================

    function setPurposeAllowed(
        uint256 datasetId,
        uint256 version,
        Purpose purpose,
        bool allowed
    )
        external
        onlyRole(DATA_PROVIDER_ROLE)
        whenNotPaused
    {
        if (!_datasets[datasetId].exists) {
            revert DatasetNotFound(datasetId);
        }

        Dataset storage dataset =
            _datasets[datasetId];

        if (dataset.provider != msg.sender) {
            revert NotDatasetProvider(
                datasetId,
                msg.sender
            );
        }

        DatasetVersion storage datasetVersion =
            _datasetVersions[datasetId][version];

        if (!datasetVersion.exists) {
            revert DatasetVersionNotFound(
                datasetId,
                version
            );
        }

        if (
            datasetVersion.status !=
            DatasetStatus.Pending
        ) {
            revert InvalidDatasetStatus(
                datasetId,
                version,
                datasetVersion.status
            );
        }

        _allowedPurposes[datasetId][version][purpose] =
            allowed;

        emit DatasetPurposeUpdated(
            datasetId,
            version,
            purpose,
            allowed,
            msg.sender
        );
    }

    function isPurposeAllowed(
        uint256 datasetId,
        uint256 version,
        Purpose purpose
    )
        public
        view
        returns (bool)
    {
        if (!_datasets[datasetId].exists) {
            revert DatasetNotFound(datasetId);
        }

        if (!_datasetVersions[datasetId][version].exists) {
            revert DatasetVersionNotFound(
                datasetId,
                version
            );
        }

        return
            _allowedPurposes[datasetId][version][purpose];
    }

    // ==================================================
    // Pending -> Approved
    // ==================================================

    function approveDatasetVersion(
        uint256 datasetId,
        uint256 version
    )
        external
        onlyRole(GOVERNANCE_ROLE)
        whenNotPaused
    {
        if (!_datasets[datasetId].exists) {
            revert DatasetNotFound(datasetId);
        }

        DatasetVersion storage datasetVersion =
            _datasetVersions[datasetId][version];

        if (!datasetVersion.exists) {
            revert DatasetVersionNotFound(
                datasetId,
                version
            );
        }

        if (
            datasetVersion.status !=
            DatasetStatus.Pending
        ) {
            revert InvalidDatasetStatus(
                datasetId,
                version,
                datasetVersion.status
            );
        }

        datasetVersion.status =
            DatasetStatus.Approved;

        emit DatasetApproved(
            datasetId,
            version,
            msg.sender
        );
    }

    // ==================================================
    // Approved -> Suspended
    // ==================================================

    function suspendDatasetVersion(
        uint256 datasetId,
        uint256 version
    )
        external
        onlyRole(GOVERNANCE_ROLE)
        whenNotPaused
    {
        if (!_datasets[datasetId].exists) {
            revert DatasetNotFound(datasetId);
        }

        DatasetVersion storage datasetVersion =
            _datasetVersions[datasetId][version];

        if (!datasetVersion.exists) {
            revert DatasetVersionNotFound(
                datasetId,
                version
            );
        }

        if (
            datasetVersion.status !=
            DatasetStatus.Approved
        ) {
            revert InvalidDatasetStatus(
                datasetId,
                version,
                datasetVersion.status
            );
        }

        datasetVersion.status =
            DatasetStatus.Suspended;

        emit DatasetSuspended(
            datasetId,
            version,
            msg.sender
        );
    }

    // ==================================================
    // Suspended -> Approved
    // ==================================================

    function restoreDatasetVersion(
        uint256 datasetId,
        uint256 version
    )
        external
        onlyRole(GOVERNANCE_ROLE)
        whenNotPaused
    {
        if (!_datasets[datasetId].exists) {
            revert DatasetNotFound(datasetId);
        }

        DatasetVersion storage datasetVersion =
            _datasetVersions[datasetId][version];

        if (!datasetVersion.exists) {
            revert DatasetVersionNotFound(
                datasetId,
                version
            );
        }

        if (
            datasetVersion.status !=
            DatasetStatus.Suspended
        ) {
            revert InvalidDatasetStatus(
                datasetId,
                version,
                datasetVersion.status
            );
        }

        datasetVersion.status =
            DatasetStatus.Approved;

        emit DatasetRestored(
            datasetId,
            version,
            msg.sender
        );
    }

    // ==================================================
    // Approved / Suspended -> Revoked
    // ==================================================

    function revokeDatasetVersion(
        uint256 datasetId,
        uint256 version
    )
        external
        onlyRole(GOVERNANCE_ROLE)
        whenNotPaused
    {
        if (!_datasets[datasetId].exists) {
            revert DatasetNotFound(datasetId);
        }

        DatasetVersion storage datasetVersion =
            _datasetVersions[datasetId][version];

        if (!datasetVersion.exists) {
            revert DatasetVersionNotFound(
                datasetId,
                version
            );
        }

        if (
            datasetVersion.status != DatasetStatus.Approved &&
            datasetVersion.status != DatasetStatus.Suspended
        ) {
            revert InvalidDatasetStatus(
                datasetId,
                version,
                datasetVersion.status
            );
        }

        datasetVersion.status =
            DatasetStatus.Revoked;

        emit DatasetRevoked(
            datasetId,
            version,
            msg.sender
        );
    }

    // ==================================================
    // READ FUNCTIONS
    // ==================================================

    function getDataset(
        uint256 datasetId
    )
        external
        view
        returns (Dataset memory)
    {
        return _datasets[datasetId];
    }

    function getDatasetVersion(
        uint256 datasetId,
        uint256 version
    )
        external
        view
        returns (DatasetVersion memory)
    {
        return _datasetVersions[datasetId][version];
    }
}