    /*//////////////////////////////////////////////////////////////
                        VESTING LOGIC (HARDENED)
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns vested amount at a given timestamp
    /// @dev Implements cliff + linear vesting with rounding down
    function vestedAmount(uint256 streamId, uint64 timestamp) public view returns (uint128) {
        Stream memory s = _streams[streamId];
        if (s.sender == address(0)) revert StreamDoesNotExist();

        uint64 effectiveEnd = s.endTime;

        // Before start
        if (timestamp <= s.startTime) {
            return 0;
        }

        // Before cliff
        if (timestamp < s.cliffTime) {
            return 0;
        }

        // At or after end
        if (timestamp >= effectiveEnd) {
            return s.deposit;
        }

        // Safe linear interpolation
        uint256 elapsed = uint256(timestamp - s.startTime);
        uint256 duration = uint256(effectiveEnd - s.startTime);

        uint256 vested = (uint256(s.deposit) * elapsed) / duration;

        return uint128(vested);
    }

    /// @notice Returns currently withdrawable amount
    /// @dev withdrawable = vested(now) - withdrawn (floored at zero)
    function withdrawableAmount(uint256 streamId) public view returns (uint128) {
        Stream memory s = _streams[streamId];
        if (s.sender == address(0)) revert StreamDoesNotExist();

        uint128 vestedNow = vestedAmount(streamId, uint64(block.timestamp));

        if (vestedNow <= s.withdrawn) {
            return 0;
        }

        return vestedNow - s.withdrawn;
    }
