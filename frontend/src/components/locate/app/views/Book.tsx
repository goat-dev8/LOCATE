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
  fmtUsd,
  fmtToken,
  netFromGross,
} from "@/lib/locate/seed";
import { useLiveMarket } from "@/lib/locate/useLiveMarket";
import { AssetLogo } from "../../landing/parts";
import { EmptyState, Segmented, StatusChip, useCountdown, ViewHead } from "../parts";
import { TakeOfferDrawer } from "../drawers/TakeOfferDrawer";

export function BookView() {
  const offers = useLocate((s) => s.offers);
  const [assetFilter, setAssetFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [taking, setTaking] = useState<Offer | null>(null);

  const live = useMemo(
    () =>
      offers.filter(
        (o) =>
          o.status === "ACTIVE" &&
          !o.isYours &&
          (assetFilter === "ALL" || o.assetId === assetFilter) &&
          (termFilter === "ALL" || `${o.termDays}D` === termFilter),
      ),
    [offers, assetFilter, termFilter],
  );

  const totalSupply = live.reduce((a, o) => a + o.amount, 0);

  return (
    <div>
      <ViewHead
        label="BORROWABLE PRESTOCKS"
        title="The book."
        serif="Real supply."
        actions={
          <span className="lc-chip-lime">
            {live.length} LIVE · {fmtToken(totalSupply)} UNITS
          </span>
        }
      />

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
          title="No open offers on devnet right now."
          body="No borrowable supply. The book shows funded offers from the chain. It does not invent listings."
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
  const live = useLiveMarket();
  const row = live.bySymbol(offer.assetId);
  const pct = row && row.markPrice > 0 ? row.premiumPct : null;
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
                {asset.symbol} · <span className="tabular-nums">{fmtToken(offer.amount)}</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                LENDER {offer.lender}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusChip status={offer.status} />
            <span className="lc-chip-ember">{pct === null ? "Premium unavailable" : `+${pct.toFixed(1)}%`}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6">
          {[
            { label: "COLLATERAL", value: fmtUsd(offer.collateralUsdc) },
            { label: "UPFRONT FEE", value: fmtUsd(offer.feeUsdc) },
            { label: "TERM", value: `${offer.termDays} DAYS` },
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
          YOU RECEIVE {fmtToken(net)} NET · {asset.transferFeeBps / 100}% FEE-AWARE
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            LOCK AT TAKE {fmtUsd(offer.collateralUsdc + offer.feeUsdc)}
          </p>
          <button onClick={onTake} className="lc-btn lc-btn-ink lc-btn-sm group">
            TAKE OFFER
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>
      </article>
    </FadeContent>
  );
}
