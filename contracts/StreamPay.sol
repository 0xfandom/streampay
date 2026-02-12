    /*//////////////////////////////////////////////////////////////
                                WITHDRAW
    //////////////////////////////////////////////////////////////*/

    /// @notice Withdraw vested tokens (partial withdrawals supported)
    function withdraw(uint256 streamId, uint128 amount) external nonReentrant {
        Stream storage s = _streams[streamId];

        if (s.sender == address(0)) revert StreamDoesNotExist();
        if (msg.sender != s.recipient) revert NotRecipient();
        if (amount == 0) revert InvalidAmount();
        if (s.canceled) revert StreamCanceled();

        uint128 available = withdrawableAmount(streamId);
        if (amount > available) revert InvalidAmount();

        // Effects
        s.withdrawn += amount;

        // Interaction
        IERC20(s.token).safeTransfer(s.recipient, amount);

        emit Withdrawn(streamId, s.recipient, amount);
    }
