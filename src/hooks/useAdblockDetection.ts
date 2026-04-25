"use client";
import { useEffect, useState } from "react";

function probeAdblockDOM(): boolean {
  const bait = document.createElement("div");
  bait.className = "adsbox ad banner-ad ad-container";
  bait.style.position = "absolute";
  bait.style.left = "-9999px";
  bait.style.height = "10px";
  bait.style.width = "10px";
  bait.style.pointerEvents = "none";
  document.body.appendChild(bait);
  const blocked =
    bait.offsetHeight === 0 ||
    bait.clientHeight === 0 ||
    getComputedStyle(bait).display === "none" ||
    getComputedStyle(bait).visibility === "hidden";
  document.body.removeChild(bait);
  return blocked;
}

async function probeAdblockNetwork(): Promise<boolean> {
  try {
    const res = await fetch(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
      {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
      }
    );
    // Si llegamos aquí sin error, probablemente no hay adblock
    // En modo no-cors, res.type === "opaque" significa que la request llegó
    void res;
    return false;
  } catch {
    // Si falla, probablemente hay adblock bloqueando la request
    return true;
  }
}

export function useAdblockDetection() {
  const [adblockDetected, setAdblockDetected] = useState(false);
  const [cleanChecks, setCleanChecks] = useState(0);
  const [checksDone, setChecksDone] = useState(0);

  useEffect(() => {
    const totalChecks = 3;
    const timeoutIds: number[] = [];
    let domDetected = false;
    let networkDetected = false;

    // Método 1: DOM bait (3 checks escalonados)
    for (let i = 0; i < totalChecks; i += 1) {
      const timeoutId = window.setTimeout(() => {
        const blocked = probeAdblockDOM();
        setChecksDone((prev) => prev + 1);
        if (blocked) {
          domDetected = true;
          setAdblockDetected(true);
          return;
        }
        if (!domDetected && !networkDetected) {
          setCleanChecks((prev) => prev + 1);
        }
      }, i * 700);
      timeoutIds.push(timeoutId);
    }

    // Método 2: Network probe (después de los checks DOM)
    const networkTimeoutId = window.setTimeout(() => {
      void probeAdblockNetwork().then((blocked) => {
        networkDetected = blocked;
        if (blocked) {
          setAdblockDetected(true);
        }
      });
    }, totalChecks * 700 + 200);
    timeoutIds.push(networkTimeoutId);

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return { adblockDetected, cleanChecks, checksDone };
}
