# StreamPay — Threat Model

## Overview

This document defines the threat model, attack surfaces, and mitigation
strategies for the StreamPay protocol.

StreamPay is a non-custodial token streaming system that manages
time-based token distribution.

---

# System Model

Actors:

- **Sender** — creates and funds streams
- **Recipient** — withdraws vested tokens
- **Blockchain** — provides timestamp and execution
- **ERC20 Token** — external dependency

Trust boundaries:

- Contract must enforce accounting
- Users must trust token behavior
- Timestamp controlled by network

---

# Attack Surfaces

## 1. Reentrancy

### Risk
Malicious token could attempt reentrant calls during transfer.

### Mitigation
- ReentrancyGuard used
- Checks-effects-interactions enforced
- State updated before transfer

---

## 2. Over-Withdrawal

### Risk
Recipient withdraws more than vested.

### Mitigation
- withdrawableAmount calculation
- strict accounting invariant
- invariant tests

---

## 3. Timestamp Manipulation

### Risk
Miners slightly manipulate block.timestamp.

### Impact
Small change in vesting calculation.

### Mitigation
- negligible financial impact
- linear schedule reduces exploitability

---

## 4. Token Behavior Risk

### Risk
Non-standard ERC20 tokens:
- fee-on-transfer
- rebasing
- deflationary tokens

### Mitigation
- explicitly unsupported
- documented assumption

---

## 5. Cancellation Abuse

### Risk
Sender cancels immediately after stream creation.

### Impact
Recipient receives minimal funds.

### Mitigation
- expected behavior
- part of trust model

---

## 6. Arithmetic Overflow / Underflow

### Mitigation
- Solidity 0.8 overflow protection
- no unchecked math

---

## 7. Accounting Drift

### Risk
Internal accounting diverges from balances.

### Mitigation
Invariant enforced:

