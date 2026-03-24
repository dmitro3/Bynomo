// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BynomoTreasury
 * @notice Non-custodial treasury for Bynomo binary options protocol on Somnia.
 *
 * Users deposit STT into this contract. Owner processes withdrawals after
 * off-chain authorization. All movements emit events for Somnia Reactivity
 * subscriptions to pick up in real-time.
 */
contract BynomoTreasury {
    address public owner;
    bool public paused;

    // ---------------------------------------------------------------------
    // Events (Somnia Reactivity subscribes to these)
    // ---------------------------------------------------------------------
    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "BynomoTreasury: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "BynomoTreasury: contract is paused");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---------------------------------------------------------------------
    // Deposit
    // ---------------------------------------------------------------------

    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "BynomoTreasury: deposit amount must be > 0");
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Accept plain native token transfers (e.g. from wallet send) and emit Deposited.
     */
    receive() external payable whenNotPaused {
        if (msg.value > 0) {
            emit Deposited(msg.sender, msg.value, block.timestamp);
        }
    }

    // ---------------------------------------------------------------------
    // Withdrawal
    // ---------------------------------------------------------------------

    /**
     * @notice Transfer STT to a user. Only callable by owner (backend signer)
     * after verifying the user's off-chain house balance.
     * @param to Recipient address
     * @param amount Amount in wei to send
     */
    function withdrawTo(address payable to, uint256 amount) external onlyOwner whenNotPaused {
        require(to != address(0), "BynomoTreasury: zero address");
        require(amount > 0, "BynomoTreasury: amount must be > 0");
        require(address(this).balance >= amount, "BynomoTreasury: insufficient balance");

        (bool ok, ) = to.call{value: amount}("");
        require(ok, "BynomoTreasury: transfer failed");

        emit Withdrawn(to, amount, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // View
    // ---------------------------------------------------------------------
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "BynomoTreasury: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

