"use client";

import { createLocateApi } from "@locate/sdk";

export const API_BASE = process.env.VITE_API_BASE_URL ?? "https://locate-api-znz1.onrender.com";
export const SOLANA_CLUSTER = process.env.VITE_SOLANA_CLUSTER ?? "devnet";
export const SOLANA_RPC_URL = process.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const LOCATE_PROGRAM_ID_TEXT =
  process.env.VITE_LOCATE_PROGRAM_ID ?? "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6";
export const DEVNET_MINT = "9S2Lb7Yf8pfDKccVgwsMHXQbngGVyfUn5N1FJYQUwE4P";

export const locateApi = createLocateApi(API_BASE);
