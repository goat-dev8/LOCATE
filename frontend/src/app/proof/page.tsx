import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const dataRoot = join(process.cwd(), "src", "app", "proof", "data");

function load<T>(rel: string): T {
  return JSON.parse(readFileSync(join(dataRoot, rel), "utf8")) as T;
}

export default function ProofPage() {
  const fork = load<{
    label: string;
    notAMainnetTransaction: boolean;
    programId: string;
    programSha256: string;
    epochUsedForActiveFee: number;
    matrix: { passed: number; failed: number; total: number };
    balances: string;
    accounts: Record<string, { pubkey: string; slot: number; sha256: string }>;
  }>("mainnet-fork/manifest.json");
  const gate = load<{
    label: string;
    enabled: boolean;
    signed: boolean;
    sent: boolean;
    prerequisitesMissing: string[];
    blocker: string;
  }>("mainnet-execution/gate.json");
  const local = load<{
    label: string;
    passed: number;
    failed: number;
    total: number;
    programSha256: string;
    usdcNote: string;
  }>("local-validator/suite.json");
  const devnet = load<{
    label: string;
    result: string;
    signedTransactions: string[];
    jupiter: { errorCode: string };
    dlmm: { error: string; errorNumber: number };
  }>("devnet/short-loop.json");
  const sell = load<{ result: string; mainnetTransaction: boolean }>("jupiter-roundtrip/sell.json");
  const buy = load<{ result: string; mainnetTransaction: boolean }>("jupiter-roundtrip/buyback.json");
  const replay = load<{ total: number; seed: string; families: Record<string, number> }>("replay/manifest.json");
  const sec = load<{
    label: string;
    functional: { passed: number };
    security: { passed: number };
    mutation: { passed: number };
    backendVitest: { passed: number };
  }>("security/suite.json");
  const source = load<{
    verified: boolean;
    claim: string;
    head: string;
    devnet: { payloadSha256: string; elfRegionSha256: string; matchesLocalMainnetBinary: boolean; matchesLocalDevnetBinary: boolean };
    mainnet: { programAccountExists: boolean };
  }>("verification/source-build.json");
  const token2022 = load<{
    exercised: { extension: string; evidence: string }[];
    notExercised: string[];
  }>("token2022/matrix.json");
  const cycle = load<{
    label: string;
    returnCycle: { create: string; take: string; return: string };
    claimCycle: { create: string; take: string; claim: string; earlyClaimSimulationCode: number };
  }>("devnet/lifecycle.json");
  const life = load<{
    label: string;
    mint: string;
    passed: boolean;
    balances: Record<string, string | number | boolean>;
  }>("mainnet-fork/openai-full-lifecycle.json");
  const forkDex = load<{
    dexSellExecution: boolean;
    dexBuybackExecution: boolean;
    dexNote: string;
  }>("mainnet-fork/lifecycle.json");

  const status = load<{
    mainnetLocateDeployment: boolean;
    mainnetLocateTransactions: boolean;
    mainnetExternalDexSell: boolean;
    mainnetForkLifecycle: boolean;
    devnetLocateLifecycle: boolean;
    frontendExecutionWiring: boolean;
  }>("EXECUTION_STATUS.json");
  const dexSell = load<{
    result: string;
    mainnetTransaction: boolean;
    network: string;
    signature: string;
    slot: number;
    amountRaw: string;
    quoteOutRaw: string;
    minOutRaw: string;
    actualOutRaw: string;
    locateProtocol: boolean;
    route: string[];
  }>("mainnet-dex/sell.json");
  const dexBuy = load<{
    result: string;
    signature: string;
    slot: number;
    inAmountUsdcRaw: string;
    quoteOutRaw: string;
    minOutRaw: string;
    openaiDeltaFromPreBuyback: string;
    locateProtocol: boolean;
    route: string[];
  }>("mainnet-dex/buyback.json");
  const before = load<{ solLamports: string; openaiRaw: string; usdcRaw: string }>("mainnet-dex/balance-before.json");
  const after = load<{ solLamports: string; openaiRaw: string; usdcRaw: string }>("mainnet-dex/balance-after-buyback.json");
  const proto = load<{ network: string; returnCycle: { create: string; take: string; return: string } }>("devnet/protocol.json");

  const devnetCount = [proto.returnCycle.create, proto.returnCycle.take, proto.returnCycle.return, cycle.claimCycle.claim].filter((sig) => sig.length > 0).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-white">
      <h1 className="font-sans text-4xl font-semibold tracking-tight">Proof</h1>
      <p className="mt-3 text-[15px] text-zinc-400">Devnet protocol, cloned Mainnet state, and the external market stay separate.</p>

      <details className="mt-10 rounded-2xl border border-zinc-800 p-6">
        <summary className="cursor-pointer">
          <h2 className="font-sans text-2xl font-semibold">The full lifecycle ran on Devnet.</h2>
          <p className="mt-2 font-mono text-sm text-[#7D9BFF]">{devnetCount} signatures</p>
        </summary>
        <p className="mt-4 text-sm text-zinc-500">{cycle.label}. dOPENAI is a Devnet replica, not a Mainnet PreStock.</p>
        <ul className="mt-4 space-y-2 font-mono text-xs text-zinc-400">
          <li>create {proto.returnCycle.create}</li>
          <li>take {proto.returnCycle.take}</li>
          <li>return {proto.returnCycle.return}</li>
          <li>claim {cycle.claimCycle.claim}</li>
          <li>early claim refusal code {cycle.claimCycle.earlyClaimSimulationCode}</li>
        </ul>
      </details>

      <details className="mt-4 rounded-2xl border border-zinc-800 p-6">
        <summary className="cursor-pointer">
          <h2 className="font-sans text-2xl font-semibold">Same program, real OpenAI mint state.</h2>
          <p className="mt-2 font-mono text-sm text-[#7D9BFF]">{fork.matrix.passed}/{fork.matrix.total}</p>
        </summary>
        <p className="mt-4 text-sm text-zinc-500">{fork.label}. Real Mainnet account state. Local LOCATE execution. Not a Mainnet transaction.</p>
        <p className="mt-3 font-mono text-sm">{fork.matrix.passed}/{fork.matrix.total} passed, {fork.matrix.failed} failed</p>
        <p className="mt-2 font-mono text-xs text-zinc-500">Program {fork.programId} sha256 {fork.programSha256}. Fee epoch {fork.epochUsedForActiveFee}.</p>
        <p className="mt-2 font-mono text-xs text-zinc-400">OpenAI {fork.accounts.openai.pubkey} slot {fork.accounts.openai.slot}. Neuralink {fork.accounts.neuralink.pubkey} slot {fork.accounts.neuralink.slot}. USDC {fork.accounts.usdc.pubkey} slot {fork.accounts.usdc.slot}.</p>
        <p className="mt-2 text-sm text-zinc-500">Local sell {String(forkDex.dexSellExecution)}. Local buyback {String(forkDex.dexBuybackExecution)}. {forkDex.dexNote}</p>
        <p className="mt-2 text-sm text-zinc-500">{life.label}. Mint {life.mint}. Passed {String(life.passed)}. {fork.balances}</p>
        <ul className="mt-3 space-y-1 font-mono text-xs text-zinc-400">
          {Object.entries(life.balances).map(([key, value]) => (
            <li key={key}>{key} {String(value)}</li>
          ))}
        </ul>
        <ul className="mt-4 space-y-2 text-sm">
          {token2022.exercised.map((row) => (
            <li key={row.extension}>
              <span className="font-mono text-[#4D7CFF]">{row.extension}</span>
              <span className="text-zinc-400"> {row.evidence}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-zinc-500">Not exercised: {token2022.notExercised.join(", ")}.</p>
      </details>

      <details className="mt-4 rounded-2xl border border-zinc-800 p-6">
        <summary className="cursor-pointer">
          <h2 className="font-sans text-2xl font-semibold">The short leg runs on the real market.</h2>
          <p className="mt-2 font-mono text-sm text-[#7D9BFF]">{dexSell.result} / {dexBuy.result}</p>
        </summary>
        <p className="mt-4 text-sm text-zinc-500">Real Mainnet DEX transaction. Not a LOCATE Mainnet transaction. locateProtocol {String(dexSell.locateProtocol)}.</p>
        <p className="mt-3 font-mono text-xs text-zinc-400">Sell {dexSell.result} {dexSell.signature} slot {dexSell.slot}. In {dexSell.amountRaw} out {dexSell.actualOutRaw} min {dexSell.minOutRaw} route {dexSell.route.join(" > ")}.</p>
        <p className="mt-2 font-mono text-xs text-zinc-400">Buyback {dexBuy.result} {dexBuy.signature} slot {dexBuy.slot}. USDC in {dexBuy.inAmountUsdcRaw} quoted {dexBuy.quoteOutRaw} min {dexBuy.minOutRaw} OpenAI delta {dexBuy.openaiDeltaFromPreBuyback}.</p>
        <p className="mt-2 font-mono text-xs text-zinc-400">Before SOL {before.solLamports} OpenAI {before.openaiRaw} USDC {before.usdcRaw}. After SOL {after.solLamports} OpenAI {after.openaiRaw} USDC {after.usdcRaw}.</p>
        <p className="mt-2 text-sm text-zinc-500">Devnet DEX remains {devnet.result}. Execution benchmark {devnet.jupiter.errorCode}. Pool venue {devnet.dlmm.error} {devnet.dlmm.errorNumber}. Signed Devnet DEX transactions: {devnet.signedTransactions.length}.</p>
        <p className="mt-2 text-sm text-zinc-500">Quote simulations are not Mainnet transactions: sell {sell.result}, buyback {buy.result}. LOCATE Mainnet gate enabled {String(gate.enabled)}, signed {String(gate.signed)}, sent {String(gate.sent)}. {gate.blocker}</p>
      </details>

      <details className="mt-4 rounded-2xl border border-zinc-800 p-6">
        <summary className="cursor-pointer">
          <h2 className="font-sans text-2xl font-semibold">Math and adversarial coverage.</h2>
          <p className="mt-2 font-mono text-sm text-[#7D9BFF]">{replay.total} replay vectors</p>
        </summary>
        <p className="mt-4 text-sm text-zinc-500">Local validator {local.passed}/{local.total}, {local.failed} failed. {local.usdcNote} Local binary sha256 {local.programSha256}.</p>
        <p className="mt-2 text-sm text-zinc-500">Functional {sec.functional.passed}. Security {sec.security.passed}. Mutation {sec.mutation.passed}. Backend {sec.backendVitest.passed}. Replay {replay.total} vectors, seed {replay.seed}. Families {JSON.stringify(replay.families)}.</p>
        <p className="mt-2 text-sm text-zinc-500">Reproducible LOCATE build. Not a Mainnet verified program. {source.claim} Devnet ELF {source.devnet.payloadSha256}. Padded region {source.devnet.elfRegionSha256}. Matches local devnet binary {String(source.devnet.matchesLocalDevnetBinary)}. Mainnet program account exists {String(source.mainnet.programAccountExists)}. HEAD {source.head}.</p>
      </details>

      <p className="mt-8 font-mono text-xs text-zinc-500">
        Open: source build verified {String(source.verified)}. Devnet DEX {devnet.result}. mainnetLocateDeployment {String(status.mainnetLocateDeployment)}. mainnetLocateTransactions {String(status.mainnetLocateTransactions)}.
      </p>
    </main>
  );
}
