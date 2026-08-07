/**
 * Domain entity types for N+ Admin Portal
 */

export type PersonalRank = "Gold" | "Silver" | "Bronze" | "Member"
export type TeamRank = "Diamond Leader" | "Team Captain" | "Member"
export type AccountStatus = "Active" | "Locked" | "Inactive"
export type AdminRole = "superAdmin" | "admin" | "operator"

export type SyncStatus = "Synced" | "Pending" | "Failed"
export type PayoutStatus = "Confirmed" | "Pending" | "Failed"
