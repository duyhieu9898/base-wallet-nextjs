"use client"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n/use-translation"
import { useCounterStore } from "@/stores/use-counter-store"

export function DemoCounter() {
  const { t } = useTranslation()
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)
  const decrement = useCounterStore((state) => state.decrement)
  const reset = useCounterStore((state) => state.reset)

  return (
    <section className="space-y-4 rounded-xl border p-6">
      <p className="text-center text-4xl font-semibold">{count}</p>

      <div className="flex justify-center gap-2">
        <Button type="button" variant="outline" onClick={decrement}>
          {t.common.decrement}
        </Button>

        <Button type="button" variant="secondary" onClick={reset}>
          {t.common.reset}
        </Button>

        <Button type="button" onClick={increment}>
          {t.common.increment}
        </Button>
      </div>
    </section>
  )
}
