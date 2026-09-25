"use client";

import { useState } from "react";
import { MyOffersView } from "./MyOffers";
import { MyLoansView } from "./MyLoans";

export function PositionsView() {
  const [side, setSide] = useState<"lending" | "borrowing">("borrowing");
  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSide("borrowing")}
          className={side === "borrowing" ? "lc-btn lc-btn-lime lc-btn-sm" : "lc-btn lc-btn-ghost lc-btn-sm"}
        >
          Borrowing
        </button>
        <button
          onClick={() => setSide("lending")}
          className={side === "lending" ? "lc-btn lc-btn-lime lc-btn-sm" : "lc-btn lc-btn-ghost lc-btn-sm"}
        >
          Lending
        </button>
      </div>
      {side === "borrowing" ? <MyLoansView /> : <MyOffersView />}
    </div>
  );
}
