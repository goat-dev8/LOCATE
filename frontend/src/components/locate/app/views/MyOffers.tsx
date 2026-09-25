"use client";

/**
 * LOCATE — MyOffers: your listings + cancel flow.
 */

import { useState } from "react";
import { useLocate } from "@/lib/locate/store";
import { ASSETS, fmtUsd, fmtToken, formatDuration } from "@/lib/locate/seed";
import type { Offer } from "@/lib/locate/types";
import { AssetLogo } from "../../landing/parts";
import { EmptyState, Segmented, StatusChip, ViewHead } from "../parts";
import { FadeContent } from "@/components/bits";
import { CancelOfferDrawer } from "../drawers/CancelOfferDrawer";

export function MyOffersView() {
  const { offers, loans, navigate } = useLocate();
  const [filter, setFilter] = useState("ALL");
  const [cancelling, setCancelling] = useState<Offer | null>(null);

  const mine = offers.filter(
    (o) => o.isYours && (filter === "ALL" || o.status === filter),
  );

  return (
    <div>
      <ViewHead
        label="WHAT AM I LENDING"
        title="What am I lending?"
        serif="Your offers."
        actions={
          <button onClick={() => navigate("create")} className="lc-btn lc-btn-lime lc-btn-sm">
            NEW OFFER
          </button>
        }
      />

      <FadeContent distance={16}>
        <div className="mb-6">
          <Segmented
            options={["ALL", "ACTIVE", "TAKEN", "SETTLED", "CANCELLED"]}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter offers"
          />
        </div>
      </FadeContent>

      {mine.length === 0 ? (
        <EmptyState
          title="NO OFFERS HERE"
          body="List your idle PreStocks and earn an upfront fee when a borrower takes them."
          action={
            <button onClick={() => navigate("create")} className="lc-btn lc-btn-ink lc-btn-sm">
              CREATE YOUR FIRST OFFER
            </button>
          }
        />
      ) : (
        <FadeContent distance={18}>
          <div className="lc-card overflow-hidden">
            <div className="hidden grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.9fr_auto] gap-4 border-b border-line px-6 py-3.5 lg:grid">
              {["OFFER", "ASSET / AMOUNT", "COLLATERAL", "FEE", "STATUS", ""].map((h) => (
                <span key={h} className="lc-label">
                  {h}
                </span>
              ))}
            </div>
            {mine.map((o) => {
              const asset = ASSETS.find((a) => a.id === o.assetId)!;
              const loan = loans.find((l) => l.offerId === o.id);
              return (
                <div
                  key={o.id}
                  className="grid gap-3 border-b border-line/60 px-6 py-4 last:border-b-0 lg:grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.9fr_auto] lg:items-center lg:gap-4"
                >
                  <div>
                    <p className="font-mono text-[12px] font-semibold text-white">{o.id}</p>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
                      {formatDuration(Number(o.termSecs ?? o.termDays * 86_400))} TERM
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <AssetLogo asset={asset} size={30} className="rounded-lg" />
                    <p className="font-mono text-[12.5px] tabular-nums text-ink-2">
                      {asset.symbol} · {fmtToken(o.amount)}
                    </p>
                  </div>
                  <p className="font-mono text-[12px] tabular-nums text-ink-2">
                    {fmtUsd(o.collateralUsdc)}
                  </p>
                  <p className="font-mono text-[12px] tabular-nums text-lime-deep">
                    {fmtUsd(o.feeUsdc)}
                  </p>
                  <div className="flex items-center">
                    <StatusChip status={o.status} />
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
                      {o.status === "ACTIVE" ? "Next: cancel, or wait for a take" : o.status === "TAKEN" ? "Next: open the loan" : o.status}
                    </p>
                    {o.status === "ACTIVE" && (
                      <button
                        onClick={() => setCancelling(o)}
                        className="lc-btn lc-btn-ghost lc-btn-sm !h-8 !px-3.5 !text-[11px]"
                      >
                        CANCEL
                      </button>
                    )}
                    {o.status === "TAKEN" && loan && (
                      <button
                        onClick={() => navigate("loan", loan.id)}
                        className="lc-btn lc-btn-ghost lc-btn-sm !h-8 !px-3.5 !text-[11px]"
                      >
                        OPEN LOAN
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </FadeContent>
      )}

      <CancelOfferDrawer
        offerId={cancelling?.id ?? null}
        open={!!cancelling}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
      />
    </div>
  );
}
