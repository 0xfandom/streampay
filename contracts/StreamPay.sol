/*//////////////////////////////////////////////////////////////
                        WITHDRAW
//////////////////////////////////////////////////////////////*/

/// @notice Withdraw vested tokens (supports partial withdrawals)
function withdraw(uint256 streamId, uint128 amount)
    external
    nonReentrant
{
    Stream storage s = _streams[streamId];

    if (s.sender == address(0)) revert StreamDoesNotExist();
    if (msg.sender != s.recipient) revert NotRecipient();
    if (amount == 0) revert InvalidAmount();

    uint64 currentTime = uint64(block.timestamp);

    // Calculate vested at current time
    uint128 vested = vestedAmount(streamId, currentTime);

    // Enforce invariant: withdrawn <= vested
    if (s.withdrawn > vested) revert StreamInvariantViolation();

    uint128 withdrawable = vested - s.withdrawn;

    if (amount > withdrawable) revert InvalidAmount();

    // Effects (update state before interaction)
    s.withdrawn += amount;

    // Interaction
    IERC20(s.token).safeTransfer(s.recipient, amount);

    emit Withdrawn(streamId, s.recipient, amount);
}


/*//////////////////////////////////////////////////////////////
                        CANCEL
//////////////////////////////////////////////////////////////*/

/// @notice Cancel a cancelable stream.
/// @dev Freezes vesting at cancellation time and refunds unvested tokens.
function cancel(uint256 streamId)
    external
    nonReentrant
{
    Stream storage s = _streams[streamId];

    if (s.sender == address(0)) revert StreamDoesNotExist();
    if (msg.sender != s.sender) revert NotSender();
    if (!s.cancelable) revert NotCancelable();
    if (s.canceled) revert StreamInactive();

    uint64 cancelTime = uint64(block.timestamp);

    // Compute vested BEFORE modifying endTime
    uint128 vested = vestedAmount(streamId, cancelTime);

    // Safety cap
    if (vested > s.deposit) vested = s.deposit;

    // Enforce invariant: withdrawn <= vested
    if (s.withdrawn > vested) revert StreamInvariantViolation();

    // Freeze vesting permanently
    s.endTime = cancelTime;
    s.canceled = true;

    // Unvested portion goes back to sender
    uint128 refund = s.deposit - vested;

    if (refund > 0) {
        IERC20(s.token).safeTransfer(s.sender, refund);
    }

    emit Canceled(streamId, s.sender, refund, vested);
}


/*//////////////////////////////////////////////////////////////
                    WITHDRAWABLE VIEW
//////////////////////////////////////////////////////////////*/

/// @notice Returns currently withdrawable amount
function withdrawableAmount(uint256 streamId)
    public
    view
    returns (uint128)
{
    Stream storage s = _streams[streamId];

    if (s.sender == address(0)) return 0;

    uint128 vested = vestedAmount(streamId, uint64(block.timestamp));

    if (vested <= s.withdrawn) {
        return 0;
    }

    return vested - s.withdrawn;
}
