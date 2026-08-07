import { http, HttpResponse } from "msw"
import { mockAuthState } from "../data/auth-session"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const registrationHandlers = [
  // Get registration policy terms in force
  http.get(`${baseUrl}/api/registration/policy`, () => {
    return HttpResponse.json({
      isRegistrationEnabled: true,
      maxPositionsPerWallet: 3,
      requiresReferralCode: true,
      requiresIdentityVerification: false,
      acceptedAssets: [
        {
          assetId: "USDT",
          amount: "100.000000000000000000",
        },
      ],
    })
  }),

  // Accept terms and open account (registration step 1)
  http.post(`${baseUrl}/api/registration`, async ({ request }) => {
    if (request.headers.get("x-mock-registration-closed") === "true") {
      return HttpResponse.json(
        {
          error: "registrationClosed",
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      registrationTicket?: string
      acceptTerms?: boolean
    }

    if (!body.registrationTicket || body.acceptTerms !== true) {
      return HttpResponse.json(
        {
          error: "invalidRegistrationTicket",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    const ticketRecord = mockAuthState.registrationTickets.get(
      body.registrationTicket,
    )
    if (ticketRecord) {
      if (ticketRecord.used) {
        return HttpResponse.json(
          {
            error: "ticketAlreadyUsed",
            timestamp: new Date().toISOString(),
          },
          { status: 401 },
        )
      }
      ticketRecord.used = true
    }

    return HttpResponse.json({
      userId: "user-new-001",
      walletAddress:
        ticketRecord?.walletAddress ??
        "0x1234567890abcdef1234567890abcdef12345678",
      termsAcceptedAt: new Date().toISOString(),
    })
  }),

  // Resolve referral code to sponsor position
  http.get(
    `${baseUrl}/api/registration/referral/:referralCode`,
    ({ params, request }) => {
      const authHeader = request.headers.get("Authorization")
      if (
        authHeader === "Bearer invalid" ||
        authHeader === "Bearer expired" ||
        request.headers.get("x-mock-unauthorized") === "true"
      ) {
        return HttpResponse.json(
          {
            error: "unauthorized",
            timestamp: new Date().toISOString(),
          },
          { status: 401 },
        )
      }

      const { referralCode } = params

      if (!referralCode || referralCode === "INVALID") {
        return HttpResponse.json(
          {
            error: "referralCodeNotFound",
            timestamp: new Date().toISOString(),
          },
          { status: 404 },
        )
      }

      return HttpResponse.json({
        positionId: "sponsor-pos-001",
        referralCode: String(referralCode),
      })
    },
  ),

  // Create seats / positions after registration
  http.post(`${baseUrl}/api/registration/positions`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (
      authHeader === "Bearer invalid" ||
      authHeader === "Bearer expired" ||
      request.headers.get("x-mock-unauthorized") === "true"
    ) {
      return HttpResponse.json(
        {
          error: "unauthorized",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    if (request.headers.get("x-mock-registration-closed") === "true") {
      return HttpResponse.json(
        {
          error: "registrationClosed",
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      )
    }

    if (request.headers.get("x-mock-already-registered") === "true") {
      return HttpResponse.json(
        {
          error: "alreadyRegistered",
          timestamp: new Date().toISOString(),
        },
        { status: 409 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      referralCode?: string
      positionCount?: number
    }

    if (!body.referralCode || !body.positionCount) {
      return HttpResponse.json(
        {
          error: "invalidPositionRequest",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (body.referralCode === "INVALID") {
      return HttpResponse.json(
        {
          error: "referralCodeNotFound",
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      )
    }

    if (body.positionCount > 3) {
      return HttpResponse.json(
        {
          error: "exceedsMaxPositionsLimit",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    return HttpResponse.json({
      registrationPaymentId: "pay-001-abc",
      status: "confirmed",
      positionCount: body.positionCount,
      amount: "100.00",
    })
  }),
]
