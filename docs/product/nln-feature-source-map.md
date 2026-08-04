# NLN Feature Source Map

## Status and use

This is an intake map of draft material in `docs/local-docs/`. It preserves the
source structure for later product work; it is **not** an accepted product
contract, execution plan, architecture decision, or implementation scope.

The source directory is local-only and ignored by Git. When a feature is
accepted, move only its reviewed, current behavior into a focused document in
`docs/product/`; record a lasting technical or product choice in
`docs/decisions/` only when one is actually made.

## Source groups

| Source                                           | Contents                                                                                                                          | Role now                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `01_requirement/01_business-requirement_v1.0.md` | MLM business rules: flexible stake, PV, P/T ranks, active positions, team bonus, unilevel structure, reward funding, and examples | Draft business input                   |
| `01_requirement/03_screen-requirement.md`        | Screen-level requirements for guest, member, and admin surfaces                                                                   | Draft screen inventory                 |
| `10_screen-design/`                              | Navigation map and per-screen states, components, and events                                                                      | Draft UX reference                     |
| `90_knowledge/01_mlm-unilevel-bonus/`            | Unilevel and matching-bonus concepts                                                                                              | Research reference                     |
| `90_knowledge/02_staking/`                       | MLM-oriented staking models, entities, comparisons, and case studies                                                              | Research reference                     |
| `90_knowledge/03_staking_v1/`                    | Onchain/pool-staking alternatives independent of MLM                                                                              | Research reference                     |
| `90_knowledge/04_lending/`                       | Lending-pool models and entities                                                                                                  | Research reference; not selected scope |

## Draft feature structure

### 1. Guest access and membership entry

- Landing and legal information.
- Wallet connection and membership lookup.
- Referral-based member registration.
- Maintenance-mode access handling.

Source screens: `A010100`, `A010200`, `A020100`, `A030000`, `A040000`.

### 2. Member application

- Dashboard and quick actions.
- Staking and unstaking.
- Organization/unilevel tree and referral sharing.
- Rewards, withdrawals, and wallet history.

Source screens: `B010100`, `B010200`, `B020000`, `B030000`, `B040100`,
`B050000`, `B060000`, `B070000`, `B080000`.

### 3. Administration

- Admin authentication, overview, and analytics.
- Member and position management plus the system organization tree.
- Rank, team-bonus, and fee configuration.
- Planned maintenance configuration, team-bonus operations, and reward-vault
  management.

Source screens: `C010000`, `C020100`, `C020200`, `C040100`, `C040200`,
`C050100`, `C0601xx`, `C0602xx`, `C0603xx`, `C0604xx`, `C060500`,
`C070000`, `C080000`.

### 4. Cross-cutting domain topics

- Stake positions, PV/CV, P Rank, T Rank, team bonus, and reward-vault
  accounting.
- Wallet identity, transaction history, network/token configuration, and
  onchain read/write boundaries.
- Role separation, maintenance access, validation, error states, and audit
  requirements.

## Review gates before implementation

No source document currently decides these items for the existing application:

- the first deliverable and its user-visible acceptance criteria;
- supported network, token, contracts, and contract deployment authority;
- backend/API ownership and the source of truth for membership, ranks, rewards,
  and vault balances;
- the relationship between wallet SIWE authentication and the proposed member
  and admin access flows;
- selected staking model, reward funding/custody, withdrawal semantics, and
  applicable legal/compliance review;
- which research alternatives are intentionally out of scope.

Resolve only the gates needed for the first accepted feature. Keep unselected
material as reference rather than treating it as application behavior.
