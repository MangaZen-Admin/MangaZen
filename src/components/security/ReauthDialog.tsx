"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

type ReauthDialogProps = {
  open: boolean;
  reauthType: "password" | "email_code" | null;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  busy?: boolean;
};

export function ReauthDialog({ open, reauthType, onClose, onConfirm, busy }: ReauthDialogProps) {
  const t = useTranslations("security");
  const [value, setValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
              placeholder={t("reauthModalCodePlaceholder")}
            />
          )}
        </div>

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
