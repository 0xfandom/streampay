# StreamPay — Protocol Assumptions

## Supported Token Behavior

StreamPay assumes ERC20 tokens:

- do not charge transfer fees
- do not rebase balances
- do not burn on transfer
- follow standard ERC20 behavior

Fee-on-transfer tokens are NOT supported.

Using such tokens may break accounting invariants.

---

## Timestamp Assumptions

StreamPay relies on `block.timestamp`.

Ethereum allows small timestamp manipulation:

- usually ±15 seconds
- cannot significantly alter vesting

Impact on vesting is negligible.

---

## Time Resolution

Vesting operates at second-level precision.

This is sufficient for:

- salaries
- grants
- token distributions

---

## Trust Model

StreamPay is non-custodial:

- sender funds stream
- contract enforces schedule
- no admin privileges exist
- no upgrade mechanism included

Users must verify schedules before funding.

---

## Cancellation Assumptions

If a stream is cancelable:

- sender may stop vesting early
- unvested funds return to sender
- vested portion remains claimable

Cancellation freezes vesting by updating endTime.
