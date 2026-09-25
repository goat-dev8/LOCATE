"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { TransactionInstruction } from "@solana/web3.js";
import { approvePrepared, canApprove, prepareInstructions, resolveSign, type BalanceDelta, type PreparedTx } from "./tx";

export type TxPhase = "review" | "simulating" | "ready" | "signing" | "confirming" | "done";

export function phaseCopy(phase: TxPhase): string {
  if (phase === "simulating") return "Simulation — not a transaction.";
  if (phase === "signing") return "Waiting for Phantom approval.";
  if (phase === "confirming") return "Signed. Confirming on Devnet.";
  return "";
}

export function usePreparedTx() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [phase, setPhase] = useState<TxPhase>("review");
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedTx | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [deltas, setDeltas] = useState<BalanceDelta[]>([]);

  const simulate = useCallback(
    async (instructions: TransactionInstruction[] | string) => {
      if (typeof instructions === "string") {
        setError(instructions);
        setPhase("review");
        return;
      }
      if (!publicKey) {
        setError("Connect a Devnet wallet.");
        setPhase("review");
        return;
      }
      setError(null);
      setPhase("simulating");
      try {
        const result = await prepareInstructions(connection, publicKey, instructions);
        if (!result.ok || !("prepared" in result)) {
          setError(
            !result.ok
              ? result.simulated
                ? `Simulation — not a transaction. ${result.error}`
                : result.error
              : "Simulation did not return a prepared transaction.",
          );
          setPhase("review");
          return;
        }
        setPrepared(result.prepared);
        setPhase("ready");
      } catch (thrown) {
        setError(thrown instanceof Error ? thrown.message : "Simulation failed. No transaction was sent.");
        setPhase("review");
      }
    },
    [connection, publicKey],
  );

  const approve = useCallback(async () => {
    const sign = resolveSign(typeof signTransaction === "function" ? (tx) => signTransaction(tx) : undefined);
    if (!prepared || !canApprove(sign)) {
      setError("Phantom did not expose a signer. Reconnect the wallet, then approve again.");
      setPhase("ready");
      return;
    }
    setError(null);
    setPhase("signing");
    try {
      const result = await approvePrepared(connection, sign ?? ((tx) => Promise.resolve(tx)), prepared, (sent) => {
        setSignature(sent);
        setPhase("confirming");
      });
      if (!result.ok) {
        setError(result.simulated ? `Simulation — not a transaction. ${result.error}` : result.error);
        setPrepared(null);
        setPhase("review");
        return;
      }
      setSignature(result.signature);
      setVerified(result.verified);
      setDeltas(result.deltas);
      setPhase("done");
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "The wallet did not finish the transaction.");
      setPrepared(null);
      setPhase("review");
    }
  }, [connection, prepared, signTransaction]);

  return { phase, error, signature, verified, deltas, publicKey, simulate, approve };
}
