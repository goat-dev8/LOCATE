"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { LOCATE_PROGRAM_ID_TEXT, SOLANA_RPC_URL, locateApi } from "@/lib/locate/env";

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const [block, setBlock] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const body = await locateApi.config();
        if (body.programId !== LOCATE_PROGRAM_ID_TEXT) {
          if (alive) setBlock("Configuration error: the frontend program id does not match the backend.");
          return;
        }
        if (body.cluster && body.cluster !== "devnet") {
          if (alive) setBlock("Configuration error: this app only sends Devnet transactions.");
          return;
        }
        if (alive) setBlock(null);
      } catch {
        if (alive) setBlock("API waking up — retrying.");
      }
    };
    check();
    const timer = setInterval(check, 20_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const connectionConfig = useMemo(
    () => ({ commitment: "confirmed" as const, confirmTransactionInitialTimeout: 90_000 }),
    [],
  );

  if (block && block.startsWith("Configuration error")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <p className="max-w-lg text-center font-mono text-sm uppercase tracking-[0.14em]">{block}</p>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL} config={connectionConfig}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
