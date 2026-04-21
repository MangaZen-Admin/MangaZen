"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export type AdminChapterEaRow = {
  id: string;
  number: number;
  status: string;
  mangaTitle: string;
  isEarlyAccess: boolean;
  earlyAccessUntil: string | null;
  earlyAccessPrice: number | null;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminChaptersEarlyAccessPanel({ initialChapters }: { initialChapters: AdminChapterEaRow[] }) {
  const t = useTranslations("earlyAccess.admin");
  const [rows, setRows] = useState(initialChapters);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      {message && <p className="mt-2 text-sm text-primary">{message}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="pb-2 pr-3">{t("colManga")}</th>
              <th className="pb-2 pr-3">{t("colChapter")}</th>
              <th className="pb-2 pr-3">{t("colStatus")}</th>
              <th className="pb-2 pr-3">{t("colEa")}</th>
              <th className="pb-2 pr-3">{t("colUntil")}</th>
              <th className="pb-2 pr-3">{t("colPrice")}</th>
              <th className="pb-2">{t("colAction")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AdminChapterEaRowEditor
                key={`${row.id}-${row.isEarlyAccess}-${row.earlyAccessUntil}-${row.earlyAccessPrice ?? "x"}`}
                row={row}
                disabled={savingId != null}
                saving={savingId === row.id}
                onPatch={async (next) => {
                  setSavingId(row.id);
                  setMessage(null);
                  try {
                    const res = await fetch(`/api/admin/chapters/${encodeURIComponent(row.id)}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        isEarlyAccess: next.isEarlyAccess,
                        earlyAccessUntil: next.isEarlyAccess ? next.earlyAccessUntilIso : null,
                        earlyAccessPrice: next.isEarlyAccess ? next.earlyAccessPrice : null,
                      }),
                    });
                    if (!res.ok) {
                      setMessage(t("saveError"));
                      return;
                    }
                    const data = (await res.json()) as {
                      chapter?: {
                        isEarlyAccess: boolean;
                        earlyAccessUntil: string | null;
                        earlyAccessPrice: number | null;
                      };
                    };
                    const ch = data.chapter;
                    if (ch) {
                      setRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? {
                                ...r,
                                isEarlyAccess: ch.isEarlyAccess,
                                earlyAccessUntil: ch.earlyAccessUntil,
                                earlyAccessPrice: ch.earlyAccessPrice,
                              }
                            : r,
                        ),
                      );
                    }
                    setMessage(t("saved"));
                  } finally {
                    setSavingId(null);
                  }
                }}
              />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </div>
    </section>
  );
}

function AdminChapterEaRowEditor({
  row,
  disabled,
  saving,
  onPatch,
}: {
  row: AdminChapterEaRow;
  disabled: boolean;
  saving: boolean;
  onPatch: (next: {
    isEarlyAccess: boolean;
    earlyAccessUntilIso: string | null;
    earlyAccessPrice: number | null;
  }) => Promise<void>;
}) {
  const t = useTranslations("earlyAccess.admin");
  const [ea, setEa] = useState(row.isEarlyAccess);
  const [untilLocal, setUntilLocal] = useState(() => toDatetimeLocalValue(row.earlyAccessUntil));
  const [priceStr, setPriceStr] = useState(
    row.earlyAccessPrice != null ? String(row.earlyAccessPrice) : "50",
  );

  return (
    <tr className="border-b border-border/80 align-top">
      <td className="py-3 pr-3 font-medium">{row.mangaTitle}</td>
      <td className="py-3 pr-3 tabular-nums">{row.number}</td>
      <td className="py-3 pr-3 text-xs text-muted-foreground">{row.status}</td>
      <td className="py-3 pr-3">
        <input
          type="checkbox"
          checked={ea}
          onChange={(e) => setEa(e.target.checked)}
          disabled={disabled}
          aria-label={t("colEa")}
        />
      </td>
      <td className="py-3 pr-3">
        <input
          type="datetime-local"
          value={untilLocal}
          onChange={(e) => setUntilLocal(e.target.value)}
          disabled={disabled || !ea}
          className="w-full min-w-[10rem] rounded border border-border bg-background px-2 py-1 text-xs"
        />
      </td>
      <td className="py-3 pr-3">
        <input
          type="number"
          min={10}
          max={500}
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          disabled={disabled || !ea}
          className="w-20 rounded border border-border bg-background px-2 py-1 text-xs tabular-nums"
        />
      </td>
      <td className="py-3">
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => {
            const price = Number(priceStr);
            const untilIso =
              untilLocal.trim() === "" ? null : new Date(untilLocal).toISOString();
            void onPatch({
              isEarlyAccess: ea,
              earlyAccessUntilIso: ea ? untilIso : null,
              earlyAccessPrice: ea ? (Number.isFinite(price) ? Math.round(price) : 50) : null,
            });
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {t("save")}
        </button>
      </td>
    </tr>
  );
}
