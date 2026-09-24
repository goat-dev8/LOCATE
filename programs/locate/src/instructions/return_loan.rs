use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Token, Transfer},
    token_2022::{self, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::constants::*;
use crate::errors::LocateError;
use crate::memo_cpi::emit_memo;
use crate::state::Loan;
use crate::token2022::{gross_for_net, read_mint_flags};

pub fn handler(ctx: &mut Context<crate::ReturnLoan>, max_gross_raw: u64) -> Result<(u64, u64, u16)> {
    require_keys_eq!(
        ctx.accounts.lender_ata.key(),
        ctx.accounts.loan.lender_ata,
        LocateError::InvalidLenderAccount
    );
    require_keys_eq!(
        ctx.accounts.token_2022_program.key(),
        anchor_spl::token_2022::ID,
        LocateError::InvalidMint
    );

    let clock = Clock::get()?;
    let mint_ai = ctx.accounts.mint.to_account_info();
    let flags = {
        let mint_data = mint_ai.data.borrow();
        read_mint_flags(&mint_data, clock.epoch)?
    };
    require!(!flags.paused, LocateError::ReturnRefusedPaused);
    require!(!flags.hook_set, LocateError::ReturnRefusedHook);

    let n = ctx.accounts.loan.amount_raw;
    let gross = gross_for_net(flags.fee_bps, flags.max_fee, n)?;
    require!(gross <= max_gross_raw, LocateError::ReturnExceedsMaxGross);

    let before = ctx.accounts.lender_ata.amount;
    let loan_key = ctx.accounts.loan.key();
    let bump = ctx.accounts.loan.bump;
    let offer_key = ctx.accounts.loan.offer;
    let bump_arr = [bump];
    let seeds: [&[u8]; 3] = [b"loan", offer_key.as_ref(), bump_arr.as_ref()];
    let signer = [&seeds[..]];

    emit_memo(
        &ctx.accounts.memo_program.to_account_info(),
        &format!("locate:return:{loan_key}"),
    )?;

    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_2022_program.key(),
            TransferChecked {
                from: ctx.accounts.borrower_source.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.lender_ata.to_account_info(),
                authority: ctx.accounts.loan.to_account_info(),
            },
            &signer,
        ),
        gross,
        flags.decimals,
    )?;

    ctx.accounts.lender_ata.reload()?;
    let net = ctx
        .accounts
        .lender_ata
        .amount
        .checked_sub(before)
        .ok_or(LocateError::MathOverflow)?;
    require!(net >= n, LocateError::ReturnRefusedShortDelivery);

    let k = ctx.accounts.loan.collateral_usdc;
    require!(ctx.accounts.vault.amount >= k, LocateError::MathOverflow);
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.borrower_usdc.to_account_info(),
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

    Ok((gross, net, flags.fee_bps))
}
