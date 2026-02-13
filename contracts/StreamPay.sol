    /*//////////////////////////////////////////////////////////////
                                WITHDRAW
    //////////////////////////////////////////////////////////////*/

    /// @notice Withdraw vested tokens (supports partial withdrawals)
    function withdraw(uint256 streamId, uint128 amount) external nonReentrant {
        Stream storage s = _streams[streamId];

        if (s.sender == address(0)) revert StreamDoesNotExist();
        if (msg.sender != s.recipient) revert NotRecipient();
        if (amount == 0) revert InvalidAmount();

        // Optional safety: if canceled, only allow vested portion
        if (s.canceled && block.timestamp < s.endTime) revert StreamCanceled();

        uint128 available = withdrawableAmount(streamId);
        if (amount > available) revert InvalidAmount();

        // Effects (update state before transfer)
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
    function cancel(uint256 streamId) external nonReentrant {
        Stream storage s = _streams[streamId];

        if (s.sender == address(0)) revert StreamDoesNotExist();
        if (msg.sender != s.sender) revert NotSender();
        if (!s.cancelable) revert NotCancelable();
        if (s.canceled) revert StreamInactive();

        uint64 cancelTime = uint64(block.timestamp);

        // Freeze vesting by updating endTime
        if (cancelTime < s.endTime) {
            s.endTime = cancelTime;
        }

        s.canceled = true;

        // Calculate vested at cancellation
        uint128 vested = vestedAmount(streamId, cancelTime);

        // Sender gets unveste
