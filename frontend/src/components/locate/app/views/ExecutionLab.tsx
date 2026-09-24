"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_2022 } from "@locate/sdk";
import { evaluateDexQuote, OPENAI_MAINNET_MINT } from "@locate/sdk";
import { ViewHead } from "../parts";
import { OPENAI_MINT, USDC_MINT } from "@/lib/locate/mainnetDex";
import { resolveSign } from "@/lib/locate/tx";
import { VersionedTransaction } from "@solana/web3.js";

type Phase = "READY" | "SIMULATING" | "WAITING FOR WALLET" | "SUBMITTED" | "CONFIRMING" | "VERIFIED";
type Balances = {
  solLamports: string;
  openaiRaw: string;
  usdcRaw: string;
  decimals: number;
  epoch: string;
  slot: number;
  feeBps?: number;
  blocker?: string;
};

export function ExecutionLabView() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [phase, setPhase] = useState<Phase>("READY");
  const [error, setError] = useState<string | null>(null);
  const [quoteText, setQuoteText] = useState<string>("");
  const [signature, setSignature] = useState<string | null>(null);
  const phaseRef = useRef<Phase>("READY");
  phaseRef.current = phase;

  const load = useCallback(async () => {
    if (!publicKey) {
      setBalances(null);
      return;
    }
    const response = await fetch("/api/dex/balances?wallet=" + publicKey.toBase58(), { cache: "no-store" });
    const body = await response.json() as Balances & { error?: { message?: string } };
    if (!response.ok) {
      if (phaseRef.current === "READY") setError(body.error?.message ?? "Live Mainnet balance read failed.");
      return;
    }
    const sol = BigInt(body.solLamports);
    const openai = BigInt(body.openaiRaw);
    let blocker: string | undefined;
    if (sol === 0n || openai === 0n) {
      blocker = "MAINNET DEX EXECUTION BLOCKED reason: connected wallet has no Mainnet SOL or OpenAI balance. Switch Phantom to the funded Mainnet account, then reload.";
    }
    setBalances({ ...body, blocker });
  }, [publicKey]);

  useEffect(() => {
    load().catch(() => undefined);
    const timer = setInterval(() => {
      if (phaseRef.current === "READY" || phaseRef.current === "VERIFIED") load().catch(() => undefined);
    }, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const run = async (side: "sell" | "buyback") => {
    if (!publicKey) {
      setError("Connect Phantom.");
      return;
    }
    setError(null);
    setPhase("SIMULATING");
    try {
      const live = await fetch("/api/dex/balances?wallet=" + publicKey.toBase58(), { cache: "no-store" });
      const bal = await live.json() as Balances;
      const openaiRaw = BigInt(bal.openaiRaw);
      const usdcRaw = BigInt(bal.usdcRaw);
      type QuoteBody = {
        fetchedAt: number;
        quote: { inAmount: string; outAmount: string; otherAmountThreshold?: string; inputMint: string; outputMint: string; routePlan?: Array<{ swapInfo?: { label?: string } }> };
        error?: { message?: string };
      };
      let quoteBody: QuoteBody | null = null;
      if (side === "sell") {
        if (openaiRaw === 0n) {
          setPhase("READY");
          setError("MAINNET DEX EXECUTION BLOCKED reason: minimum executable amount > available balance");
          return;
        }
        for (const candidate of [1_000n, 10_000n, 100_000n, 1_000_000n, openaiRaw]) {
          if (candidate > openaiRaw) continue;
          const quoted = await fetch("/api/dex/quote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ wallet: publicKey.toBase58(), side, amountRaw: candidate.toString(), slippageBps: 100 }),
          });
          const row = await quoted.json() as QuoteBody;
          if (quoted.ok) {
            quoteBody = row;
            break;
          }
        }
        if (!quoteBody) {
          setPhase("READY");
          setError("MAINNET DEX EXECUTION BLOCKED reason: minimum executable amount > available balance");
          return;
        }
      } else {
        if (usdcRaw === 0n) {
          setPhase("READY");
          setError("MAINNET DEX EXECUTION BLOCKED reason: wallet has no Mainnet USDC. Not funded automatically.");
          return;
        }
        const required = 1000n;
        const exactOut = await fetch("/api/dex/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ wallet: publicKey.toBase58(), side, amountRaw: required.toString(), slippageBps: 100, swapMode: "ExactOut" }),
        });
        const exactOutBody = await exactOut.json() as QuoteBody;
        if (exactOut.ok && exactOutBody.quote && BigInt(exactOutBody.quote.outAmount) >= required) {
          quoteBody = exactOutBody;
        } else {
          const exactIn = await fetch("/api/dex/quote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ wallet: publicKey.toBase58(), side, amountRaw: usdcRaw.toString(), slippageBps: 100, swapMode: "ExactIn" }),
          });
          const exactInBody = await exactIn.json() as QuoteBody;
          if (!exactIn.ok || !exactInBody.quote || BigInt(exactInBody.quote.outAmount) < required) {
            setPhase("READY");
            setQuoteText(
              "network mainnet · buyback ExactOut 1000 failed · ExactIn USDC "
              + usdcRaw.toString()
              + " → OpenAI "
              + (exactInBody.quote?.outAmount ?? "0")
              + " (below 1000)",
            );
            setError(
              "MAINNET DEX EXECUTION BLOCKED reason: ExactOut for 1000 raw OpenAI has no sufficient route. Spending the entire USDC balance ExactIn quotes "
              + (exactInBody.quote?.outAmount ?? "0")
              + " raw OpenAI, below 1000. Wallet was not funded automatically.",
            );
            return;
          }
          quoteBody = exactInBody;
        }
      }
      if (!quoteBody) {
        setPhase("READY");
        setError("Quote missing.");
        return;
      }
      const routeLabels = (quoteBody.quote.routePlan ?? []).map((hop) => hop.swapInfo?.label ?? "");
      const gate = evaluateDexQuote({
        now: Date.now(),
        wallet: publicKey.toBase58(),
        expectedWallet: publicKey.toBase58(),
        side,
        quote: {
          inputMint: quoteBody.quote.inputMint,
          outputMint: quoteBody.quote.outputMint,
          inAmount: BigInt(quoteBody.quote.inAmount),
          outAmount: BigInt(quoteBody.quote.outAmount),
          otherAmountThreshold: BigInt(quoteBody.quote.otherAmountThreshold ?? quoteBody.quote.outAmount),
          slippageBps: 100,
          fetchedAt: Date.now(),
          routeLabels,
          swapMode: side === "buyback" && quoteBody.quote.inAmount === usdcRaw.toString() ? "ExactIn" : side === "buyback" ? "ExactOut" : "ExactIn",
        },
        mint: OPENAI_MAINNET_MINT,
        tokenProgram: TOKEN_2022.toBase58(),
        decimals: 9,
        feeBps: 100,
        expectedFeeBps: 100,
        balances: {
          solLamports: BigInt(bal.solLamports),
          openaiRaw,
          usdcRaw,
        },
        minOut: side === "buyback" ? 1000n : 1n,
      });
      setQuoteText(
        [
          "network mainnet",
          "mint " + OPENAI_MINT,
          "amount " + quoteBody.quote.inAmount,
          "out " + quoteBody.quote.outAmount,
          "min " + (quoteBody.quote.otherAmountThreshold ?? quoteBody.quote.outAmount),
          "route " + routeLabels.join(" > "),
          "transfer fee 100 bps",
        ].join(" · "),
      );
      if (!gate.ok) {
        setPhase("READY");
        setError(gate.code);
        return;
      }
      const swap = await fetch("/api/dex/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58(), quoteResponse: quoteBody.quote }),
      });
      const swapBody = await swap.json() as { txBase64?: string; error?: { message?: string } };
      if (!swap.ok || !swapBody.txBase64) {
        setPhase("READY");
        setError(swapBody.error?.message ?? "Transaction build failed.");
        return;
      }
      const compiled = VersionedTransaction.deserialize(Buffer.from(swapBody.txBase64, "base64"));
      const sign = resolveSign(typeof signTransaction === "function" ? (tx) => signTransaction(tx) : undefined);
      if (!sign) {
        setPhase("READY");
        setError("Phantom did not expose a signer.");
        return;
      }
      setPhase("WAITING FOR WALLET");
      const signed = await sign(compiled);
      setPhase("SUBMITTED");
      const sent = await fetch("/api/dex/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedTx: Buffer.from(signed.serialize()).toString("base64") }),
      });
      const sentBody = await sent.json() as { signature?: string; verified?: boolean; error?: { message?: string }; err?: unknown };
      if (!sent.ok || !sentBody.signature) {
        setPhase("READY");
        setError(sentBody.error?.message ?? "Mainnet send failed.");
        return;
      }
      setSignature(sentBody.signature);
      setPhase("CONFIRMING");
      if (!sentBody.verified) {
        setPhase("READY");
        setError("Receipt verification failed. " + sentBody.signature);
        return;
      }
      const after = await fetch("/api/dex/balances?wallet=" + publicKey.toBase58(), { cache: "no-store" });
      const afterBody = await after.json() as Balances;
      setBalances(afterBody);
      setPhase("VERIFIED");
    } catch (thrown) {
      const message = thrown instanceof Error ? thrown.message : "DEX path failed.";
      if (/reject/i.test(message)) setError("Signing was rejected.");
      else setError(message);
      setPhase("READY");
    }
  };

  return (
    <div>
      <ViewHead
        label="EXTERNAL MAINNET DEX"
        title="Real Mainnet execution."
        serif="Not a LOCATE contract."
      />
      <p className="mb-6 max-w-2xl font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        External Mainnet DEX execution. LOCATE protocol remains deployed on Devnet and exercised against cloned Mainnet state.
      </p>
      <div className="lc-card p-6">
        <p className="lc-label">MAINNET EXECUTION</p>
        <dl className="mt-4 space-y-2 font-mono text-[12px] text-ink">
          <div className="flex justify-between gap-4"><dt className="text-ink-3">Asset</dt><dd>OpenAI PreStock</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">Network</dt><dd>Solana Mainnet</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">Wallet</dt><dd>{connected && publicKey ? publicKey.toBase58() : "not connected"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">SOL</dt><dd>{balances?.solLamports ?? "…"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">OpenAI raw</dt><dd>{balances?.openaiRaw ?? "…"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">USDC raw</dt><dd>{balances?.usdcRaw ?? "…"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">Mint</dt><dd>{OPENAI_MINT}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">USDC</dt><dd>{USDC_MINT}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-3">State</dt><dd>{phase}</dd></div>
        </dl>
        {quoteText && <p className="mt-4 font-mono text-[11px] text-ink-2">{quoteText}</p>}
        {balances?.blocker && <p className="mt-4 font-mono text-[11px] text-ember">{balances.blocker}</p>}
        {error && <p className="mt-4 font-mono text-[11px] text-refuse">{error}</p>}
        {signature && <p className="mt-4 break-all font-mono text-[11px] text-ink-2">signature {signature}</p>}
        <div className="mt-6 flex gap-3">
          <button onClick={() => run("sell")} className="lc-btn lc-btn-ink lc-btn-sm" disabled={phase !== "READY" && phase !== "VERIFIED"}>
            SELL
          </button>
          <button onClick={() => run("buyback")} className="lc-btn lc-btn-lime lc-btn-sm" disabled={phase !== "READY" && phase !== "VERIFIED"}>
            BUY BACK
          </button>
        </div>
      </div>
    </div>
  );
}
