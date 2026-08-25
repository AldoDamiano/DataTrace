// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract DataTraceAccess is AccessControl, Pausable {
    bytes32 public constant GOVERNANCE_ROLE =
        keccak256("GOVERNANCE_ROLE");

    bytes32 public constant DATA_PROVIDER_ROLE =
        keccak256("DATA_PROVIDER_ROLE");

    bytes32 public constant AI_DEVELOPER_ROLE =
        keccak256("AI_DEVELOPER_ROLE");

    bytes32 public constant AUDITOR_ROLE =
        keccak256("AUDITOR_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);

        _setRoleAdmin(DATA_PROVIDER_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(AI_DEVELOPER_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, GOVERNANCE_ROLE);
    }

    function pause()
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        _pause();
    }

    function unpause()
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        _unpause();
    }
}