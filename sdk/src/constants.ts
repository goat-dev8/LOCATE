import { PublicKey } from "@solana/web3.js";

export const LOCATE_PROGRAM_ID = new PublicKey("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");
export const DEVNET_USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const MAINNET_USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ATA = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const SYSTEM = new PublicKey("11111111111111111111111111111111");
export const COMPUTE_BUDGET = new PublicKey("ComputeBudget111111111111111111111111111111");
export const JUPITER_V6 = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

export const DEVNET_MINT_LABEL = "devnet test mint mirroring OPENAI's extensions; not a PreStocks token";

export const ERROR_NAMES = [
  "InvalidMint",
  "InvalidUsdcMint",
  "InvalidTerms",
  "InvalidLenderAccount",
  "OfferExpired",
  "TermsMismatch",
  "SelfTakeNotAllowed",
  "TakeRefusedPaused",
  "TakeRefusedHook",
  "TakeRefusedFeePending",
  "TakeRefusedUnfunded",
  "ReturnRefusedPaused",
  "ReturnRefusedHook",
  "ReturnExceedsMaxGross",
  "ReturnRefusedShortDelivery",
  "ClaimRefusedNotMatured",
  "ClaimDeferredPaused",
  "MathOverflow",
  "Unauthorized",
] as const;
