"use client";

import { useState } from "react";
import { Crown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ProPlan } from "@/lib/lemon-squeezy";

const PLAN_META: Record<
  string,
  {
    name: string;
    color: string;
    borderColor: string;
    features: string[];
  }
> = {
  bronze: {
    name: "Bronce",
    color: "from-amber-700 to-amber-500",
    borderColor: "border-amber-600",
    features: ["Sin anuncios"],
  },
  silver: {
    name: "Plata",
    color: "from-slate-400 to-slate-300",
    borderColor: "border-slate-400",
    features: ["Sin anuncios", "Descargas sin limite", "Peticiones sin limite"],
  },
  gold: {
    name: "Oro",
    color: "from-yellow-500 to-amber-400",
    borderColor: "border-yellow-400",
    features: [
      "Sin anuncios",
      "Descargas sin limite",
      "Peticiones sin limite",
      "Avatar y banner premium",
      "400 ZC al mes",
    ],
  },
  platinum: {
    name: "Platino",
    color: "from-violet-500 to-purple-400",
    borderColor: "border-violet-400",
    features: ["Sin anuncios para siempre", "Pago unico", "Compatible con cualquier suscripcion"],
  },
};

type Props = { plans: ProPlan[]; isPro: boolean };

export function ProPlansSection({ plans, isPro }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(plan: ProPlan) {
    setError(null);
    setLoadingPlan(plan.id);
    try {
      const res = await fetch("/api/billing/pro-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? "Error");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setLoadingPlan(null);
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-6 flex items-center gap-2">
        <Crown className="h-5 w-5 text-yellow-400" />
        <h2 className="text-xl font-bold">Suscripcion Pro</h2>
      </div>

      {isPro && (
        <p className="mb-4 text-sm text-muted-foreground">
          Ya tenes un plan activo. Podes cambiar o agregar el plan Platino.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const meta = PLAN_META[plan.id];
          const isLoading = loadingPlan === plan.id;
          const isDisabled = !!loadingPlan;

          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-xl border-2 bg-card p-5 transition-shadow hover:shadow-lg",
                meta.borderColor
              )}
            >
              <div
                className={cn(
                  "mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white",
                  meta.color
                )}
              >
                <Crown className="h-3 w-3" />
                {meta.name}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold">US${plan.price.toFixed(2)}</span>
                <span className="ml-1 text-sm text-muted-foreground">
                  {plan.isLifetime ? "unico" : "/mes"}
                </span>
              </div>

              <ul className="mb-5 flex-1 space-y-2">
                {meta.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={isDisabled}
                className={cn("w-full bg-gradient-to-r text-white", meta.color)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : plan.isLifetime ? (
                  "Comprar ahora"
                ) : (
                  "Suscribirse"
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
