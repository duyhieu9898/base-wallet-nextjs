import {
  Coins,
  History,
  Layers,
  LayoutDashboard,
  Network,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Vault,
  Wallet,
  Wrench,
} from "lucide-react"

import { type SidebarData } from "../types"

/**
 * N+ admin navigation.
 *
 * Derived from the admin screens in the product source map (C0xxxx) and the
 * admin feature groups in FEATURE_MODULE_CONTRACT.md §4: pool configuration,
 * reward configuration, member and rank management, treasury and operator
 * actions, maintenance.
 */
export const sidebarData: SidebarData = {
  user: {
    name: "Operator",
    email: "operator@n-plus.local",
    avatar: "/avatars/operator.svg",
  },
  teams: [
    {
      name: "N+ System",
      logo: Network,
      plan: "Admin console",
    },
  ],
  navGroups: [
    {
      title: "Overview",
      items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
    },
    {
      title: "Protocol",
      items: [
        { title: "Lending pools", url: "/lending", icon: Vault },
        { title: "Staking pools", url: "/staking", icon: Coins },
        { title: "Rewards", url: "/rewards", icon: ShieldCheck },
        { title: "Transaction history", url: "/history", icon: History },
      ],
    },
    {
      title: "Organisation",
      items: [
        { title: "Members", url: "/members", icon: Users },
        { title: "Wallets", url: "/wallets", icon: Wallet },
        { title: "Positions", url: "/positions", icon: Layers },
        { title: "Rank & tree", url: "/ranks", icon: Network },
      ],
    },
    {
      title: "Operations",
      items: [
        { title: "Admins", url: "/admins", icon: UserCheck },
        { title: "Maintenance", url: "/maintenance", icon: Wrench },
        { title: "Settings", url: "/settings", icon: Settings },
      ],
    },
  ],
}
