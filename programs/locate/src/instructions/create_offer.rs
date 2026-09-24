use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::constants::*;
use crate::errors::LocateError;
use crate::state::Offer;
use crate::token2022::read_mint_flags;

pub fn handler(
    ctx: &mut Context<crate::CreateOffer>,
    nonce: u64,
    amount_raw: u64,
    collateral_usdc: u64,
    fee_usdc: u64,
    term_secs: i64,
    grace_secs: i64,
    expires_at: i64,
) -> Result<()> {
    require!(amount_raw > 0 && collateral_usdc > 0, LocateError::InvalidTerms);
    let now = Clock::get()?.unix_timestamp;
    require!(
        term_secs >= MIN_TERM_SECS && term_secs <= MAX_TERM_SECS,
        LocateError::InvalidTerms
    );
    require!(
        grace_secs >= MIN_GRACE_SECS && grace_secs <= MAX_GRACE_SECS,
        LocateError::InvalidTerms
    );
    require!(
        expires_at > now && expires_at <= now.saturating_add(MAX_OFFER_TTL_SECS),
        LocateError::InvalidTerms
    );

    require_keys_eq!(
        ctx.accounts.token_2022_program.key(),
        anchor_spl::token_2022::ID,
        LocateError::InvalidMint
    );
    require_keys_eq!(
        ctx.accounts.token_program.key(),
        anchor_spl::token::ID,
        LocateError::InvalidUsdcMint
    );

    let mint_ai = ctx.accounts.mint.to_account_info();
    let flags = {
        let mint_data = mint_ai.data.borrow();
        read_mint_flags(&mint_data, Clock::get()?.epoch)?
    };
    require!(!flags.non_transferable, LocateError::InvalidMint);
    require!(!flags.hook_set, LocateError::TakeRefusedHook);

    let ata = &ctx.accounts.lender_ata;
    require!(
        ata.delegate == Some(ctx.accounts.offer.key()).into()
            && u64::from(ata.delegated_amount) >= amount_raw,
        LocateError::TakeRefusedUnfunded
    );
    require!(
        ata.amount >= amount_raw && !ata.is_frozen(),
        LocateError::TakeRefusedUnfunded
    );

    let offer = &mut ctx.accounts.offer;
    offer.version = ACCOUNT_VERSION;
    offer.bump = ctx.bumps.offer;
    offer.lender = ctx.accounts.lender.key();
    offer.lender_ata = ata.key();
    offer.mint = ctx.accounts.mint.key();
    offer.nonce = nonce;
    offer.amount_raw = amount_raw;
    offer.collateral_usdc = collateral_usdc;
    offer.fee_usdc = fee_usdc;
    offer.term_secs = term_secs;
    offer.grace_secs = grace_secs;
    offer.expires_at = expires_at;
    offer.created_at = now;
    offer.reserved = [0; 32];
    Ok(())
}
