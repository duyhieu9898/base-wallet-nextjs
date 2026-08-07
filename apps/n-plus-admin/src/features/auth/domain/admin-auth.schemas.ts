import { z } from "zod"

export const adminProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["superAdmin", "admin"]),
  twoFactorEnabled: z.boolean(),
})

export const adminAuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  admin: adminProfileSchema,
})

export const adminTwoFactorChallengeSchema = z.object({
  twoFactorRequired: z.literal(true),
  twoFactorToken: z.string().min(1),
})

export const adminLoginResponseSchema = z.union([
  adminAuthResponseSchema,
  adminTwoFactorChallengeSchema,
])

export const adminLoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional(),
})

export const twoFactorVerifyInputSchema = z.object({
  code: z.string().length(6),
  twoFactorToken: z.string().min(1),
})

export type AdminProfile = z.infer<typeof adminProfileSchema>
export type AdminAuthResponse = z.infer<typeof adminAuthResponseSchema>
export type AdminTwoFactorChallenge = z.infer<
  typeof adminTwoFactorChallengeSchema
>
export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>
export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifyInputSchema>
