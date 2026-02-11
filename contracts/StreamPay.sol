// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StreamPay
/// @notice On-chain token streaming & vesting protocol (skeleton)
/// @dev Issue #1: Data model, events, errors, and storage only (no business logic).
contract StreamPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @dev Stream does not exist (invalid ID)
    error StreamDoesNotExist();

    /// @dev Generic invalid input amount (e.g., deposit = 0)
    error InvalidAmount();

    /// @dev Generic invalid schedule (e.g., times out of order)
    error InvalidSchedule();

    /// @dev Access control errors
    error NotSender();
    error NotRecipient();

    /// @dev Stream state errors
    error StreamCanceled();
    error StreamNotCancelable();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a stream is created (implemented in Issue #2)
    event StreamCreated(
        uint256 indexed streamId,
        address indexed token,
        address indexed sender,
        address recipient,
        uint128 deposit,
        uint64 startTime,
        uint64 cliffTime,
        uint64 endTime,
        bool cancelable
    );

    /// @notice Emitted when recipient withdraws vested tokens (implemented in Issue #4)
    event Withdrawn(uint256 indexed streamId, address indexed recipient, uint128 amount);

    /// @notice Emitted when sender cancels a stream (implemented in Issue #7)
    event Canceled(
        uint256 indexed streamId,
        address indexed sender,
        uint128 senderRefund,
        uint128 recipientVested
    );

    /*//////////////////////////////////////////////////////////////
                                DATA MODEL
    //////////////////////////////////////////////////////////////*/

    /// @dev Stream represents a single vesting/streaming schedule funded by `sender`
    ///      and claimable by `recipient`.
    struct Stream {
        // Participants
        address token;      // ERC20 token address
        address sender;     // funder / stream creator
        address recipient;  // beneficiary

        // Accounting
        uint128 deposit;    // total deposited amount
        uint128 withdrawn;  // total withdrawn by recipient

        // Schedule
        uint64 startTime;
        uint64 cliffTime;
        uint64 endTime;

        // Flags
        bool cancelable;
        bool canceled;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Next stream ID (starts at 1)
    uint256 public nextStreamId = 1;

    /// @dev Streams storage (streamId => Stream)
    mapping(uint256 => Stream) internal _streams;

    /*//////////////////////////////////////////////////////////////
                                VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns stream data for a given streamId
    /// @dev Reverts if the stream does not exist.
    function getStream(uint256 streamId) external view returns (Stream memory) {
        Stream memory s = _streams[streamId];
        if (s.sender == address(0)) revert StreamDoesNotExist();
        return s;
    }

    /// @notice Checks whether stream exists
    function streamExists(uint256 streamId) public view returns (bool) {
        return _streams[streamId].sender != address(0);
    }
}
