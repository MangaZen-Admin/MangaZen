const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
  "spam4.me",
  "getairmail.com",
  "filzmail.com",
  "dispostable.com",
  "mailnull.com",
  "maildrop.cc",
  "temp-mail.org",
  "fakeinbox.com",
  "mailnesia.com",
  "getnada.com",
  "tempinbox.com",
  "spambox.us",
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "20minutemail.com",
  "tempemail.net",
  "moakt.co",
  "disbox.net",
  "emailondeck.com",
  "tempmailo.com",
]);

export async function isDisposableEmail(email: string): Promise<boolean> {
  // Primero chequear la lista local (más rápido, sin red)
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Luego consultar disify.com
  try {
    const res = await fetch(`https://disify.com/api/email/${encodeURIComponent(email)}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return false; // Si falla, dejar pasar
    const data = (await res.json()) as { disposable?: boolean };
    return data.disposable === true;
  } catch {
    return false; // Si hay error de red, dejar pasar
  }
}
