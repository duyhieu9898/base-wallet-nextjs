import { http, HttpResponse } from "msw"
import { getAddress } from "viem"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

const RANKS = {
  personal: ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as const,
  team: [
    "Member",
    "Team Captain",
    "Regional Leader",
    "Diamond Leader",
    "Crown Ambassador",
  ] as const,
}

const WALLETS = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90f79bf6eB2c4f8080653a214D57053e8A4a5840",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
  "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
]

function makeMembers() {
  const members = []
  const domains = [
    "n-plus.local",
    "mlm-test.io",
    "web3member.dev",
    "nplus-user.xyz",
  ]
  const firstNames = [
    "Alice",
    "Bob",
    "Carol",
    "David",
    "Eve",
    "Frank",
    "Grace",
    "Henry",
    "Iris",
    "Jake",
    "Karen",
    "Leo",
    "Mia",
    "Noah",
    "Olivia",
    "Paul",
    "Quinn",
    "Rose",
    "Sam",
    "Tina",
  ]
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Miller",
    "Davis",
    "Garcia",
    "Wilson",
    "Martinez",
  ]

  for (let i = 1; i <= 50; i++) {
    const personalRankIdx = Math.min(Math.floor((i - 1) / 10), 4)
    const teamRankIdx = Math.min(Math.floor((i - 1) / 12), 4)
    const firstName = firstNames[(i - 1) % firstNames.length]
    const lastName = lastNames[(i - 1) % lastNames.length]
    const domain = domains[(i - 1) % domains.length]
    const walletBase = WALLETS[(i - 1) % WALLETS.length]
    // Vary last 4 chars per member. Re-checksummed through viem: varying the tail
    // invalidates the EIP-55 casing of the base address, and the UI validates the
    // checksum before it will link an address to the explorer.
    const wallet = getAddress(
      (walletBase.slice(0, -4) + i.toString(16).padStart(4, "0")).toLowerCase(),
    )

    const directReferrals = Math.max(0, 20 - i + Math.floor(Math.random() * 5))
    const teamVolume = (
      500000 -
      i * 8500 +
      Math.floor(Math.random() * 5000)
    ).toFixed(2)

    // Spread join dates across 2025-2026
    const baseDate = new Date("2025-06-01T00:00:00Z")
    baseDate.setDate(baseDate.getDate() + (i - 1) * 7)

    members.push({
      id: `mem-${String(i).padStart(3, "0")}`,
      walletAddress: wallet,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
      personalRank: RANKS.personal[personalRankIdx],
      teamRank: RANKS.team[teamRankIdx],
      directReferrals,
      teamVolumeUsdt: Math.max(0, parseFloat(teamVolume)).toFixed(2),
      joinedAt: baseDate.toISOString(),
    })
  }
  return members
}

const mockMembers = makeMembers()

export const adminMembersHandlers = [
  // Admin Members Management List
  http.get(`${baseUrl}/api/admin/members`, () => {
    return HttpResponse.json({
      members: mockMembers,
      total: mockMembers.length,
    })
  }),
]
