"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Loader2, Coins, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ScanContributor = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
  chapterNumbers: number[];
  isLastUploader: boolean;
};

type Props = {
  contributors: ScanContributor[];
  isAuthenticated: boolean;
  initialZenCoins: number;
  initialZenShards: number;
};

const PRESET_AMOUNTS = [10, 50, 100, 500];

export function MangaDonateButton({
  contributors,
  isAuthenticated,
  initialZenCoins,
  initialZenShards,
}: Props) {
  const t = useTranslations("mangaDonate");
  const [open, setOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanContributor | null>(null);
  const [currency, setCurrency] = useState<"coins" | "shards">("shards");
  const [amount, setAmount] = useState(50);
  const [busy, setBusy] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [zenCoins, setZenCoins] = useState(initialZenCoins);
  const [zenShards, setZenShards] = useState(initialZenShards);

  if (contributors.length === 0) return null;

  const canUseCoins = selectedScan?.role === "CREATOR" || selectedScan?.role === "ADMIN";
  const currentBalance = currency === "coins" ? zenCoins : zenShards;
  const hasEnough = currentBalance >= amount;

  function openModal() {
    if (!isAuthenticated) {
      toast.error(t("loginRequired"));
      return;
    }
    setSelectedScan(contributors.length === 1 ? contributors[0]! : null);
    setCurrency("shards");
    setAmount(50);
    setOpen(true);
  }

  async function handleDonate() {
    if (!selectedScan || !hasEnough) return;
    setBusy(true);
    setReauthError(null);
    try {
      const res = await fetch(`/api/user/${selectedScan.id}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          amount,
          reauth_password: reauthPassword.trim() || undefined,
        }),
      });

      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        reauthType?: string;
        balances?: { zenCoins: number; zenShards: number };
      };

      if (res.status === 403 && data.error === "REAUTH_REQUIRED") {
        setNeedPassword(true);
        setReauthError(t("reauthHint"));
        return;
      }

      if (!res.ok) {
        if (data.error === "INSUFFICIENT_COINS") toast.error(t("insufficientCoins"));
        else if (data.error === "INSUFFICIENT_SHARDS") toast.error(t("insufficientShards"));
        else if (data.error === "COINS_NOT_ALLOWED_FOR_SCAN") toast.error(t("coinsNotAllowed"));
        else toast.error(t("errorDonate"));
        return;
      }

      if (data.balances) {
        setZenCoins(data.balances.zenCoins);
        setZenShards(data.balances.zenShards);
      }

      setOpen(false);
      // Disparar actualización del balance en navbar
      window.dispatchEvent(new Event("focus"));
      setNeedPassword(false);
      setReauthPassword("");

      toast.success(t("successMessage", {
        amount,
        currency: currency === "coins" ? "ZC" : "ZS",
        name: selectedScan.name ?? selectedScan.username ?? t("unknownScan"),
      }));

      // Toast secundario recordando donación directa
      setTimeout(() => {
        toast.info(t("directDonationReminder"), { duration: 6000 });
      }, 1500);
    } finally {
      setBusy(false);
    }
  }

  function formatChapters(numbers: number[]): string {
    const sorted = [...numbers].sort((a, b) => a - b);
    if (sorted.length <= 5) return sorted.map(String).join(", ");
    return `${sorted.slice(0, 5).join(", ")} +${sorted.length - 5}`;
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary/15"
      >
        <Heart className="h-3.5 w-3.5 text-rose-500" />
        {t("button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="text-base font-semibold text-foreground">{t("modalTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("modalSubtitle")}</p>

            {/* Lista de scans */}
            {!selectedScan || contributors.length > 1 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("selectScan")}</p>
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {contributors.map((scan) => (
                    <li key={scan.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScan(scan);
                          if (scan.role === "SCAN") setCurrency("shards");
                        }}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                          selectedScan?.id === scan.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/40"
                        } ${scan.isLastUploader ? "ring-1 ring-primary/40" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                            {scan.image ? (
                              <Image src={scan.image} alt="" fill className="object-cover" unoptimized sizes="28px" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary">
                                {(scan.name ?? scan.username ?? "?").slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium text-foreground">
                                {scan.name ?? scan.username ?? t("unknownScan")}
                              </p>
                              {scan.isLastUploader && (
                                <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {t("lastUploader")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {t("chapters")}: {formatChapters(scan.chapterNumbers)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {scan.chapterNumbers.length} cap.
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Selector de moneda y monto */}
            {selectedScan && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("currencyLabel")}</p>
                  <div className="flex gap-1.5">
                    {canUseCoins && (
                      <button
                        type="button"
                        onClick={() => setCurrency("coins")}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          currency === "coins"
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Coins className="h-3 w-3" />
                        ZC
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrency("shards")}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        currency === "shards"
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      ZS
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("amountLabel")}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(preset)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          amount === preset
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {t("balanceLabel")}:{" "}
                  <span className={hasEnough ? "text-foreground font-medium" : "text-destructive font-medium"}>
                    {currentBalance.toLocaleString()} {currency === "coins" ? "ZC" : "ZS"}
                  </span>
                  {!hasEnough && <span className="ml-2 text-destructive">{t("insufficientBalance")}</span>}
                </div>
              </div>
            )}

            {needPassword && (
              <div className="mt-3">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("reauthLabel")}
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                />
                {reauthError && (
                  <p className="mt-1 text-xs text-destructive">{reauthError}</p>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                {t("cancel")}
              </Button>
              {selectedScan && (
                <Button
                  type="button"
                  onClick={() => void handleDonate()}
                  disabled={busy || !hasEnough || amount < 10}
                >
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Heart className="mr-1.5 h-3.5 w-3.5" />}
                  {t("confirmButton", { amount, currency: currency === "coins" ? "ZC" : "ZS" })}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
