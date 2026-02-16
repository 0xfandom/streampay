// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    StreamPay — Precision & Rounding Model

    All math uses integer division (floor rounding).
    This guarantees:
        withdrawn <= vested <= deposit
        totalWithdrawn <= deposit
*/

contract StreamPay {
    struct Stream {
        uint256 deposit;        // total tokens locked
        uint256 startTime;      // vesting start
        uint256 endTime;        // vesting end
        uint256 withdrawn;     // amount already claimed
    }

    mapping(uint256 => Stream) public streams;

    /* -------------------------------------------
       Core Vesting Formula
       vested = deposit * elapsed / duration
       (Solidity floors all division)
    ------------------------------------------- */
    function vestedAmount(uint256 id) public view returns (uint256) {
        Stream memory s = streams[id];

        if (block.timestamp <= s.startTime) return 0;
        if (block.timestamp >= s.endTime) return s.deposit;

        uint256 elapsed = block.timestamp - s.startTime;
        uint256 duration = s.endTime - s.startTime;

        // floor rounding happens here
        return (s.deposit * elapsed) / duration;
    }

    /* -------------------------------------------
       Withdrawable amount
       withdrawable = vested - withdrawn
    ------------------------------------------- */
    function withdrawable(uint256 id) public view returns (uint256) {
        uint256 vested = vestedAmount(id);
        return vested - streams[id].withdrawn;
    }

    /* -------------------------------------------
       Withdraw logic
    ------------------------------------------- */
    function withdraw(uint256 id) external {
        uint256 amount = withdrawable(id);
        require(amount > 0, "Nothing vested");

        streams[id].withdrawn += amount;

        // token transfer would happen here
    }

    /* -------------------------------------------
       Dust handling
       At full vesting, vested == deposit
       Any rounding dust becomes withdrawable
    ------------------------------------------- */
    function dust(uint256 id) public view returns (uint256) {
        Stream memory s = streams[id];
        return s.deposit - s.withdrawn;
    }

    /* -------------------------------------------
       Safety Invariants (always true)
       
       withdrawn <= vested <= deposit
       withdrawn <= deposit
    ------------------------------------------- */
}
