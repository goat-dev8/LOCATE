"use client";

/**
 * LOCATE app shell — dark ink sidebar + workspace surface.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ArrowLeftRight,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { DecryptionText } from "@/components/bits";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { DEVNET_USDC, TOKEN, TOKEN_2022, ata } from "@locate/sdk";
import { formatUnits } from "@/lib/locate/amounts";
import { useLocate, type View } from "@/lib/locate/store";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import { Wordmark } from "../landing/parts";
import { BookView } from "./views/Book";
import { CreateOfferView } from "./views/CreateOffer";
import { LoanDetailView } from "./views/LoanDetail";
import { PositionsView } from "./views/Positions";
import { VerifyView } from "./views/Verify";
import { ExecutionLabView } from "./views/ExecutionLab";
import { cn } from "@/lib/utils";

const NAV: { view: View; label: string; short: string; icon: typeof BookOpen }[] = [
  { view: "book", label: "Market", short: "MARKET", icon: BookOpen },
  { view: "loans", label: "Positions", short: "POSITIONS", icon: ArrowLeftRight },
  { view: "verify", label: "Proof", short: "PROOF", icon: ShieldCheck },
];

const VIEW_TITLES: Record<View, string> = {
  overview: "MARKET",
  book: "MARKET",
  create: "LIST",
  loan: "LOAN",
  offers: "POSITIONS",
  loans: "POSITIONS",
  verify: "PROOF",
  execute: "EXTERNAL MARKET",
};

function EnvPill() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-4">
      <button
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-shell-line px-3 py-1.5 font-mono text-[12px] text-shell-ink"
      >
        Devnet · dOPENAI
      </button>
      {open && (
        <p className="mt-2 text-[13px] leading-relaxed text-shell-ink-2">
          dOPENAI is a Devnet replica with the same Token-2022 extensions as the OpenAI mint. It is not a Mainnet PreStock. LOCATE runs here. Live prices and the external short are Mainnet, and they stay labeled separately.
        </p>
      )}
    </div>
  );
}

function Wallet() {
  const { connection } = useConnection();
  const { publicKey, connected, connecting, wallets, select, connect, disconnect } = useWallet();
  const [usdc, setUsdc] = useState<string | null>(null);
  const [token, setToken] = useState<{ wallet: string; chain: string | null } | null>(null);
  useEffect(() => {
    if (!publicKey) {
      setUsdc(null);
      setToken(null);
      return;
    }
    const mint = new PublicKey("9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P");
    const read = () => {
      connection.getTokenAccountBalance(ata(publicKey, DEVNET_USDC, TOKEN), "confirmed")
        .then((result) => setUsdc(formatUnits(result.value.amount, result.value.decimals, 6)))
        .catch(() => setUsdc("unavailable"));
      connection.getTokenAccountBalance(ata(publicKey, mint, TOKEN_2022), "confirmed")
        .then((result) => {
          const chain = formatUnits(result.value.amount, result.value.decimals, 9);
          const wallet = result.value.uiAmountString ?? chain;
          setToken({ wallet, chain: wallet !== chain ? chain : null });
        })
        .catch(() => setToken({ wallet: "unavailable", chain: null }));
    };
    read();
    const timer = setInterval(read, 15_000);
    return () => clearInterval(timer);
  }, [connection, publicKey]);
  const onConnect = () => {
    const phantom = wallets.find((w) => w.adapter.name === "Phantom") ?? wallets[0];
    if (!phantom) return;
    try {
      select(phantom.adapter.name);
      void connect().catch(() => undefined);
    } catch {
      /* The wallet adapter throws when no account is selected yet. */
    }
  };
  return (
    <div className="rounded-2xl border border-shell-line bg-shell-2 p-4">
      <p className="lc-label-dark mb-3">DEVNET WALLET</p>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-shell-ink-2">
          {connected ? "CONNECTED" : "STATUS"}
        </span>
        {connected ? (
          <button onClick={() => disconnect().catch(() => undefined)} className="font-mono text-[11px] text-white">
            {publicKey?.toBase58().slice(0, 4)}…{publicKey?.toBase58().slice(-4)}
          </button>
        ) : (
          <button onClick={onConnect} className="font-mono text-[11px] uppercase tracking-[0.12em] text-white">
            {connecting ? "Connecting" : wallets.length ? "Connect" : "No wallet"}
          </button>
        )}
      </div>
      <div className="mt-2.5 border-t border-shell-line pt-2.5">
        {connected ? (
          <>
            <div className="flex items-baseline justify-between py-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-shell-ink-2">dOPENAI</span>
              <span className="text-right font-mono text-[11.5px] tabular-nums text-shell-ink">
                {token ? token.wallet : "…"}
                {token?.chain ? <span className="mt-0.5 block text-[10px] text-shell-ink-2">chain {token.chain}</span> : null}
              </span>
            </div>
            <div className="flex items-baseline justify-between py-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-shell-ink-2">USDC</span>
              <span className="font-mono text-[11.5px] tabular-nums text-shell-ink">{usdc ?? "…"}</span>
            </div>
          </>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-shell-ink-2">NO PRESTOCK BALANCES</p>
        )}
      </div>
    </div>
  );
}

