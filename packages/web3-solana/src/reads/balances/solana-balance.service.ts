/**
 * RPC calls behind the balance hooks. Framework-free so a node script can use
 * the same code path the UI does.
 */

import { PublicKey } from "@solana/web3.js"

import { getSolanaTokensForCluster } from "../../chain/registry/solana-registry.adapter"
import type {
  SolanaClusterKey,
  SplTokenConfig,
} from "../../chain/registry/solana-registry.types"
import {
  createSolanaConnection,
  SOLANA_READ_COMMITMENT,
} from "../../clients/create-solana-connection"
import { createSolanaWeb3Error } from "../../errors/solana-errors"
import {
  toNativeBalance,
  toTokenBalances,
  withMissingRegistryTokens,
  type ParsedTokenAccount,
} from "./solana-balance.adapter"
import type { SolanaAssetBalance } from "./solana-balance.types"

/**
 * The SPL Token program. Token-2022 is deliberately absent.
 *
 * The requirement record, item 5, states the product supports standard SPL
 * tokens and **not** Token-2022. An earlier version queried both because the
 * Uniswap reference does — but Uniswap is a universal token UI, and this is a
 * staking application whose asset set is the registry.
 */
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
)

export async function fetchNativeBalance(
  cluster: SolanaClusterKey,
  owner: string,
): Promise<SolanaAssetBalance> {
  try {
    const lamports = await createSolanaConnection(cluster).getBalance(
      new PublicKey(owner),
      SOLANA_READ_COMMITMENT,
    )

    return toNativeBalance(lamports)
  } catch (cause) {
    throw createSolanaWeb3Error(
      "ACCOUNT_READ_FAILED",
      `Failed to read native balance for ${owner} on "${cluster}".`,
      cause,
    )
  }
}

/**
 * Balances for exactly the tokens this application configured — no more.
 *
 * Registry-driven, matching `@nln/web3-evm`, which builds its balance calls from
 * `getEvmTokensForChain` and never enumerates wallet holdings. The result is
 * always one entry per enabled registry token, zero-filled when the owner has no
 * account, so the list is stable regardless of what else the wallet holds.
 *
 * The RPC call is still "by owner" rather than one call per mint, because that
 * is a single round trip; the registry filter is applied to the response. What
 * changed from the earlier version is that unknown mints are now discarded
 * instead of surfacing as "UNKNOWN" — a real devnet wallet produced 266 of them.
 */
export async function fetchTokenBalances(
  cluster: SolanaClusterKey,
  owner: string,
): Promise<SolanaAssetBalance[]> {
  const connection = createSolanaConnection(cluster)
  const ownerKey = new PublicKey(owner)
  const registryTokens = getSolanaTokensForCluster(cluster)
  const registryMints = new Set(registryTokens.map((token) => token.mint))

  let accounts: ParsedTokenAccount[]

  try {
    const response = await connection.getParsedTokenAccountsByOwner(
      ownerKey,
      { programId: TOKEN_PROGRAM_ID },
      SOLANA_READ_COMMITMENT,
    )

    accounts = response.value.flatMap<ParsedTokenAccount>((entry) => {
      const info = entry.account.data.parsed?.info

      // A malformed entry is dropped rather than defaulted to zero: a zero
      // balance is indistinguishable from a real one and would be shown as
      // fact.
      if (!info?.mint || !info.tokenAmount) {
        return []
      }

      const mint = String(info.mint)

      if (!registryMints.has(mint)) {
        return []
      }

      return [
        {
          mint,
          amount: String(info.tokenAmount.amount),
          decimals: Number(info.tokenAmount.decimals),
        },
      ]
    })
  } catch (cause) {
    throw createSolanaWeb3Error(
      "ACCOUNT_READ_FAILED",
      `Failed to read token balances for ${owner} on "${cluster}".`,
      cause,
    )
  }

  // Outside the try: a metadata mismatch is a configuration bug, and wrapping it
  // as ACCOUNT_READ_FAILED would report a config error as a network error.
  assertRegistryDecimalsMatchChain(accounts, registryTokens, cluster)

  return withMissingRegistryTokens(
    toTokenBalances(accounts, registryTokens),
    registryTokens,
  )
}

/**
 * Reject a registry whose declared decimals disagree with the mint on chain.
 *
 * Required by item 5 of the requirement record, which cites the product spec:
 * skipping the decimal conversion underpays rewards by a factor of 1,000 **with
 * no error raised**. A silent factor-of-1000 error is worse than a loud failure,
 * so this throws rather than degrading.
 *
 * It throws for the whole read rather than dropping one token, because a wrong
 * `expectedDecimals` means every amount rendered for that token is wrong,
 * including the zero-filled entries that never touch chain data.
 *
 * Note this goes further than `@nln/web3-evm`, whose `hydrateTokens` validates
 * the shape of `expectedDecimals` at boot but never compares it against the
 * ERC-20 contract. The Solana spec calls the mismatch out explicitly, so the
 * check exists here first.
 */
function assertRegistryDecimalsMatchChain(
  accounts: readonly ParsedTokenAccount[],
  registryTokens: readonly SplTokenConfig[],
  cluster: SolanaClusterKey,
): void {
  const declared = new Map(
    registryTokens.map((token) => [token.mint, token] as const),
  )

  for (const account of accounts) {
    const token = declared.get(account.mint)

    if (token && account.decimals !== token.expectedDecimals) {
      throw createSolanaWeb3Error(
        "TOKEN_METADATA_MISMATCH",
        `Token "${token.symbol}" on cluster "${cluster}" declares ${token.expectedDecimals} decimals but mint ${account.mint} reports ${account.decimals}.`,
      )
    }
  }
}
