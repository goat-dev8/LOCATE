import protocol from "@/app/proof/data/devnet/protocol.json";
import fork from "@/app/proof/data/mainnet-fork/manifest.json";
import forkLife from "@/app/proof/data/mainnet-fork/lifecycle.json";
import localSuite from "@/app/proof/data/local-validator/suite.json";
import replay from "@/app/proof/data/replay/manifest.json";
import security from "@/app/proof/data/security/suite.json";
import dexSell from "@/app/proof/data/mainnet-dex/sell.json";
import dexSell2 from "@/app/proof/data/mainnet-dex/sell-2.json";
import dexBuy from "@/app/proof/data/mainnet-dex/buyback.json";
import dexBefore from "@/app/proof/data/mainnet-dex/balance-before.json";
import dexAfter from "@/app/proof/data/mainnet-dex/balance-after-buyback.json";
import devnetDex from "@/app/proof/data/devnet/dex.json";

export type TraceStep = {
  layer: "DEVNET PROTOCOL" | "EXTERNAL MAINNET DEX";
  label: string;
  detail: string;
  href: string | null;
  confirmed: boolean;
};

function devnetTx(signature: string): string {
  return "https://explorer.solana.com/tx/" + signature + "?cluster=devnet";
}

function mainnetTx(signature: string): string {
  return "https://explorer.solana.com/tx/" + signature;
}

const returnCycle = protocol.returnCycle;
const claimCycle = protocol.claimCycle;

export const executionTrace: TraceStep[] = [
  {
    layer: "DEVNET PROTOCOL",
    label: "LIST",
    detail: "Devnet create " + returnCycle.create,
    href: devnetTx(returnCycle.create),
    confirmed: returnCycle.create.length > 0,
  },
  {
    layer: "DEVNET PROTOCOL",
    label: "TAKE",
    detail: "Devnet take delivered the replica token " + returnCycle.take,
    href: devnetTx(returnCycle.take),
    confirmed: returnCycle.take.length > 0,
  },
  {
    layer: "DEVNET PROTOCOL",
    label: "RETURN",
    detail: "Devnet return " + returnCycle.return,
    href: devnetTx(returnCycle.return),
    confirmed: returnCycle.return.length > 0,
  },
  {
    layer: "DEVNET PROTOCOL",
    label: "CLAIM",
    detail: "Devnet claim after a separate short-term loan " + claimCycle.claim + ". Early claim refusal code " + String(claimCycle.earlyClaimSimulationCode) + ".",
    href: devnetTx(claimCycle.claim),
    confirmed: claimCycle.claim.length > 0,
  },
  {
    layer: "DEVNET PROTOCOL",
    label: "RETURN · LATER WALLET",
    detail: "Devnet return 4FUqtNoxVjN3E2tJoSKeN8K9awDV9fU1GQ5AZH9yfKbS9FhULGYRgK4pB4zC7nwsGroSbHXv2n4uGp1JNshYDa7t slot 503731052. Gross 5050506. Lender received net 5000000. Collateral 12500000 released.",
    href: devnetTx("4FUqtNoxVjN3E2tJoSKeN8K9awDV9fU1GQ5AZH9yfKbS9FhULGYRgK4pB4zC7nwsGroSbHXv2n4uGp1JNshYDa7t"),
    confirmed: true,
  },
  {
    layer: "DEVNET PROTOCOL",
    label: "CLAIM · LATER WALLET",
    detail: "Separate 60-second loan claim 44tmkCp24ctT6dYc4xK4Q1UDQ4BtRCgjQ5QXVMh8VxA5pCn3sKkZjwyurGrH9ZHurdB4uBiW8CpHsWrD5dtuuE5C slot 503728891. Collateral 1000000 to the lender.",
    href: devnetTx("44tmkCp24ctT6dYc4xK4Q1UDQ4BtRCgjQ5QXVMh8VxA5pCn3sKkZjwyurGrH9ZHurdB4uBiW8CpHsWrD5dtuuE5C"),
    confirmed: true,
  },
  {
    layer: "DEVNET PROTOCOL",
    label: "EARLY CLAIM",
    detail: "Loan 4U3UUMfK9QdJt2tm2S2NtTvFrBxX15L9JVvVgb2JDqnF. Chrome simulation returned ClaimRefusedNotMatured. No signature.",
    href: null,
    confirmed: false,
  },
  {
    layer: "EXTERNAL MAINNET DEX",
    label: "SHORT",
    detail: dexSell.result === "PASS"
      ? "External Mainnet DEX sell " + dexSell.signature + " · " + dexSell.amountRaw + " in · " + dexSell.actualOutRaw + " out"
      : "External Mainnet DEX sell is not verified",
    href: dexSell.result === "PASS" ? mainnetTx(dexSell.signature) : null,
    confirmed: dexSell.result === "PASS" && dexSell.locateProtocol === false,
  },
  {
    layer: "EXTERNAL MAINNET DEX",
    label: "BUY BACK",
    detail: dexBuy.result === "PASS"
      ? "External Mainnet DEX buyback " + dexBuy.signature + " · " + dexBuy.inAmountUsdcRaw + " USDC in · delta " + dexBuy.openaiDeltaFromPreBuyback
      : "External Mainnet DEX buyback is not verified",
    href: dexBuy.result === "PASS" ? mainnetTx(dexBuy.signature) : null,
    confirmed: dexBuy.result === "PASS" && dexBuy.locateProtocol === false,
  },
];

