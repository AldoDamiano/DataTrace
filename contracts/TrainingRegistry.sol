// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DatasetRegistry} from "./DatasetRegistry.sol";
import {ModelRegistry} from "./ModelRegistry.sol";

contract TrainingRegistry is DatasetRegistry, ModelRegistry {
    uint256 public constant MAX_DATASETS_PER_TRAINING = 20;

    struct DatasetReference {
        uint256 datasetId;
        uint256 version;
    }

    struct Training {
        uint256 modelId;
        address developer;
        Purpose purpose;
        uint256 createdAt;
        uint256 datasetCount;
        bool exists;
    }

    uint256 private _nextTrainingId = 1;

    mapping(uint256 => Training) private _trainings;

    mapping(uint256 => DatasetReference[])
        private _trainingDatasets;

    mapping(uint256 => uint256[])
        private _modelTrainings;

    mapping(
        uint256 =>
            mapping(
                uint256 =>
                    uint256[]
            )
    ) private _datasetVersionTrainings;

    // ==================================================
    // ERRORS
    // ==================================================

    error EmptyDatasetList();

    error DatasetReferenceLengthMismatch();

    error TooManyDatasets(
        uint256 provided,
        uint256 maximum
    );

    error PurposeNotAllowed(
        uint256 datasetId,
        uint256 version,
        Purpose purpose
    );

    error TrainingNotFound(
        uint256 trainingId
    );

    // ==================================================
    // EVENTS
    // ==================================================

    event TrainingRegistered(
        uint256 indexed trainingId,
        uint256 indexed modelId,
        address indexed developer,
        Purpose purpose,
        uint256 datasetCount
    );

    event DatasetUsed(
        uint256 indexed trainingId,
        uint256 indexed datasetId,
        uint256 indexed version
    );

    // ==================================================
    // TRAINING REGISTRATION
    // ==================================================

    function registerTraining(
        uint256 modelId,
        uint256[] calldata datasetIds,
        uint256[] calldata versions,
        Purpose purpose
    )
        external
        onlyRole(AI_DEVELOPER_ROLE)
        whenNotPaused
        returns (uint256 trainingId)
    {
        if (datasetIds.length == 0) {
            revert EmptyDatasetList();
        }

        if (datasetIds.length != versions.length) {
            revert DatasetReferenceLengthMismatch();
        }

        if (
            datasetIds.length >
            MAX_DATASETS_PER_TRAINING
        ) {
            revert TooManyDatasets(
                datasetIds.length,
                MAX_DATASETS_PER_TRAINING
            );
        }

        // ==================================================
        // MODEL CHECKS
        // ==================================================

        Model memory model =
            this.getModel(modelId);

        if (!model.exists) {
            revert ModelNotFound(modelId);
        }

        if (model.developer != msg.sender) {
            revert NotModelDeveloper(
                modelId,
                msg.sender
            );
        }

        if (
            model.status !=
            ModelStatus.Active
        ) {
            revert InvalidModelStatus(
                modelId,
                model.status
            );
        }

        // ==================================================
        // DATASET CHECKS
        // ==================================================

        for (
            uint256 i = 0;
            i < datasetIds.length;
            i++
        ) {
            uint256 datasetId =
                datasetIds[i];

            uint256 version =
                versions[i];

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

            if (
                !isPurposeAllowed(
                    datasetId,
                    version,
                    purpose
                )
            ) {
                revert PurposeNotAllowed(
                    datasetId,
                    version,
                    purpose
                );
            }
        }

        // ==================================================
        // TRAINING CREATION
        // ==================================================

        trainingId = _nextTrainingId;
        _nextTrainingId++;

        _trainings[trainingId] = Training({
            modelId: modelId,
            developer: msg.sender,
            purpose: purpose,
            createdAt: block.timestamp,
            datasetCount: datasetIds.length,
            exists: true
        });

        _modelTrainings[modelId].push(
            trainingId
        );

        for (
            uint256 i = 0;
            i < datasetIds.length;
            i++
        ) {
            uint256 datasetId =
                datasetIds[i];

            uint256 version =
                versions[i];

            _trainingDatasets[trainingId].push(
                DatasetReference({
                    datasetId: datasetId,
                    version: version
                })
            );

            _datasetVersionTrainings[
                datasetId
            ][version].push(
                trainingId
            );

            emit DatasetUsed(
                trainingId,
                datasetId,
                version
            );
        }

        emit TrainingRegistered(
            trainingId,
            modelId,
            msg.sender,
            purpose,
            datasetIds.length
        );
    }

    // ==================================================
    // IMPACT ANALYSIS
    // ==================================================

    function isTrainingAffected(
        uint256 trainingId
    )
        public
        view
        returns (bool)
    {
        if (!_trainings[trainingId].exists) {
            revert TrainingNotFound(
                trainingId
            );
        }

        return _isTrainingAffected(
            trainingId
        );
    }

    function isModelAffected(
        uint256 modelId
    )
        external
        view
        returns (bool)
    {
        Model memory model =
            this.getModel(modelId);

        if (!model.exists) {
            revert ModelNotFound(
                modelId
            );
        }

        uint256[] storage trainingIds =
            _modelTrainings[modelId];

        for (
            uint256 i = 0;
            i < trainingIds.length;
            i++
        ) {
            if (
                _isTrainingAffected(
                    trainingIds[i]
                )
            ) {
                return true;
            }
        }

        return false;
    }

    function _isTrainingAffected(
        uint256 trainingId
    )
        internal
        view
        returns (bool)
    {
        DatasetReference[] storage references =
            _trainingDatasets[trainingId];

        for (
            uint256 i = 0;
            i < references.length;
            i++
        ) {
        DatasetReference storage datasetRef =
            references[i];

        DatasetVersion memory datasetVersion =
            this.getDatasetVersion(
                datasetRef.datasetId,
                datasetRef.version
            );

            if (
                datasetVersion.status ==
                DatasetStatus.Revoked
            ) {
                return true;
            }
        }

        return false;
    }

    // ==================================================
    // READ FUNCTIONS
    // ==================================================

    function getTraining(
        uint256 trainingId
    )
        external
        view
        returns (Training memory)
    {
        if (!_trainings[trainingId].exists) {
            revert TrainingNotFound(
                trainingId
            );
        }

        return _trainings[trainingId];
    }

    function getTrainingDatasetReference(
        uint256 trainingId,
        uint256 index
    )
        external
        view
        returns (DatasetReference memory)
    {
        if (!_trainings[trainingId].exists) {
            revert TrainingNotFound(
                trainingId
            );
        }

        return
            _trainingDatasets[
                trainingId
            ][index];
    }

    function getModelTrainingCount(
        uint256 modelId
    )
        external
        view
        returns (uint256)
    {
        return
            _modelTrainings[
                modelId
            ].length;
    }

    function getModelTrainingId(
        uint256 modelId,
        uint256 index
    )
        external
        view
        returns (uint256)
    {
        return
            _modelTrainings[
                modelId
            ][index];
    }

    function getDatasetVersionTrainingCount(
        uint256 datasetId,
        uint256 version
    )
        external
        view
        returns (uint256)
    {
        return
            _datasetVersionTrainings[
                datasetId
            ][version].length;
    }

    function getDatasetVersionTrainingId(
        uint256 datasetId,
        uint256 version,
        uint256 index
    )
        external
        view
        returns (uint256)
    {
        return
            _datasetVersionTrainings[
                datasetId
            ][version][index];
    }
}