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
    devnet: { elfSha256: string; matchesLocalMainnetBinary: boolean; matchesLocalDevnetBinary: boolean };
    mainnet: { programAccountExists: boolean; slot: number };
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

  const rows = [
    ["Cloned mainnet fork", `${fork.matrix.passed}/${fork.matrix.total} passed, ${fork.matrix.failed} failed`, fork.label],
    ["Jupiter sell simulation", sell.result, sell.mainnetTransaction ? "mainnet transaction" : "Not a mainnet transaction"],
    ["Jupiter buyback simulation", buy.result, buy.mainnetTransaction ? "mainnet transaction" : "Not a mainnet transaction"],
    ["Local validator", `${local.passed}/${local.total} passed, ${local.failed} failed`, local.label],
    ["Devnet create/take/return", cycle.returnCycle.return, cycle.label],
    ["Devnet short loop", devnet.result, `${devnet.label}. Signed transactions: ${devnet.signedTransactions.length}. Jupiter ${devnet.jupiter.errorCode}. DLMM ${devnet.dlmm.error} ${devnet.dlmm.errorNumber}.`],
    ["Cross-runtime replay", `${replay.total} vectors`, `seed ${replay.seed}`],
    ["Security / functional / mutation", `${sec.functional.passed}/${sec.functional.passed} functional, ${sec.security.passed} security, ${sec.mutation.passed} mutation, backend ${sec.backendVitest.passed}`, sec.label],
    ["Source/build correspondence", source.verified ? "verified" : "not verified", source.claim],
    ["Mainnet execution", gate.signed || gate.sent ? "signed" : "not signed", gate.blocker],
  ];

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-white">
      <p className="font-mono text-xs tracking-widest text-[#4D7CFF]">PROOF</p>
      <h1 className="mt-3 font-display text-4xl">Recorded artifacts</h1>
      <p className="mt-4 text-sm text-zinc-400">
        Three separate layers. Fork and simulation are not Mainnet transactions. LOCATE is not deployed to Mainnet.
      </p>
      <p className="mt-2 font-mono text-xs text-zinc-500">
        mainnetLocateDeployment {String(status.mainnetLocateDeployment)} · mainnetLocateTransactions {String(status.mainnetLocateTransactions)}
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl">A. Protocol execution — real Devnet</h2>
        <p className="mt-2 text-sm text-zinc-500">{cycle.label}. dOPENAI is a Devnet replica, not a Mainnet PreStock.</p>
        <ul className="mt-4 space-y-2 font-mono text-xs text-zinc-400">
          <li>create {proto.returnCycle.create}</li>
          <li>take {proto.returnCycle.take}</li>
          <li>return {proto.returnCycle.return}</li>
          <li>claim {cycle.claimCycle.claim}</li>
          <li>early claim refusal code {cycle.claimCycle.earlyClaimSimulationCode}</li>
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">B. Cloned Mainnet state — local execution</h2>
        <p className="mt-2 text-sm text-zinc-500">{fork.label}. Not a Mainnet transaction. OpenAI and Neuralink mint bytes, Token-2022, lifecycle, adversarial cases.</p>
        <p className="mt-3 font-mono text-sm">{fork.matrix.passed}/{fork.matrix.total} passed</p>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">C. Mainnet market execution — real external DEX</h2>
        <p className="mt-2 text-sm text-zinc-500">Real Mainnet DEX transaction. Not a LOCATE Mainnet transaction. locateProtocol {String(dexSell.locateProtocol)}.</p>
        <p className="mt-3 font-mono text-xs text-zinc-400">Sell {dexSell.result} {dexSell.signature} slot {dexSell.slot}. In {dexSell.amountRaw} out {dexSell.actualOutRaw} min {dexSell.minOutRaw} route {dexSell.route.join(" > ")}.</p>
        <p className="mt-2 font-mono text-xs text-zinc-400">Buyback {dexBuy.result} {dexBuy.signature} slot {dexBuy.slot}. USDC in {dexBuy.inAmountUsdcRaw} quoted {dexBuy.quoteOutRaw} min {dexBuy.minOutRaw} OpenAI delta {dexBuy.openaiDeltaFromPreBuyback}.</p>
        <p className="mt-2 font-mono text-xs text-zinc-400">Before SOL {before.solLamports} OpenAI {before.openaiRaw} USDC {before.usdcRaw}. After SOL {after.solLamports} OpenAI {after.openaiRaw} USDC {after.usdcRaw}.</p>
        <p className="mt-2 text-sm text-zinc-500">Devnet DEX remains {devnet.result}. Quote simulations are not Mainnet transactions: sell {sell.result}, buyback {buy.result}.</p>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">D. Security and consistency</h2>
        <p className="mt-2 text-sm text-zinc-500">Local validator {local.passed}/{local.total}. Functional {sec.functional.passed}. Security {sec.security.passed}. Mutation {sec.mutation.passed}. Replay {replay.total}.</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Layer 2 — Mainnet fork (local LOCATE)</h2>
        <p className="mt-2 text-sm text-zinc-500">{fork.label}. Not a Mainnet transaction.</p>
        <p className="mt-3 font-mono text-sm">{fork.matrix.passed}/{fork.matrix.total} passed, {fork.matrix.failed} failed</p>
        <p className="mt-2 font-mono text-xs text-zinc-500">Program {fork.programId} sha256 {fork.programSha256}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Layer 3 — Devnet LOCATE</h2>
        <p className="mt-2 text-sm text-zinc-500">{cycle.label}. Network {proto.network}.</p>
        <ul className="mt-4 space-y-2 font-mono text-xs text-zinc-400">
          <li>create {proto.returnCycle.create}</li>
          <li>take {proto.returnCycle.take}</li>
          <li>return {proto.returnCycle.return}</li>
          <li>claim {cycle.claimCycle.claim}</li>
          <li>Devnet DEX {devnet.result} — Jupiter {devnet.jupiter.errorCode}, DLMM {devnet.dlmm.error} {devnet.dlmm.errorNumber}</li>
        </ul>
      </section>

      <dl className="mt-10 divide-y divide-[#242427] border-y border-[#242427]">
        {rows.map(([name, value, note]) => (
          <div key={name} className="py-4">
            <dt className="text-sm text-zinc-400">{name}</dt>
            <dd className="mt-1 font-mono text-lg">{value}</dd>
            <dd className="mt-1 text-sm text-zinc-500">{note}</dd>
          </div>
        ))}
      </dl>
      <section className="mt-10 space-y-2 font-mono text-xs text-zinc-400">
        <p>Program {fork.programId}</p>
        <p>Fork binary sha256 {fork.programSha256}</p>
        <p>Local binary sha256 {local.programSha256}</p>
        <p>Fee epoch {fork.epochUsedForActiveFee}</p>
        <p>OpenAI {fork.accounts.openai.pubkey} slot {fork.accounts.openai.slot}</p>
        <p>Neuralink {fork.accounts.neuralink.pubkey} slot {fork.accounts.neuralink.slot}</p>
        <p>USDC {fork.accounts.usdc.pubkey} slot {fork.accounts.usdc.slot}</p>
        <p>{fork.balances}</p>
        <p>{local.usdcNote}</p>
        <p>Replay families {JSON.stringify(replay.families)}</p>
        <p>Mainnet flag enabled {String(gate.enabled)}. Missing {gate.prerequisitesMissing.join(", ") || "none"}.</p>
        <p>Devnet ELF {source.devnet.elfSha256}. Matches local mainnet binary {String(source.devnet.matchesLocalMainnetBinary)}. Matches local devnet binary {String(source.devnet.matchesLocalDevnetBinary)}.</p>
        <p>Mainnet program account exists {String(source.mainnet.programAccountExists)} at slot {source.mainnet.slot}. HEAD {source.head}.</p>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Token-2022</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {token2022.exercised.map((row) => (
            <li key={row.extension}>
              <span className="font-mono text-[#4D7CFF]">{row.extension}</span>
              <span className="text-zinc-400"> — {row.evidence}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-zinc-500">Not exercised: {token2022.notExercised.join(", ")}.</p>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Devnet signatures</h2>
        <p className="mt-2 text-sm text-zinc-500">{cycle.label}</p>
        <ul className="mt-4 space-y-2 font-mono text-xs text-zinc-400">
          <li>create {cycle.returnCycle.create}</li>
          <li>take {cycle.returnCycle.take}</li>
          <li>return {cycle.returnCycle.return}</li>
          <li>claim create {cycle.claimCycle.create}</li>
          <li>claim take {cycle.claimCycle.take}</li>
          <li>claim {cycle.claimCycle.claim}</li>
          <li>early claim simulation code {cycle.claimCycle.earlyClaimSimulationCode}</li>
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">OpenAI fork settlement</h2>
        <p className="mt-2 text-sm text-zinc-500">{life.label}. Mint {life.mint}. Passed {String(life.passed)}.</p>
        <dl className="mt-4 divide-y divide-[#242427] border-y border-[#242427] font-mono text-sm">
          {Object.entries(life.balances).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-6 py-2">
              <dt className="text-zinc-400">{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
