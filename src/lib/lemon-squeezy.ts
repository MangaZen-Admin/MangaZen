import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

lemonSqueezySetup({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY ?? "",
  onError: (error) => {
    console.error("[LemonSqueezy]", error);
  },
});

export type ZenPackageId = "starter" | "basic" | "plus" | "pro";

export type ZenPackage = {
  id: ZenPackageId;
  zenCoins: number;
  variantEnvKey: string;
  prices: {
    USD: number;
  };
};

export const ZEN_PACKAGES: ZenPackage[] = [
  {
    id: "starter",
    zenCoins: 1_000,
    variantEnvKey: "LEMON_SQUEEZY_VARIANT_STARTER",
    prices: { USD: 1 },
  },
  {
    id: "basic",
    zenCoins: 5_000,
    variantEnvKey: "LEMON_SQUEEZY_VARIANT_BASIC",
    prices: { USD: 5 },
  },
  {
    id: "plus",
    zenCoins: 12_000,
    variantEnvKey: "LEMON_SQUEEZY_VARIANT_PLUS",
    prices: { USD: 10 },
  },
  {
    id: "pro",
    zenCoins: 25_000,
    variantEnvKey: "LEMON_SQUEEZY_VARIANT_PRO",
    prices: { USD: 20 },
  },
];

export function getVariantId(pkg: ZenPackage): string | null {
  return process.env[pkg.variantEnvKey] ?? null;
}

export async function createZenCheckout({
  variantId,
  userId,
  userEmail,
  packageId,
  successUrl,
  cancelUrl: _cancelUrl,
}: {
  variantId: string;
  userId: string;
  userEmail: string;
  packageId: ZenPackageId;
  successUrl: string;
  cancelUrl: string;
}) {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID ?? "";

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutOptions: {
      embed: false,
      media: true,
      logo: true,
    },
    checkoutData: {
      email: userEmail,
      custom: {
        user_id: userId,
        package_id: packageId,
      },
    },
    productOptions: {
      redirectUrl: successUrl,
      receiptButtonText: "Volver a MangaZen",
      receiptThankYouNote: "¡Gracias por tu compra! Tus Zen Coins fueron acreditados.",
    },
  });

  if (error) throw new Error(error.message);
  return data;
}