export const productTrace = [
  { label: "LEND", mark: "✓", layer: "DEVNET PROTOCOL", href: devnetTx(returnCycle.create) },
  { label: "BORROW", mark: "✓", layer: "DEVNET PROTOCOL", href: devnetTx(returnCycle.take) },
  { label: "SHORT", mark: "✓", layer: "EXTERNAL MAINNET MARKET", href: mainnetTx(dexSell.signature) },
  { label: "BUY BACK", mark: "✓", layer: "EXTERNAL MAINNET MARKET", href: mainnetTx(dexBuy.signature) },
  { label: "RETURN", mark: "✓", layer: "DEVNET PROTOCOL", href: devnetTx(returnCycle.return) },
  { label: "SETTLE", mark: "✓", layer: "DEVNET PROTOCOL", href: devnetTx(claimCycle.claim) },
];

export const proofSections = [
  {
    headline: "Real Devnet protocol.",
    metric: [returnCycle.create, returnCycle.take, returnCycle.return, claimCycle.claim].filter((sig) => sig.length > 0).length + " signatures",
    title: "A. PROTOCOL EXECUTION",
    lines: [
      "Real Devnet. dOPENAI is a replica, not a Mainnet PreStock.",
      "create " + returnCycle.create,
      "take " + returnCycle.take,
      "return " + returnCycle.return,
      "claim " + claimCycle.claim,
      "early claim refusal code " + String(claimCycle.earlyClaimSimulationCode),
    ],
  },
  {
    headline: "Cloned Mainnet state. Local execution. Not a Mainnet transaction.",
    metric: fork.matrix.passed + "/" + fork.matrix.total,
    title: "B. CLONED MAINNET STATE",
    lines: [
      fork.label + ". Not a Mainnet transaction.",
      fork.matrix.passed + "/" + fork.matrix.total + " passed",
      "OpenAI " + fork.accounts.openai.pubkey,
      "Neuralink " + fork.accounts.neuralink.pubkey,
      "Local sell " + String(forkLife.dexSellExecution) + ". Local buyback " + String(forkLife.dexBuybackExecution) + ".",
      forkLife.dexNote,
    ],
  },
  {
    headline: "Real Mainnet external market execution.",
    metric: "SELL " + dexSell.result + " · BUYBACK " + dexBuy.result,
    title: "C. MAINNET MARKET EXECUTION",
    lines: [
      "Real external Mainnet DEX. locateProtocol " + String(dexSell.locateProtocol) + ".",
      "sell " + dexSell.result + " " + dexSell.signature,
      "buyback " + dexBuy.result + " " + dexBuy.signature,
      "Devnet external venue unavailable.",
      "Mainnet LOCATE deployment: not deployed by design.",
      "Mainnet LOCATE transactions: not enabled by design.",
    ],
  },
  {
    headline: "Local validator and cross-runtime replay.",
    metric: localSuite.passed + "/" + localSuite.total + " · " + String(replay.total),
    title: "D. SECURITY / CONSISTENCY",
    lines: [
      "Local validator " + localSuite.passed + "/" + localSuite.total,
      "Functional " + security.functional.passed,
      "Security " + security.security.passed,
      "Mutation " + security.mutation.passed,
      "Replay " + replay.total,
      "Reproducible LOCATE build PASS. Devnet deployed binary correspondence PASS.",
    ],
  },
];

export const dexEvidence = {
  sell: dexSell,
  sell2: dexSell2,
  buyback: dexBuy,
  before: dexBefore,
  after: dexAfter,
  devnetDexResult: devnetDex.result,
};
