# Test staking contract

`TestStakingVault` is an integration fixture for Ethereum Sepolia. It accepts
native ETH and the USDC address supplied during deployment, then lets the same
wallet withdraw its whole or partial deposit immediately.

```text
contracts/
├── src/       Solidity source
├── tooling/   compiler and deployment commands
└── tests/     contract compiler tests
```

It intentionally has no rewards, lock period, administrator, upgradeability,
or production security/audit claim. Do not deploy it to mainnet or use it with
valuable assets.

## Sepolia deployment

| Field                     | Value                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| Contract                  | `0xb786c18d2feb8ea7ee9d3a295203d7b1420abe43`                         |
| Deployment transaction    | `0xb6c315df75b7adcb1dbc510ccd02c7fdfcd2559a60d4efbbd0489af73ca17096` |
| Block                     | `11416889`                                                           |
| USDC constructor argument | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`                         |

This is a Sepolia integration fixture only. It is not a production deployment.

Compile and inspect its ABI/bytecode:

```bash
pnpm staking:compile
```

Deploy to Sepolia after placing a dedicated test key in `.env.local`:

```dotenv
SEPOLIA_DEV_PRIVATE_KEY=0x...
```

The command requires an explicit confirmation string and estimates gas before
broadcasting:

```bash
CONFIRM_SEPOLIA_DEPLOY=DEPLOY_TEST_STAKING_VAULT pnpm staking:deploy-sepolia
```

After deployment, record the resulting address in the feature-local registry;
do not substitute a mainnet or third-party deployment.
