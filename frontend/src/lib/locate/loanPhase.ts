import type { Loan } from "./types";

export type LoanPhase = "ACTIVE" | "RETURN READY" | "MATURITY" | "GRACE" | "CLAIMABLE" | "SETTLED";

export function loanPhase(loan: Loan, now = Date.now()): LoanPhase {
  if (loan.status === "RETURNED" || loan.status === "CLAIMED") return "SETTLED";
  if (loan.status === "CLAIMABLE") return "CLAIMABLE";
  const graceMs = loan.graceHours * 3_600_000;
  if (now >= loan.maturityAt + graceMs) return "CLAIMABLE";
  if (now >= loan.maturityAt) return "GRACE";
  if (loan.direction === "BORROWED") return "RETURN READY";
  return "ACTIVE";
}

export function nextLoanAction(loan: Loan, now = Date.now()): string {
  const phase = loanPhase(loan, now);
  if (phase === "SETTLED") return "Settled";
  if (phase === "CLAIMABLE" && loan.direction === "LENT") return "CLAIM COLLATERAL";
  if (phase === "CLAIMABLE") return "Await lender claim";
  if (loan.direction === "BORROWED") return "RETURN LOAN";
  if (phase === "GRACE") return "Grace running";
  return "Wait for maturity or a return";
}
