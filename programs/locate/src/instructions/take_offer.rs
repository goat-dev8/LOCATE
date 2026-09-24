use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token},
    token_2022::{self, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::constants::*;
use crate::errors::LocateError;
use crate::memo_cpi::emit_memo;
use crate::state::{Loan, Offer};
use crate::token2022::read_mint_flags;

pub fn handler(
    ctx: &mut Context<crate::TakeOffer>,
    expected_amount_raw: u64,
    expected_collateral_usdc: u64,
    expected_fee_usdc: u64,
    expected_term_secs: i64,
) -> Result<u64> {
    let offer = &ctx.accounts.offer;
    require!(ctx.accounts.borrower.key() != offer.lender, LocateError::SelfTakeNotAllowed);
    require!(
        offer.amount_raw == expected_amount_raw
            && offer.collateral_usdc == expected_collateral_usdc
            && offer.fee_usdc == expected_fee_usdc
            && offer.term_secs == expected_term_secs,
        LocateError::TermsMismatch
    );
    let clock = Clock::get()?;
    require!(clock.unix_timestamp < offer.expires_at, LocateError::OfferExpired);

    require_keys_eq!(
        ctx.accounts.token_2022_program.key(),
        anchor_spl::token_2022::ID,
        LocateError::InvalidMint
    );

    let mint_ai = ctx.accounts.mint.to_account_info();
    let flags = {
        let mint_data = mint_ai.data.borrow();
        read_mint_flags(&mint_data, clock.epoch)?
    };
    require!(!flags.paused, LocateError::TakeRefusedPaused);
    require!(!flags.hook_set, LocateError::TakeRefusedHook);
    require!(!flags.fee_pending, LocateError::TakeRefusedFeePending);

    let n = offer.amount_raw;
    let ata = &ctx.accounts.lender_ata;
    require!(
        ata.delegate == Some(offer.key()).into()
            && u64::from(ata.delegated_amount) >= n
            && ata.amount >= n
            && !ata.is_frozen(),
        LocateError::TakeRefusedUnfunded
    );
    let need = offer
        .collateral_usdc
        .checked_add(offer.fee_usdc)
        .ok_or(LocateError::MathOverflow)?;
    require!(ctx.accounts.borrower_usdc.amount >= need, LocateError::MathOverflow);

    let before = ctx.accounts.borrower_ata.amount;
    let offer_key = offer.key();
    let lender = offer.lender;
    let mint_key = offer.mint;
    let collateral = offer.collateral_usdc;
    let fee = offer.fee_usdc;
    let term = offer.term_secs;
    let grace = offer.grace_secs;
    let bump = offer.bump;
    let nonce = offer.nonce;
    let decimals = flags.decimals;
    let fee_bps = flags.fee_bps;

    let nonce_bytes = nonce.to_le_bytes();
    let bump_arr = [bump];
    let seeds: [&[u8]; 5] = [
        b"offer",
        lender.as_ref(),
        mint_key.as_ref(),
        nonce_bytes.as_ref(),
        bump_arr.as_ref(),
    ];
    let signer = [&seeds[..]];

    let loan_key = ctx.accounts.loan.key();
    emit_memo(
        &ctx.accounts.memo_program.to_account_info(),
        &format!("locate:take:{loan_key}"),
    )?;

    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_2022_program.key(),
            TransferChecked {
                from: ctx.accounts.lender_ata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.borrower_ata.to_account_info(),
                authority: ctx.accounts.offer.to_account_info(),
            },
            &signer,
        ),
        n,
        decimals,
    )?;

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            token::Transfer {
                from: ctx.accounts.borrower_usdc.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.borrower.to_account_info(),
            },
        ),
        collateral,
    )?;

    if fee > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                token::Transfer {
                    from: ctx.accounts.borrower_usdc.to_account_info(),
                    to: ctx.accounts.lender_usdc.to_account_info(),
                    authority: ctx.accounts.borrower.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    ctx.accounts.borrower_ata.reload()?;
    let received = ctx
        .accounts
        .borrower_ata
        .amount
        .checked_sub(before)
        .ok_or(LocateError::MathOverflow)?;

    let start = clock.unix_timestamp;
    let maturity = start.checked_add(term).ok_or(LocateError::MathOverflow)?;
    let claim_after = maturity.checked_add(grace).ok_or(LocateError::MathOverflow)?;

    let loan = &mut ctx.accounts.loan;
    loan.version = ACCOUNT_VERSION;
    loan.bump = ctx.bumps.loan;
    loan.reserved_u8 = 0;
    loan.offer = offer_key;
    loan.lender = lender;
    loan.lender_ata = ctx.accounts.lender_ata.key();
    loan.borrower = ctx.accounts.borrower.key();
    loan.mint = mint_key;
    loan.amount_raw = n;
    loan.collateral_usdc = collateral;
    loan.fee_usdc = fee;
    loan.start_ts = start;
    loan.maturity_ts = maturity;
    loan.claim_after_ts = claim_after;
    loan.fee_bps_at_take = fee_bps;
    loan.reserved = [0; 32];

    ctx.accounts.vault.reload()?;
    require!(ctx.accounts.vault.amount == collateral, LocateError::MathOverflow);
    Ok(received)
}
