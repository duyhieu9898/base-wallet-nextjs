import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { api } from "@/lib/api"
import { server } from "@/mocks/server"

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

describe("api fetch wrapper", () => {
  it("parses a JSON response", async () => {
    server.use(
      http.get(`${baseUrl}/test/json`, () =>
        HttpResponse.json({ hello: "world" }),
      ),
    )

    const data = await api.get<{ hello: string }>("/test/json")

    expect(data).toEqual({ hello: "world" })
  })

  it("serializes a JSON body on POST", async () => {
    server.use(
      http.post(`${baseUrl}/test/echo`, async ({ request }) => {
        const body = await request.json()

        return HttpResponse.json({ received: body })
      }),
    )

    const data = await api.post<{ received: { a: number } }>("/test/echo", {
      a: 1,
    })

    expect(data).toEqual({ received: { a: 1 } })
  })

  it("throws ApiError when the response is not ok", async () => {
    server.use(
      http.get(`${baseUrl}/test/error`, () =>
        HttpResponse.json(
          { code: "SOMETHING_WENT_WRONG", message: "boom" },
          { status: 500 },
        ),
      ),
    )

    await expect(api.get("/test/error")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      code: "SOMETHING_WENT_WRONG",
      message: "boom",
    })
  })

  it("does not send a body on GET requests even when body is provided", async () => {
    let requestBody: unknown = "sentinel"

    server.use(
      http.get(`${baseUrl}/test/no-body`, async ({ request }) => {
        requestBody = request.body

        return HttpResponse.json({ ok: true })
      }),
    )

    await api.get<{ ok: boolean }>("/test/no-body", { body: { ignored: true } })

    expect(requestBody).toBeNull()
  })
})
