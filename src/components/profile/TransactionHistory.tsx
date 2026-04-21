"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type TxRow = {
  id: string;
  currency: "COINS" | "SHARDS";
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

export function TransactionHistory({
  transactions,
  txCount,
  locale,
}: {
  transactions: TxRow[];
  txCount: number;
  locale: string;
}) {
  const tCurrency = useTranslations("currency");
  const [filter, setFilter] = useState<"ALL" | "COINS" | "SHARDS">("ALL");

  const filtered =
    filter === "ALL" ? transactions : transactions.filter((tx) => tx.currency === filter);

  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
      <h2 className="text-lg font-semibold text-foreground">{tCurrency("txHistoryTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{tCurrency("txHistorySubtitle")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["ALL", "COINS", "SHARDS"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40"
            }`}
          >
            {tCurrency(`txFilter.${f}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {tCurrency("txShowingCount", { shown: filtered.length, total: txCount })}
        </p>
        {txCount > 50 && (
          <p className="text-xs text-muted-foreground">{tCurrency("txShowingMax")}</p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{tCurrency("txHistoryEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {filtered.map((tx) => (
            <li
              key={tx.id}
              className="grid gap-2 px-3 py-2 text-sm sm:grid-cols-5 sm:items-center"
            >
              <p className="font-medium text-foreground">{tCurrency(`txType.${tx.type}`)}</p>
              <p className="text-muted-foreground">{tx.currency === "COINS" ? "ZC" : "ZS"}</p>
              <p className={tx.amount >= 0 ? "text-emerald-600" : "text-destructive"}>
                {tx.amount >= 0 ? "+" : ""}
                {tx.amount.toLocaleString()}
              </p>
              <p className="text-muted-foreground">
                {tCurrency("txBalanceAfter", { amount: tx.balanceAfter.toLocaleString() })}
              </p>
              <time className="text-xs text-muted-foreground">
                {new Date(tx.createdAt).toLocaleString(locale.replace("_", "-"))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
