// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PassageLedger
/// @notice Lightweight on-chain audit trail for Passage trade-agent settlements.
///         Each entry is a receipt that an AI agent paid one or more x402 data
///         providers on behalf of a human trader and reached a final answer.
///         This does NOT move funds itself - actual USDC payment happens via
///         the x402 protocol's own EIP-3009 transfer. This contract exists so
///         a trader, a data provider, or an auditor can verify - independent
///         of Passage's own backend - that a given interaction was paid for
///         and how many providers were involved, without exposing the
///         contents of the query itself (only a hash of it is stored).
contract PassageLedger {
    struct Settlement {
        address agent;          // the wallet that paid for this interaction
        bytes32 queryHash;      // keccak256 hash of the query + answer payload
        uint256 totalMicroUSD;  // total spent, in micro-USD (1e6 = $1) for cheap integer math
        uint32 providerCount;   // how many distinct paid providers were used
        uint64 timestamp;
    }

    Settlement[] private _settlements;

    event SettlementRecorded(
        uint256 indexed id,
        address indexed agent,
        bytes32 indexed queryHash,
        uint256 totalMicroUSD,
        uint32 providerCount,
        uint64 timestamp
    );

    /// @notice Record a completed, paid trader interaction.
    /// @param queryHash keccak256 hash of the (query, answer) pair - lets an
    ///        auditor confirm a specific interaction was recorded without the
    ///        chain ever storing the trader's raw message.
    /// @param totalMicroUSD total amount paid across all providers, in micro-USD.
    /// @param providerCount number of distinct providers paid for this query.
    function recordSettlement(
        bytes32 queryHash,
        uint256 totalMicroUSD,
        uint32 providerCount
    ) external returns (uint256 id) {
        id = _settlements.length;
        _settlements.push(
            Settlement({
                agent: msg.sender,
                queryHash: queryHash,
                totalMicroUSD: totalMicroUSD,
                providerCount: providerCount,
                timestamp: uint64(block.timestamp)
            })
        );

        emit SettlementRecorded(id, msg.sender, queryHash, totalMicroUSD, providerCount, uint64(block.timestamp));
    }

    function settlementCount() external view returns (uint256) {
        return _settlements.length;
    }

    function getSettlement(uint256 id) external view returns (Settlement memory) {
        require(id < _settlements.length, "PassageLedger: out of range");
        return _settlements[id];
    }

    /// @notice Total micro-USD an agent address has ever routed through Passage.
    ///         Useful as a lightweight, public reputation signal for an agent
    ///         wallet (e.g. "this agent has settled $4,200 across 900 queries").
    function totalVolumeForAgent(address agent) external view returns (uint256 totalMicroUSD, uint256 count) {
        uint256 len = _settlements.length;
        for (uint256 i = 0; i < len; i++) {
            if (_settlements[i].agent == agent) {
                totalMicroUSD += _settlements[i].totalMicroUSD;
                count += 1;
            }
        }
    }
}
