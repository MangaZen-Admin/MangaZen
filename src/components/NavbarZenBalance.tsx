"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Gem } from "lucide-react";

type Props = {
  initialCoins: number;
  initialShards: number;
};

export function NavbarZenBalance({ initialCoins, initialShards }: Props) {
  const [coins, setCoins] = useState(initialCoins);
  const [shards, setShards] = useState(initialShards);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/user/balance");
        if (!res.ok) return;
        const data = await res.json() as { zenCoins: number; zenShards: number };
        setCoins(data.zenCoins);
        setShards(data.zenShards);
      } catch {
        // silencioso
      }
    }

    // Actualizar cuando la ventana recupera el foco
    window.addEventListener("focus", fetchBalance);
    return () => window.removeEventListener("focus", fetchBalance);
  }, []);

  return (
    <div className="hidden items-center gap-1.5 text-xs md:flex">
      <Link
        href="/billing"
        className="group inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 text-yellow-700 transition-colors hover:border-yellow-500/70 hover:bg-yellow-500/20 dark:text-yellow-300"
      >
        <Coins className="h-3.5 w-3.5" />
        <span className="tabular-nums font-medium">{coins.toLocaleString()}</span>
        <span className="text-yellow-600/60 transition-colors group-hover:text-yellow-600 dark:text-yellow-400/60 dark:group-hover:text-yellow-300">+</span>
      </Link>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
        <Gem className="h-3.5 w-3.5" />
        <span className="tabular-nums font-medium">{shards.toLocaleString()}</span>
      </span>
    </div>
  );
}
