# StreamPay — Security & Protocol Guarantees

This document describes the formal security properties, invariants, and intentional design limitations of the StreamPay protocol.

---

## Reentrancy Protection

All external state-changing functions use `ReentrancyGuard`.

The **checks-effects-interactions** pattern is strictly enforced:
state is always updated before any external token transfer occurs.

This prevents:
- Recursive calls
- Double withdrawals
- Cross-function reentrancy attacks

---

## Accounting Invariants

StreamPay enforces the following invariant at all times:

withdrawn ≤ vested ≤ deposit


Meaning:
- A user can never withdraw more than what has vested
- Vesting can never exceed the deposited amount
- Withdrawals are always bounded by earned value

This invariant is validated through:
- Unit tests
- Edge-case simulations
- Cancellation and full-vesting scenarios

---

## Overflow Protection

The protocol is compiled with Solidity `^0.8.0`, which provides:

- Automatic overflow and underflow checks
- Reverts on arithmetic errors

Additionally:
- No `unchecked` arithmetic is used anywhere
- All calculations are bounded by deposited and vested values

This guarantees:

vested ≤ deposit


cannot be violated by arithmetic bugs.

---

## Vesting Freeze

When a stream is cancelled, vesting is permanently frozen by setting:

endTime = cancelTime


This ensures:
- Vesting stops immediately
- No additional tokens can vest after cancellation
- Users can only withdraw what was earned up to that moment

This prevents:
- Time-based manipulation
- Delayed cancellation exploits
- Artificial vesting extension

---

## Known Limitations (Intentional)

The following are deliberate design choices:

- **No support for fee-on-transfer tokens**  
  Ensures deterministic accounting and invariant safety

- **No pause mechanism**  
  Prevents governance or admin-based fund freezes

- **No admin recovery function**  
  Funds cannot be seized, frozen, or redirected by anyone

These choices make StreamPay a **trust-minimized, non-custodial streaming protocol**.

## Threat Model

See: `docs/threat-model.md`

## Audit Checklist

See: `docs/audit-checklist.md`
