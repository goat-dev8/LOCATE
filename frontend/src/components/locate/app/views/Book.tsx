"use client";

/**
 * LOCATE — Book: borrowable PreStocks with filters + take flow.
 */

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { FadeContent } from "@/components/bits";
import { useLocate } from "@/lib/locate/store";
import {
  ASSETS,
  catalogAsset,
  fmtUsd,
  fmtToken,
  formatDuration,
  netFromGross,
} from "@/lib/locate/seed";
import type { Offer } from "@/lib/locate/types";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import { AssetLogo } from "../../landing/parts";
import { EmptyState, Segmented, StatusChip, useCountdown, ViewHead } from "../parts";
import { TakeOfferDrawer } from "../drawers/TakeOfferDrawer";

export function BookView() {
  const offers = useLocate((s) => s.offers);
  const navigate = useLocate((s) => s.navigate);
  const [assetFilter, setAssetFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [taking, setTaking] = useState<Offer | null>(null);

  const market = useLiveMarket();
  const openai = market.bySymbol("OPENAI");
  const live = useMemo(
    () =>
      offers.filter(
        (o) =>
          o.status === "ACTIVE" &&
          (assetFilter === "ALL" || o.assetId === assetFilter) &&
          (termFilter === "ALL" || `${o.termDays}D` === termFilter),
      ),
    [offers, assetFilter, termFilter],
  );

  const totalSupply = live.reduce((a, o) => a + o.amount, 0);
  const price = openai?.tokenPrice != null ? `$${Math.round(openai.tokenPrice).toLocaleString("en-US")}` : "unavailable";
  const mark = openai?.markPrice != null ? `$${Math.round(openai.markPrice).toLocaleString("en-US")}` : "unavailable";
  const move = openai?.premiumPct != null ? `${openai.premiumPct >= 0 ? "+" : ""}${openai.premiumPct.toFixed(1)}%` : "unavailable";
  const catalog = market.byPremium.filter((row) => row.symbol !== "OPENAI");

  return (
    <div>
      <ViewHead
        label="MARKET"
        title="Lend the PreStock."
        serif="Let someone short it."
        actions={
          <span className="flex items-center gap-3">
            <span className="font-mono text-[12px] text-ink-2">
              {live.length === 0 ? "0 borrowable" : `${fmtToken(totalSupply)} borrowable`}
            </span>
            <button type="button" onClick={() => navigate("create")} className="lc-btn lc-btn-lime lc-btn-sm">
              LEND
            </button>
          </span>
        }
      />
      <p className="mb-6 max-w-2xl text-[15px] leading-[1.6] text-ink-2">
        LOCATE turns idle PreStocks into borrowable short supply, secured by USDC collateral and settled by delivery.
      </p>
      <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        Live market → borrowable supply → lend / borrow → short → return → settle
      </p>

      <section className="mb-10">
        <p className="lc-label">Live PreStock</p>
        <div className="mt-4 flex items-end justify-between gap-6">
          <div className="flex items-start gap-4">
            <AssetLogo asset={catalogAsset("OPENAI")} size={52} className="rounded-2xl" />
            <div>
            <p className="font-sans text-[32px] font-semibold tracking-[-0.03em] text-white">OpenAI</p>
            <p className="mt-2 max-w-md text-[15px] leading-[1.5] text-ink-2">
              Mainnet market context. Borrowable supply below is the Devnet replica, not this price.
            </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-sans text-[40px] font-semibold leading-none tabular-nums text-white">{price}</p>
            <p className="mt-2 font-mono text-[13px] text-ink-2">Mark {mark} · {move}</p>
          </div>
        </div>
        {catalog.length > 0 && (
          <ul className="mt-6 divide-y divide-line/70 border-y border-line/70">
            {catalog.map((row) => (
              <li key={row.symbol} className="flex items-center justify-between gap-4 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <AssetLogo asset={catalogAsset(row.symbol)} size={28} className="rounded-lg" />
                  <span className="font-sans text-[14px] text-white">
                  {row.symbol}
                  {row.symbol === "SPACEX" ? <span className="ml-3 font-mono text-[12px] text-ink-3">converts by 12 Mar 2027</span> : null}
                  </span>
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ink-2">
                  {row.tokenPrice != null ? `$${Math.round(row.tokenPrice).toLocaleString("en-US")}` : "unavailable"}
                  <span className="ml-3">
                    {row.premiumPct != null ? `${row.premiumPct >= 0 ? "+" : ""}${row.premiumPct.toFixed(1)}%` : "unavailable"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {market.status !== "live" && catalog.length === 0 && openai?.tokenPrice == null && (
          <p className="mt-4 font-mono text-[13px] text-ink-2">UNAVAILABLE</p>
        )}
      </section>

      <p className="lc-label mb-3">Devnet short supply</p>
      <FadeContent distance={16}>
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <Segmented
            options={["ALL", ...ASSETS.map((a) => a.id)]}
            value={assetFilter}
            onChange={setAssetFilter}
            ariaLabel="Filter by asset"
          />
          <Segmented
            options={["ALL", "7D", "14D", "30D"]}
            value={termFilter}
            onChange={setTermFilter}
            ariaLabel="Filter by term"
          />
        </div>
      </FadeContent>

      {live.length === 0 ? (
        <EmptyState
          title="0 borrowable"
          body="No funded Devnet offer is open. Listing dOPENAI, the Devnet replica, creates supply. This page does not invent it."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {live.map((o, i) => (
            <OfferCard key={o.id} offer={o} delay={i * 0.06} onTake={() => setTaking(o)} />
          ))}
        </div>
      )}

      <TakeOfferDrawer offer={taking} onClose={() => setTaking(null)} />
    </div>
  );
}

function OfferCard({
  offer,
  delay,
  onTake,
}: {
  offer: Offer;
  delay: number;
  onTake: () => void;
}) {
  const asset = ASSETS.find((a) => a.id === offer.assetId)!;
  const net = netFromGross(offer.amount, asset.transferFeeBps);
  const cd = useCountdown(offer.expiryAt);

  return (
    <FadeContent delay={delay} distance={22} duration={0.6}>
      <article className="lc-card lc-card-hover flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <AssetLogo asset={asset} size={44} className="rounded-xl" />
            <div>
              <p className="font-sans text-[15.5px] font-semibold tracking-[-0.01em] text-white">
                dOPENAI · <span className="tabular-nums">{fmtToken(offer.amount)}</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                Devnet replica · lender {offer.lender.slice(0, 4)}…{offer.lender.slice(-4)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusChip status={offer.status} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6">
          {[
            { label: "COLLATERAL", value: fmtUsd(offer.collateralUsdc) },
            { label: "UPFRONT FEE", value: fmtUsd(offer.feeUsdc) },
            { label: "TERM", value: formatDuration(Number(offer.termSecs ?? offer.termDays * 86_400)) },
            { label: "GRACE", value: offer.graceSecs ? formatDuration(Number(offer.graceSecs)) : "on chain" },
            { label: "EXPIRES", value: cd.past ? "EXPIRED" : `IN ${cd.label}` },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-baseline justify-between border-b border-line/70 py-2.5"
            >
              <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                {r.label}
              </span>
              <span className="font-mono text-[12px] tabular-nums text-ink-2">{r.value}</span>
            </div>
          ))}
        </div>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
          YOU RECEIVE {fmtToken(net, 6)} NET · {asset.transferFeeBps / 100}% FEE-AWARE
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            {offer.isYours ? "YOUR LISTING · TOKENS STILL IN YOUR WALLET" : `LOCK AT TAKE ${fmtUsd(offer.collateralUsdc + offer.feeUsdc)}`}
          </p>
          {offer.isYours ? (
            <span className="lc-chip-lime">YOUR LISTING</span>
          ) : (
            <button onClick={onTake} className="lc-btn lc-btn-ink lc-btn-sm group">
              TAKE OFFER
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </button>
          )}
        </div>
      </article>
    </FadeContent>
  );
}
