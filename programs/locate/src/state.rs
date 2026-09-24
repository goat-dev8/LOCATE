use anchor_lang::prelude::*;

use crate::constants::{ACCOUNT_VERSION, LOAN_SPACE, OFFER_SPACE};

#[account]
#[derive(InitSpace)]
pub struct Offer {
    pub version: u8,
    pub bump: u8,
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
    pub created_at: i64,
    pub reserved: [u8; 32],
}

#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub version: u8,
    pub bump: u8,
    pub reserved_u8: u8,
    pub offer: Pubkey,
    pub lender: Pubkey,
    pub lender_ata: Pubkey,
    pub borrower: Pubkey,
    pub mint: Pubkey,
    pub amount_raw: u64,
    pub collateral_usdc: u64,
    pub fee_usdc: u64,
    pub start_ts: i64,
    pub maturity_ts: i64,
    pub claim_after_ts: i64,
    pub fee_bps_at_take: u16,
    pub reserved: [u8; 32],
}

impl Offer {
    pub fn new_blank() -> Self {
        Self {
            version: ACCOUNT_VERSION,
            bump: 0,
            lender: Pubkey::default(),
            lender_ata: Pubkey::default(),
            mint: Pubkey::default(),
            nonce: 0,
            amount_raw: 0,
            collateral_usdc: 0,
            fee_usdc: 0,
            term_secs: 0,
            grace_secs: 0,
            expires_at: 0,
            created_at: 0,
            reserved: [0; 32],
        }
    }
}

const _: () = assert!(8 + Offer::INIT_SPACE == OFFER_SPACE);
const _: () = assert!(8 + Loan::INIT_SPACE == LOAN_SPACE);
