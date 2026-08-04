import { z } from "zod"
import { isAddress, type Address } from "viem"

/**
 * Runtime contract for every auth response.
 *
 * The backend is the authority of the session, but the frontend still has to validate: one
 * Malformed payloads are not allowed to be committed to authenticated state or written
 * access token into memory.
 */

const addressSchema = z.custom<Address>(
  (value) => typeof value === "string" && isAddress(value),
  { message: "Not a valid EVM address." },
)

/** String timestamp must be parsable to a finite time. */
const timestampSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Timestamp is invalid.",
  })

const authUserSchema = z.object({
  id: z.string().min(1),
  walletAddress: addressSchema,
  roles: z.array(z.string()),
})

/**
 * The only payload that auth endpoints return on success.
 *
 * There is no schema for "unauthenticated payload": the contract is set to *200
 * authenticated | 401*, so the form `{ authenticated: false }` never arrives.
 * Modeling it just creates a dead branch.
 *
 * The Refresh token is NOT present here by design: it only exists in HttpOnly
 * cookie and never goes into JavaScript.
 */
export const authenticatedSessionPayloadSchema = z.object({
  authenticated: z.literal(true),
  user: authUserSchema,
  accessToken: z.string().min(1),
  accessTokenExpiresAt: timestampSchema,
})

export const requestSiweNonceInputSchema = z.object({
  walletAddress: addressSchema,
  chainId: z.number().int().positive(),
})

/**
 * The nonce response must describe its lifecycle: a nonce has expired
 * before release is proof the backend or mock is wrong.
 */
export const siweNonceResponseSchema = z
  .object({
    nonce: z.string().min(1),
    issuedAt: timestampSchema,
    expirationTime: timestampSchema,
  })
  .refine(
    (value) => Date.parse(value.expirationTime) > Date.parse(value.issuedAt),
    {
      message: "expirationTime must be after issuedAt.",
      path: ["expirationTime"],
    },
  )

export const verifySiweInputSchema = z.object({
  message: z.string().min(1),
  signature: z.custom<`0x${string}`>(
    (value) => typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value),
    { message: "Signature must be hex string." },
  ),
})

/**
 * Types are inferred directly from the schema.
 *
 * Put together files instead of separating `auth.types.ts`: they are pure `z.infer`, not
 * Never make changes independently of the schema — splitting only creates two files that must be edited at the same time
 * time.
 */

/**
 * Authentication principal. `email`/`displayName` intentionally absent: them
 * is profile data belonging to the business feature, not the identity of the session.
 */
export type AuthUser = z.infer<typeof authUserSchema>

export type AuthenticatedSessionPayload = z.infer<
  typeof authenticatedSessionPayloadSchema
>

export type RequestSiweNonceInput = z.infer<typeof requestSiweNonceInputSchema>

export type SiweNonceResponse = z.infer<typeof siweNonceResponseSchema>

export type VerifySiweInput = z.infer<typeof verifySiweInputSchema>
