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

export type ProPlanId = "bronze" | "silver" | "gold" | "platinum";

export type ProPlan = {
  id: ProPlanId;
  variantId: number;
  price: number; // en USD (o pago unico para platinum)
  isLifetime: boolean;
};

export const PRO_PLANS: ProPlan[] = [
  { id: "bronze", variantId: 1591870, price: 0.99, isLifetime: false },
  { id: "silver", variantId: 1591935, price: 3.99, isLifetime: false },
  { id: "gold", variantId: 1591939, price: 8.99, isLifetime: false },
  { id: "platinum", variantId: 1591951, price: 25.0, isLifetime: true },
];

export async function createProCheckout({
  variantId,
  userId,
  userEmail,
  planId,
  successUrl,
  cancelUrl,
}: {
  variantId: number;
  userId: string;
  userEmail: string;
  planId: ProPlanId;
  successUrl: string;
  cancelUrl: string;
}) {
  const storeId = Number(process.env.LEMON_SQUEEZY_STORE_ID ?? "0");

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutOptions: { embed: false, media: true, logo: true },
    checkoutData: {
      email: userEmail,
      custom: { user_id: userId, plan_id: planId, type: "pro_subscription" },
    },
    productOptions: {
      redirectUrl: successUrl,
      receiptButtonText: "Volver a MangaZen",
      receiptThankYouNote: "¡Gracias por apoyar MangaZen!",
    },
  });

  void cancelUrl;

  if (error) throw new Error(error.message);
  return data;
}
