use anchor_lang::prelude::*;

#[event]
pub struct OfferCreated {
    pub offer: Pubkey,
    pub lender: Pubkey,
    pub lender_ata: Pubkey,
    pub mint: Pubkey,
    pub nonce: u64,
    pub amount_raw: u64,
    pub collateral_usdc: u64,
    pub fee_usdc: u64,
    pub term_secs: i64,
    pub grace_secs: i64,
    pub expires_at: i64,
}

#[event]
pub struct OfferCancelled {
    pub offer: Pubkey,
    pub lender: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct LoanTaken {
    pub offer: Pubkey,
    pub loan: Pubkey,
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub mint: Pubkey,
    pub amount_raw: u64,
    pub borrower_received_raw: u64,
    pub collateral_usdc: u64,
    pub fee_usdc: u64,
    pub fee_bps: u16,
    pub start_ts: i64,
    pub maturity_ts: i64,
    pub claim_after_ts: i64,
}

#[event]
pub struct LoanReturned {
    pub loan: Pubkey,
    pub offer: Pubkey,
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub mint: Pubkey,
    pub amount_raw: u64,
    pub gross_raw: u64,
    pub net_received_raw: u64,
    pub fee_bps: u16,
    pub collateral_released: u64,
}

#[event]
pub struct LoanClaimed {
    pub loan: Pubkey,
    pub offer: Pubkey,
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub mint: Pubkey,
    pub amount_raw: u64,
    pub collateral_usdc: u64,
    pub claimed_by: Pubkey,
}
