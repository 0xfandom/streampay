# StreamPay — Audit Checklist

## Accounting

- [ ] withdrawn <= vested <= deposit invariant holds
- [ ] withdrawableAmount never negative
- [ ] No precision loss causing over-withdrawal

---

## Time Logic

- [ ] Cliff enforced
- [ ] Linear vesting correct
- [ ] Vesting frozen after cancel
- [ ] Boundary timestamps correct

---

## Access Control

- [ ] Only sender can cancel
- [ ] Only recipient can withdraw
- [ ] No privilege escalation

---

## External Calls

- [ ] SafeERC20 used
- [ ] State updated before transfer
- [ ] ReentrancyGuard used

---

## Token Assumptions

- [ ] Fee-on-transfer not supported
- [ ] No rebasing tokens assumed

---

## Tests

- [ ] Edge cases tested
- [ ] Invariants tested
- [ ] Lifecycle tested

---

## Documentation

- [ ] Precision documented
- [ ] Assumptions documented
- [ ] Threat model documented
