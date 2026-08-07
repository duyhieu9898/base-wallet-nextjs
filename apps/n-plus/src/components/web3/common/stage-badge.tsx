import { useTranslation } from "@/i18n/use-translation"

export function StageBadge(props: { isTestnet?: boolean }) {
  const { t } = useTranslation()
  const isTestnet = Boolean(props.isTestnet)
  return (
    <span
      className={
        isTestnet
          ? "rounded-sm bg-yellow-500/15 px-2 py-0.5 text-sm text-yellow-700 dark:text-yellow-400"
          : "rounded-sm bg-red-500/15 px-2 py-0.5 text-sm text-red-700 dark:text-red-400"
      }
    >
      {isTestnet ? t.common.testnet : t.common.mainnet}
    </span>
  )
}
