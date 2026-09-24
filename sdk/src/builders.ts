import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  ATA,
  COMPUTE_BUDGET,
  LOCATE_PROGRAM_ID,
  MEMO,
  SYSTEM,
  TOKEN,
  TOKEN_2022,
} from "./constants.js";
import { ata, discriminator, eventAuthority, i64, loanPda, offerPda, u64 } from "./pdas.js";

export type Cluster = "devnet" | "mainnet-beta";

export type OfferTerms = {
  lender: PublicKey;
  mint: PublicKey;
  usdcMint: PublicKey;
  nonce: bigint;
  amountRaw: bigint;
  collateralUsdc: bigint;
  feeUsdc: bigint;
  termSecs: bigint;
  graceSecs: bigint;
  expiresAt: bigint;
  decimals: number;
};

function cu(units = 400_000): TransactionInstruction {
  const data = Buffer.alloc(5);
  data.writeUInt8(2, 0);
  data.writeUInt32LE(units, 1);
  return new TransactionInstruction({ programId: COMPUTE_BUDGET, keys: [], data });
}

function approveChecked(owner: PublicKey, source: PublicKey, mint: PublicKey, delegate: PublicKey, amount: bigint, decimals: number, program: PublicKey) {
  const data = Buffer.concat([Buffer.from([13]), u64(amount), Buffer.from([decimals])]);
  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: delegate, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function revoke(owner: PublicKey, source: PublicKey, program: PublicKey) {
  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([5]),
  });
}

function tail(programId: PublicKey) {
  return [
    { pubkey: eventAuthority(programId), isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];
}

export function createOfferIx(terms: OfferTerms, programId = LOCATE_PROGRAM_ID) {
  const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
  const data = Buffer.concat([
    discriminator("create_offer"),
    u64(terms.nonce),
    u64(terms.amountRaw),
    u64(terms.collateralUsdc),
    u64(terms.feeUsdc),
    i64(terms.termSecs),
    i64(terms.graceSecs),
    i64(terms.expiresAt),
  ]);
  return new TransactionInstruction({
    programId,
    data,
    keys: [
      { pubkey: terms.lender, isSigner: true, isWritable: true },
      { pubkey: terms.mint, isSigner: false, isWritable: false },
      { pubkey: ata(terms.lender, terms.mint, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: terms.usdcMint, isSigner: false, isWritable: false },
      { pubkey: ata(terms.lender, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      ...tail(programId),
    ],
  });
}

export function buildListTx(terms: OfferTerms, programId = LOCATE_PROGRAM_ID) {
  const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
  const source = ata(terms.lender, terms.mint, TOKEN_2022);
  return [cu(), approveChecked(terms.lender, source, terms.mint, offer, terms.amountRaw, terms.decimals, TOKEN_2022), createOfferIx(terms, programId)];
}

export function buildCancelTx(terms: Pick<OfferTerms, "lender" | "mint" | "nonce">, programId = LOCATE_PROGRAM_ID) {
  const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
  const source = ata(terms.lender, terms.mint, TOKEN_2022);
  const ix = new TransactionInstruction({
    programId,
    data: discriminator("cancel_offer"),
    keys: [
      { pubkey: terms.lender, isSigner: true, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: source, isSigner: false, isWritable: false },
      ...tail(programId),
    ],
  });
  return [ix, revoke(terms.lender, source, TOKEN_2022)];
}

export function takeOfferIx(borrower: PublicKey, terms: OfferTerms, programId = LOCATE_PROGRAM_ID) {
  const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
  const loan = loanPda(offer, programId);
  const data = Buffer.concat([
    discriminator("take_offer"),
    u64(terms.amountRaw),
    u64(terms.collateralUsdc),
    u64(terms.feeUsdc),
    i64(terms.termSecs),
  ]);
  return new TransactionInstruction({
    programId,
    data,
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: terms.lender, isSigner: false, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: terms.mint, isSigner: false, isWritable: false },
      { pubkey: ata(terms.lender, terms.mint, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: ata(borrower, terms.mint, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: ata(loan, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: terms.usdcMint, isSigner: false, isWritable: false },
      { pubkey: ata(borrower, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: ata(terms.lender, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: MEMO, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      ...tail(programId),
    ],
  });
}

export function buildTakeTx(borrower: PublicKey, terms: OfferTerms, programId = LOCATE_PROGRAM_ID) {
  return [cu(), takeOfferIx(borrower, terms, programId)];
}

export function returnLoanIx(borrower: PublicKey, terms: OfferTerms, maxGrossRaw: bigint, programId = LOCATE_PROGRAM_ID) {
  const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
  const loan = loanPda(offer, programId);
  return new TransactionInstruction({
    programId,
    data: Buffer.concat([discriminator("return_loan"), u64(maxGrossRaw)]),
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: terms.mint, isSigner: false, isWritable: false },
      { pubkey: ata(borrower, terms.mint, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: terms.lender, isSigner: false, isWritable: false },
      { pubkey: ata(terms.lender, terms.mint, TOKEN_2022), isSigner: false, isWritable: true },
      { pubkey: ata(loan, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: ata(borrower, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: terms.usdcMint, isSigner: false, isWritable: false },
      { pubkey: MEMO, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      ...tail(programId),
    ],
  });
}

export function buildReturnTx(borrower: PublicKey, terms: OfferTerms, maxGrossRaw: bigint, programId = LOCATE_PROGRAM_ID) {
  const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
  const loan = loanPda(offer, programId);
  const source = ata(borrower, terms.mint, TOKEN_2022);
  return [
    cu(),
    approveChecked(borrower, source, terms.mint, loan, maxGrossRaw, terms.decimals, TOKEN_2022),
    returnLoanIx(borrower, terms, maxGrossRaw, programId),
    revoke(borrower, source, TOKEN_2022),
  ];
}

export function claimIx(caller: PublicKey, borrower: PublicKey, terms: OfferTerms, programId = LOCATE_PROGRAM_ID) {
  const offer = offerPda(terms.lender, terms.mint, terms.nonce, programId);
  const loan = loanPda(offer, programId);
  return new TransactionInstruction({
    programId,
    data: discriminator("claim_collateral"),
    keys: [
      { pubkey: caller, isSigner: true, isWritable: true },
      { pubkey: loan, isSigner: false, isWritable: true },
      { pubkey: borrower, isSigner: false, isWritable: true },
      { pubkey: terms.lender, isSigner: false, isWritable: false },
      { pubkey: terms.mint, isSigner: false, isWritable: false },
      { pubkey: ata(loan, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: ata(terms.lender, terms.usdcMint, TOKEN), isSigner: false, isWritable: true },
      { pubkey: terms.usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
      { pubkey: ATA, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      ...tail(programId),
    ],
  });
}

export function buildClaimTx(caller: PublicKey, borrower: PublicKey, terms: OfferTerms, programId = LOCATE_PROGRAM_ID) {
  return [cu(), claimIx(caller, borrower, terms, programId)];
}
