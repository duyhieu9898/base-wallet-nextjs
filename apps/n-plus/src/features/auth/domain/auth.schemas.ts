import { z } from "zod"
import { isAddress, type Address } from "viem"

/**
 * Runtime contract for every auth response.
 *
 * Schemas aligned with the backend OpenAPI spec (see `docs/local-docs/api-reference.md`).
 * The backend is the authority of the session, but the frontend still validates:
 * malformed payloads must never be committed to authenticated state or written
 * as access tokens into memory.
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

// ---------------------------------------------------------------------------
// User & Position
// ---------------------------------------------------------------------------

const userProfileSchema = z.object({
  id: z.string().min(1),
  walletAddress: addressSchema,
  memberCode: z.string().min(1),
})

const userPositionSchema = z.object({
  id: z.string().min(1),
  positionIndex: z.number().int().min(0),
  referralCode: z.string().min(1),
  createdAt: z.string().min(1),
})

// ---------------------------------------------------------------------------
// SIWE Verify — discriminated union
// ---------------------------------------------------------------------------

const siweVerifyAuthenticatedSchema = z.object({
  status: z.literal("authenticated"),
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  user: userProfileSchema,
  position: userPositionSchema.nullable().optional(),
})

const siweVerifyRegistrationRequiredSchema = z.object({
  status: z.literal("registrationRequired"),
  walletAddress: addressSchema,
  registrationTicket: z.string().min(1),
})

export const siweVerifyResponseSchema = z.discriminatedUnion("status", [
  siweVerifyAuthenticatedSchema,
  siweVerifyRegistrationRequiredSchema,
])

// ---------------------------------------------------------------------------
// Refresh / Position Select — always authenticated
// ---------------------------------------------------------------------------

/**
 * Returned by `POST /api/auth/refresh` and `POST /api/auth/positions/select`.
 *
 * The Refresh token is NOT present here by design: it only exists in HttpOnly
 * cookie and never goes into JavaScript.
 */
export const userAuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  user: userProfileSchema,
  position: userPositionSchema,
})

export const requestSiweNonceInputSchema = z.object({
  walletAddress: addressSchema,
  chainId: z.number().int().positive(),
})

/**
 * The nonce response must describe its lifecycle: a nonce has expired
 * before release is proof the backend or mock is wrong.
 *
 * `domain` and `uri` are derived from the request Origin by the backend
 * and must be used when constructing the EIP-4361 message.
 */
export const siweNonceResponseSchema = z
  .object({
    nonce: z.string().min(1),
    issuedAt: timestampSchema,
    expirationTime: timestampSchema,
    domain: z.string().min(1),
    uri: z.string().min(1),
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

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

/**
 * Types are inferred directly from the schema. They are co-located here
 * rather than in a separate `auth.types.ts` because they must always stay
 * in sync with the schema — splitting only creates two files that must be
 * edited at the same time.
 */

/** Authentication principal — profile data lives in the business feature. */
export type AuthUser = z.infer<typeof userProfileSchema>

export type UserPosition = z.infer<typeof userPositionSchema>

export type SiweVerifyResponse = z.infer<typeof siweVerifyResponseSchema>

export type SiweVerifyAuthenticated = z.infer<
  typeof siweVerifyAuthenticatedSchema
>

export type SiweVerifyRegistrationRequired = z.infer<
  typeof siweVerifyRegistrationRequiredSchema
>

/** Returned by refresh and position-select endpoints. */
export type UserAuthResponse = z.infer<typeof userAuthResponseSchema>

export type RequestSiweNonceInput = z.infer<typeof requestSiweNonceInputSchema>

export type SiweNonceResponse = z.infer<typeof siweNonceResponseSchema>

export type VerifySiweInput = z.infer<typeof verifySiweInputSchema>
