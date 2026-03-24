// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

/**
 * @title BynomoTreasuryReactor
 * @notice On-chain Somnia Reactivity handler for BynomoTreasury events.
 *
 * When BynomoTreasury emits a Deposited or Withdrawn event, the Somnia
 * Reactivity Precompile calls this contract's _onEvent() in the same block.
 * The reactor emits DepositConfirmed / WithdrawConfirmed so the frontend can
 * pick them up via WebSocket subscriptions.
 */
contract BynomoTreasuryReactor is SomniaEventHandler {
    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event DepositConfirmed(address indexed user, uint256 amount, uint256 reactedAt);
    event WithdrawConfirmed(address indexed to, uint256 amount, uint256 reactedAt);

    // ---------------------------------------------------------------------
    // Event topic selectors
    // ---------------------------------------------------------------------

    // keccak256("Deposited(address,uint256,uint256)")
    bytes32 private constant DEPOSITED_TOPIC =
        0x73a19dd210f1a7f902193214c0ee91dd35ee5b4d920cba8d519eca65a7b488ca;

    // keccak256("Withdrawn(address,uint256,uint256)")
    bytes32 private constant WITHDRAWN_TOPIC =
        0x92ccf450a286a957af52509bc1c9939d1a6a481783e142e41e2499f0bb66ebc6;

    /**
     * @notice Called by the Somnia Reactivity Precompile when a subscribed event
     * fires on BynomoTreasury.
     *
     * @param emitter Address of the emitting contract (BynomoTreasury)
     * @param eventTopics topics[] from the log (topics[0] = event selector)
     * @param data ABI-encoded non-indexed parameters
     */
    function _onEvent(
        address /* emitter */,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        if (eventTopics.length < 2) return;

        bytes32 selector = eventTopics[0];

        // indexed address is padded to 32 bytes — take the last 20 bytes
        address participant = address(uint160(uint256(eventTopics[1])));

        // Decode non-indexed fields: (uint256 amount, uint256 timestamp)
        if (data.length < 64) return;
        uint256 amount = abi.decode(data[:32], (uint256));

        if (selector == DEPOSITED_TOPIC) {
            emit DepositConfirmed(participant, amount, block.timestamp);
        } else if (selector == WITHDRAWN_TOPIC) {
            emit WithdrawConfirmed(participant, amount, block.timestamp);
        }
        // Unknown events are silently ignored.
    }
}

