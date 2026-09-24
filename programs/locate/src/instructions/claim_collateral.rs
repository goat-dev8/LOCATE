use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint as TokenMint, Token, Transfer},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::constants::*;
use crate::errors::LocateError;
use crate::state::Loan;
use crate::token2022::read_mint_flags;

pub fn handler(ctx: &mut Context<crate::ClaimCollateral>) -> Result<()> {
    let clock = Clock::get()?;
    let loan = &ctx.accounts.loan;
    require!(clock.unix_timestamp >= loan.claim_after_ts, LocateError::ClaimRefusedNotMatured);

    let mint_ai = ctx.accounts.mint.to_account_info();
    let flags = {
        let mint_data = mint_ai.data.borrow();
        read_mint_flags(&mint_data, clock.epoch)?
    };
    let defer_until = loan
        .claim_after_ts
        .checked_add(PAUSE_DEFER_CAP_SECS)
        .ok_or(LocateError::MathOverflow)?;
    if (flags.paused || flags.hook_set) && clock.unix_timestamp < defer_until {
        return err!(LocateError::ClaimDeferredPaused);
    }

    let k = loan.collateral_usdc;
    require!(ctx.accounts.vault.amount >= k, LocateError::MathOverflow);
    let bump = loan.bump;
    let offer_key = loan.offer;
    let bump_arr = [bump];
    let seeds: [&[u8]; 3] = [b"loan", offer_key.as_ref(), bump_arr.as_ref()];
    let signer = [&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.lender_usdc.to_account_info(),
                authority: ctx.accounts.loan.to_account_info(),
            },
            &signer,
        ),
        ctx.accounts.vault.amount,
    )?;
    token::close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.borrower.to_account_info(),
                authority: ctx.accounts.loan.to_account_info(),
            },
            &signer,
        ),
    )?;

    Ok(())
}
