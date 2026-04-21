"use client";

import { useEffect, useState } from "react";

function probeAdblock(): boolean {
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

export function useAdblockDetection() {
  const [adblockDetected, setAdblockDetected] = useState(false);
  const [cleanChecks, setCleanChecks] = useState(0);
  const [checksDone, setChecksDone] = useState(0);

  useEffect(() => {
    const totalChecks = 3;
    const timeoutIds: number[] = [];

    for (let i = 0; i < totalChecks; i += 1) {
      const timeoutId = window.setTimeout(() => {
        const blocked = probeAdblock();
        setChecksDone((prev) => prev + 1);
        if (blocked) {
          setAdblockDetected(true);
          return;
        }
        setCleanChecks((prev) => prev + 1);
      }, i * 700);

      timeoutIds.push(timeoutId);
    }

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return { adblockDetected, cleanChecks, checksDone };
}
