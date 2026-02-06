# 🛡️ Layer 1 SOP: System Invariants

> **Scope**: Immutable System Laws.
> **Severity**: Violation = System Critical Error.

## 1. The Timeline Invariant
> "You cannot pay for something before you exist."

*   **Rule**: `Transaction Date` cannot be `<` `Company Incorporation Date`.
*   **Rule**: `Forecast Date` cannot be `<` `Current Date`.

## 2. The Status Progression Invariant
> "Money must flow forward."

*   **Income**: `PENDING` -> `RECEIVED (UNVERIFIED)` -> `RECEIVED (VERIFIED)`.
    *   *Illegal Transition*: `RECEIVED` -> `PENDING` (Unless Voided).
*   **Expense**: `PLANNED` -> `PENDING` -> `PAID`.

## 3. The Coupling Invariant (Anti-Corruption)
> "QuoteForge is a stranger."

*   **Rule**: We NEVER delete data in QuoteForge.
*   **Rule**: We NEVER modify data in QuoteForge.
*   **Rule**: If QuoteForge API fails, Ledgerly functions in `Read-Only / Manual Mode`.

## 4. The "Single Currency" Simplification (Phase 1)
*   **Invariant**: All Multi-currency inputs must be converted to `Base Currency` (USD) at the moment of entry.
*   **Reason**: We are not building a Forex trading platform. We need simple runways.
