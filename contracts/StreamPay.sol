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
