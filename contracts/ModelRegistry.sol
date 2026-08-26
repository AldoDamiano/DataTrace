// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DataTraceAccess} from "./DataTraceAccess.sol";

contract ModelRegistry is DataTraceAccess {
    enum ModelStatus {
        Active,
        Retired
    }

    struct Model {
        bytes32 modelHash;
        address developer;
        ModelStatus status;
        uint256 createdAt;
        uint256 retiredAt;
        bool exists;
    }

    uint256 private _nextModelId = 1;

    mapping(uint256 => Model) private _models;

    // ==================================================
    // ERRORS
    // ==================================================

    error InvalidModelHash();

    error ModelNotFound(
        uint256 modelId
    );

    error NotModelDeveloper(
        uint256 modelId,
        address caller
    );

    error InvalidModelStatus(
        uint256 modelId,
        ModelStatus currentStatus
    );

    // ==================================================
    // EVENTS
    // ==================================================

    event ModelRegistered(
        uint256 indexed modelId,
        address indexed developer,
        bytes32 modelHash
    );

    event ModelRetired(
        uint256 indexed modelId,
        address indexed developer
    );

    // ==================================================
    // MODEL REGISTRATION
    // ==================================================

    function registerModel(
        bytes32 modelHash
    )
        external
        onlyRole(AI_DEVELOPER_ROLE)
        whenNotPaused
        returns (uint256 modelId)
    {
        if (modelHash == bytes32(0)) {
            revert InvalidModelHash();
        }

        modelId = _nextModelId;
        _nextModelId++;

        _models[modelId] = Model({
            modelHash: modelHash,
            developer: msg.sender,
            status: ModelStatus.Active,
            createdAt: block.timestamp,
            retiredAt: 0,
            exists: true
        });

        emit ModelRegistered(
            modelId,
            msg.sender,
            modelHash
        );
    }

    // ==================================================
    // MODEL RETIREMENT
    // Active -> Retired
    // ==================================================

    function retireModel(
        uint256 modelId
    )
        external
        onlyRole(AI_DEVELOPER_ROLE)
        whenNotPaused
    {
        Model storage model =
            _models[modelId];

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

        model.status =
            ModelStatus.Retired;

        model.retiredAt =
            block.timestamp;

        emit ModelRetired(
            modelId,
            msg.sender
        );
    }

    // ==================================================
    // READ FUNCTIONS
    // ==================================================

    function getModel(
        uint256 modelId
    )
        external
        view
        returns (Model memory)
    {
        return _models[modelId];
    }
}