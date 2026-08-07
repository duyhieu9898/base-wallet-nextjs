/**
 * Live verification entrypoint (`@nln/web3-solana/testing`).
 *
 * Exposes the read services directly so a node script can exercise the same code
 * path the hooks use, against a real cluster, without React.
 *
 * Separate from the main barrel because these are not the application API: a
 * screen uses `useSolanaNativeBalance`, which adds caching, cluster keying and
 * the enabled-when-ready guard. A component calling the service directly would
 * bypass all three.
 */
export {
  fetchNativeBalance,
  fetchTokenBalances,
} from "../reads/balances/solana-balance.service"

export { resetSolanaConnections } from "../clients/create-solana-connection"
