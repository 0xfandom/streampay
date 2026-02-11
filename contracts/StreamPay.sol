// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StreamPay
/// @notice On-chain token streaming & vesting protocol
contract StreamPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error StreamDoesNotExist();
    error InvalidAmount();
    error InvalidSchedule();
    error InvalidAddress();
    error NotSender();
    error NotRecipient();
    error StreamCanceled();
    error StreamNotCancelable();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

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

    event Withdrawn(uint256 indexed streamId, address indexed recipient, uint128 amount);

    event Canceled(
        uint256 indexed streamId,
        address indexed sender,
        uint128 senderRefund,
        uint128 recipientVested
    );

    /*//////////////////////////////////////////////////////////////
                                DATA MODEL
    //////////////////////////////////////////////////////////////*/

    struct Stream {
        address token;
        address sender;
        address recipient;
        uint128 deposit;
        uint128 withdrawn;
        uint64 startTime;
        uint64 cliffTime;
        uint64 endTime;
        bool cancelable;
        bool canceled;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 public nextStreamId = 1;
    mapping(uint256 => Stream) internal _streams;

    /*//////////////////////////////////////////////////////////////
                            STREAM CREATION
    //////////////////////////////////////////////////////////////*/

    function createStream(
        address token,
        address recipient,
        uint128 deposit,
        uint64 startTime,
        uint64 cliffTime,
        uint64 endTime,
        bool cancelable
    ) external nonReentrant returns (uint256 streamId) {
        if (token == address(0) || recipient == address(0)) revert InvalidAddress();
        if (deposit == 0) revert InvalidAmount();

        // Validate schedule
        if (!(startTime <= cliffTime && cliffTime <= endTime)) revert InvalidSchedule();
        if (endTime <= startTime) revert InvalidSchedule();

        streamId = nextStreamId++;

        _streams[streamId] = Stream({
            token: token,
            sender: msg.sender,
            recipient: recipient,
            deposit: deposit,
            withdrawn: 0,
            startTime: startTime,
            cliffTime: cliffTime,
            endTime: endTime,
            cancelable: cancelable,
            canceled: false
        });

        // Pull tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), deposit);

        emit StreamCreated(
            streamId,
            token,
            msg.sender,
            recipient,
            deposit,
            startTime,
            cliffTime,
            endTime,
            cancelable
        );
    }

    /*//////////////////////////////////////////////////////////////
                                VIEWS
    //////////////////////////////////////////////////////////////*/

    function getStream(uint256 streamId) external view returns (Stream memory) {
        Stream memory s = _streams[streamId];
        if (s.sender == address(0)) revert StreamDoesNotExist();
        return s;
    }

    function streamExists(uint256 streamId) public view returns (bool) {
        return _streams[streamId].sender != address(0);
    }
}