function SidebarNav({
  view,
  navigate,
  counts,
}: {
  view: View;
  navigate: (v: View) => void;
  counts: Record<string, number>;
}) {
  return (
    <nav aria-label="Workspace" className="mt-7 flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active =
          view === item.view ||
          (view === "loan" && item.view === "loans") ||
          (view === "offers" && item.view === "loans") ||
          (view === "create" && item.view === "book") ||
          (view === "overview" && item.view === "book");
        return (
          <button
            key={item.view}
            onClick={() => navigate(item.view)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors",
              active ? "bg-shell-2 text-white" : "text-shell-ink-2 hover:bg-shell-2/60 hover:text-shell-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="lc-nav-rail"
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-lime"
                aria-hidden
              />
            )}
            <item.icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
            <span className="flex-1 font-sans text-[13.5px] font-medium tracking-[-0.005em]">
              {item.label}
            </span>
            {counts[item.view] > 0 && (
              <span className="rounded-full border border-shell-line bg-shell-3 px-1.5 py-px font-mono text-[9.5px] font-bold tabular-nums text-shell-ink-2">
                {counts[item.view]}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const { view, navigate, goLanding, offers, loans, activeLoanId } = useLocate();
  const openApp = useLocate((s) => s.openApp);
  const live = useLiveMarket();
  const openai = live.bySymbol("OPENAI");
  const premiumLabel =
    live.status === "loading"
      ? "Resolving live data…"
      : live.status === "waking"
        ? "API waking up — retrying."
        : live.status === "stale" && openai?.tokenPrice
          ? `OPENAI $${Math.round(openai.tokenPrice).toLocaleString("en-US")} · last price`
          : openai?.tokenPrice && openai.markPrice && openai.premiumPct !== null
            ? `OPENAI $${Math.round(openai.tokenPrice).toLocaleString("en-US")} · ${openai.premiumPct >= 0 ? "+" : ""}${openai.premiumPct.toFixed(1)}%`
            : "Market data unavailable.";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const counts: Record<string, number> = {
    book: offers.filter((o) => o.status === "ACTIVE").length,
    offers: offers.filter((o) => o.isYours && o.status === "ACTIVE").length,
    loans: loans.filter((l) => l.status === "ACTIVE").length,
    verify: 0,
    overview: 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-shell-line bg-shell px-5 py-6 lg:flex">
        <button
          onClick={() => {
            openApp();
            navigate("book");
          }}
          className="text-left"
          aria-label="LOCATE workspace home"
        >
          <Wordmark dark />
        </button>
        <EnvPill />

        <SidebarNav view={view} navigate={navigate} counts={counts} />

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Wallet />
          <button
            onClick={goLanding}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-shell-ink-2 transition-colors hover:text-shell-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> BACK TO LANDING
          </button>
        </div>
      </aside>

      {/* main column */}
      <div className="lg:pl-[268px]">
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b border-line bg-[#0A0A0AD9] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="lg:hidden">
                <Wordmark size="sm" />
              </span>
              <span className="hidden font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white lg:inline">
                {VIEW_TITLES[view]}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="lc-chip">{premiumLabel}</span>
              <span className="hidden sm:inline-flex">
                <span className="lc-chip-lime">
                  <DecryptionText text={live.status === "live" ? "LIVE" : live.status === "waking" ? "WAKING" : live.status === "stale" ? "STALE" : "UNAVAILABLE"} speed={60} revealDelay={200} />
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* content */}
        <main className="px-5 py-8 pb-28 sm:px-8 lg:pb-12">
          <div className="lc-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={view + (view === "loan" ? activeLoanId ?? "" : "")}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {(view === "overview" || view === "book") && <BookView />}
                {view === "create" && <CreateOfferView />}
                {view === "loan" && <LoanDetailView />}
                {(view === "offers" || view === "loans") && <PositionsView />}
                {view === "verify" && <VerifyView />}
                {view === "execute" && <ExecutionLabView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* mobile tabbar */}
      <nav
        aria-label="Workspace"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#0A0A0AF2] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-3">
          {NAV.map((item) => {
            const active =
              view === item.view ||
              (view === "loan" && item.view === "loans") ||
              (view === "offers" && item.view === "loans") ||
              (view === "create" && item.view === "book") ||
              (view === "overview" && item.view === "book");
            return (
              <button
                key={item.view}
                onClick={() => navigate(item.view)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  active ? "text-white" : "text-ink-3",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em]">
                  {item.short}
                </span>
                {active && (
                  <motion.span
                    layoutId="lc-tab-rail"
                    className="absolute top-0 h-[2px] w-10 rounded-full bg-lime"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
