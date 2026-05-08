"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

type ReauthDialogProps = {
  open: boolean;
  reauthType: "password" | "email_code" | null;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  busy?: boolean;
};

export function ReauthDialog({ open, reauthType, onClose, onConfirm, busy }: ReauthDialogProps) {
  const t = useTranslations("security");
  const locale = useLocale();
  const [value, setValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Enviar código automáticamente al abrir el dialog en modo email_code
  useEffect(() => {
    if (!open || reauthType !== "email_code") return;
    void sendCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reauthType]);

  async function sendCode() {
    setCodeSending(true);
    setCodeError(null);
    try {
      const res = await fetch("/api/auth/send-security-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        setCodeError(t("reauthCodeSendError"));
      } else {
        setCodeSent(true);
      }
    } catch {
      setCodeError(t("reauthCodeSendError"));
    } finally {
      setCodeSending(false);
    }
  }

  if (!open || !reauthType) return null;

  const title =
    reauthType === "password" ? t("reauthModalTitlePassword") : t("reauthModalTitleEmailCode");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg dark:shadow-2xl">
        <h2 id="reauth-dialog-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("reauthModalHint")}</p>

        {reauthType === "email_code" && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {codeSending && (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("reauthCodeSending")}
              </span>
            )}
            {!codeSending && codeSent && (
              <span>{t("reauthCodeSent")}</span>
            )}
            {!codeSending && codeError && (
              <span className="text-destructive">{codeError}</span>
            )}
            {!codeSending && !codeSent && !codeError && (
              <span>{t("reauthCodeSending")}</span>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="text-sm text-muted-foreground" htmlFor="reauth-field">
            {reauthType === "password" ? t("reauthModalPasswordLabel") : t("reauthModalCodeLabel")}
          </label>
          {reauthType === "password" ? (
            <div className="relative">
              <input
                id="reauth-field"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t("reauthModalPasswordPlaceholder")}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-primary"
                aria-label={showPassword ? t("reauthHidePassword") : t("reauthShowPassword")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <input
              id="reauth-field"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
              placeholder={t("reauthModalCodePlaceholder")}
            />
          )}
        </div>

        {reauthType === "email_code" && !codeSending && (
          <button
            type="button"
            onClick={() => void sendCode()}
            className="mt-2 text-xs text-primary hover:underline disabled:opacity-50"
            disabled={codeSending}
          >
            {t("reauthCodeResend")}
          </button>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {t("reauthModalCancel")}
          </button>
          <button
            type="button"
            disabled={busy || !value.trim()}
            onClick={() => void onConfirm(value)}
            className="rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {t("reauthModalSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
}
