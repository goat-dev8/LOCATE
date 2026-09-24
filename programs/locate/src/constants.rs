use anchor_lang::prelude::*;

pub const ACCOUNT_VERSION: u8 = 1;

pub const MAX_TERM_SECS: i64 = 60 * 24 * 60 * 60;
pub const MAX_OFFER_TTL_SECS: i64 = 30 * 24 * 60 * 60;
pub const MAX_GRACE_SECS: i64 = 7 * 24 * 60 * 60;
pub const PAUSE_DEFER_CAP_SECS: i64 = 7 * 24 * 60 * 60;

pub const OFFER_SPACE: usize = 202;
pub const LOAN_SPACE: usize = 253;

#[cfg(feature = "devnet")]
pub const MIN_TERM_SECS: i64 = 60;
#[cfg(not(feature = "devnet"))]
pub const MIN_TERM_SECS: i64 = 3600;

#[cfg(feature = "devnet")]
pub const MIN_GRACE_SECS: i64 = 30;
#[cfg(not(feature = "devnet"))]
pub const MIN_GRACE_SECS: i64 = 3600;

#[cfg(feature = "devnet")]
pub const USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
#[cfg(not(feature = "devnet"))]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

pub const MEMO_PROGRAM_ID: Pubkey = pubkey!("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
