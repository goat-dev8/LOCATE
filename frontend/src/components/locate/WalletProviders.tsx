"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

const endpoint = process.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const expectedProgram = process.env.VITE_LOCATE_PROGRAM_ID ?? "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
const api = process.env.VITE_API_BASE_URL ?? "https://locate-api-znz1.onrender.com";

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const [block, setBlock] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(api + "/v1/config", { cache: "no-store" });
        if (!res.ok) {
          if (alive) setBlock("API waking up — retrying.");
          return;
        }
        const body = (await res.json()) as { programId?: string; cluster?: string };
        if (body.programId !== expectedProgram) {
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

  if (block && block.startsWith("Configuration error")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <p className="max-w-lg text-center font-mono text-sm uppercase tracking-[0.14em]">{block}</p>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
