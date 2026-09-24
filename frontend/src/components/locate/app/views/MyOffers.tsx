"use client";

/**
 * LOCATE — MyOffers: your listings + cancel flow.
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useLocate } from "@/lib/locate/store";
import { ASSETS, fmtUsd, fmtToken } from "@/lib/locate/seed";
import type { Offer } from "@/lib/locate/types";
import { AssetLogo } from "../../landing/parts";
import { DataRow, DoneState, EmptyState, Segmented, StatusChip, ViewHead } from "../parts";
import { FadeContent } from "@/components/bits";

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
        label="YOUR LISTINGS"
        title="My offers."
        serif="Your supply."
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
                      {o.termDays} DAY TERM
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

      <CancelOfferDrawer offer={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}

function CancelOfferDrawer({
  offer,
  onClose,
}: {
  offer: Offer | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-line bg-background p-0 sm:max-w-md"
      >
        {offer && <CancelOfferInner key={offer.id} offer={offer} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function CancelOfferInner({
  offer,
  onClose,
}: {
  offer: Offer;
  onClose: () => void;
}) {
  const cancelOffer = useLocate((s) => s.cancelOffer);
  const [stage, setStage] = useState<"review" | "done">("review");
  const [error, setError] = useState<string | null>(null);

  const asset = ASSETS.find((a) => a.id === offer.assetId)!;

  const confirm = () => {
    const res = cancelOffer(offer.id);
    if (res.ok) setStage("done");
    else setError(res.error ?? "Cancel failed.");
  };

  return (
    <>
        <SheetHeader className="space-y-1 border-b border-line px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
            <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-ember" aria-hidden />
            CANCEL OFFER
          </SheetTitle>
          <SheetDescription className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            {offer.id} · {asset.symbol}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5">
          {stage === "review" && (
            <>
              <DataRow label="AMOUNT LISTED" value={`${fmtToken(offer.amount)} ${asset.symbol}`} />
              <DataRow label="COLLATERAL REQUIRED" value={fmtUsd(offer.collateralUsdc)} />
              <DataRow label="UPFRONT FEE" value={fmtUsd(offer.feeUsdc)} />

              <p className="mt-4 rounded-xl border border-lime/25 bg-lime-soft px-4 py-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-lime-deep">
                YOUR TOKENS NEVER LEFT YOUR WALLET — NOTHING TO RECOVER.
              </p>

              {error && (
                <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-refuse">
                  {error}
                </p>
              )}

              <button onClick={confirm} className="lc-btn lc-btn-ink mt-5 w-full">
                CONFIRM — CANCEL LISTING
              </button>
            </>
          )}

          {stage === "done" && (
            <DoneState
              title="OFFER CANCELLED"
              body="The listing is off the book. Your PreStocks stay exactly where they were."
            >
              <button onClick={onClose} className="lc-btn lc-btn-ghost lc-btn-sm">
                CLOSE
              </button>
            </DoneState>
          )}
        </div>
    </>
  );
}
