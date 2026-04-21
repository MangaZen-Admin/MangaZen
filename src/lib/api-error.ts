/**
 * Resolves a user-facing message from an API JSON body `{ error: string }`
 * using the current next-intl scope (`errors.CODE`).
 */

export type ApiErrorTranslator = {
  (key: string): string;
  has?: (key: string) => boolean;
};

export function resolveApiErrorMessage(
  body: unknown,
  t: ApiErrorTranslator,
  fallbackKey: string,
  /** e.g. `"shell.errors"` for `admin.shell.errors.CODE` when `t` is `useTranslations("admin")`. */
  errorKeyPrefix = "errors"
): string {
  const o = body as { error?: unknown } | null | undefined;
  const code = typeof o?.error === "string" ? o.error.trim() : "";
  if (!code) return t(fallbackKey);
  const key = `${errorKeyPrefix}.${code}`;
  if (t.has?.(key)) return t(key);
  return t(fallbackKey);
}

export async function getApiErrorMessage(
  res: Response,
  t: ApiErrorTranslator,
  fallbackKey: string,
  errorKeyPrefix = "errors"
): Promise<string> {
  try {
    const body = await res.json();
    return resolveApiErrorMessage(body, t, fallbackKey, errorKeyPrefix);
  } catch {
    return t(fallbackKey);
  }
}
