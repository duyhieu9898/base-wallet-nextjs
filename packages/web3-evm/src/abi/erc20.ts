/**
 * ERC-20 ABI — re-export the official version of Viem (readonly tuple, stable). All kinds of things
 * app function needs: name/symbol/decimals/totalSupply/balanceOf/allowance/approve/transfer
 * + events Approval/Transfer. Compatible with real USDC. Avoid exposing admin methods.
 */
export { erc20Abi as standardErc20Abi } from "viem"
