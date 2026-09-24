use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod memo_cpi;
pub mod state;
pub mod token2022;



declare_id!("F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6");

#[program]
pub mod locate {
    use super::events::*;
    use super::*;

    pub fn create_offer(
        mut ctx: Context<CreateOffer>,
        nonce: u64,
        amount_raw: u64,
        collateral_usdc: u64,
        fee_usdc: u64,
        term_secs: i64,
        grace_secs: i64,
        expires_at: i64,
    ) -> Result<()> {
        instructions::create_offer::handler(
            &mut ctx,
            nonce,
            amount_raw,
            collateral_usdc,
            fee_usdc,
            term_secs,
            grace_secs,
            expires_at,
        )?;
        let offer = &ctx.accounts.offer;
        emit_cpi!(OfferCreated {
            offer: offer.key(),
            lender: offer.lender,
            lender_ata: offer.lender_ata,
            mint: offer.mint,
            nonce: offer.nonce,
            amount_raw: offer.amount_raw,
            collateral_usdc: offer.collateral_usdc,
            fee_usdc: offer.fee_usdc,
            term_secs: offer.term_secs,
            grace_secs: offer.grace_secs,
            expires_at: offer.expires_at,
        });
        Ok(())
    }

    pub fn cancel_offer(mut ctx: Context<CancelOffer>) -> Result<()> {
        let offer_key = ctx.accounts.offer.key();
        let lender = ctx.accounts.offer.lender;
        let mint = ctx.accounts.offer.mint;
        instructions::cancel_offer::handler(&mut ctx)?;
        emit_cpi!(OfferCancelled {
            offer: offer_key,
            lender,
            mint,
        });
        Ok(())
    }

    pub fn take_offer(
        mut ctx: Context<TakeOffer>,
        expected_amount_raw: u64,
        expected_collateral_usdc: u64,
        expected_fee_usdc: u64,
        expected_term_secs: i64,
    ) -> Result<()> {
        let received = instructions::take_offer::handler(
            &mut ctx,
            expected_amount_raw,
            expected_collateral_usdc,
            expected_fee_usdc,
            expected_term_secs,
        )?;
        let loan = &ctx.accounts.loan;
        emit_cpi!(LoanTaken {
            offer: loan.offer,
            loan: loan.key(),
            lender: loan.lender,
            borrower: loan.borrower,
            mint: loan.mint,
            amount_raw: loan.amount_raw,
            borrower_received_raw: received,
            collateral_usdc: loan.collateral_usdc,
            fee_usdc: loan.fee_usdc,
            fee_bps: loan.fee_bps_at_take,
            start_ts: loan.start_ts,
            maturity_ts: loan.maturity_ts,
            claim_after_ts: loan.claim_after_ts,
        });
        Ok(())
    }

    pub fn return_loan(mut ctx: Context<ReturnLoan>, max_gross_raw: u64) -> Result<()> {
        let (gross, net, fee_bps) = instructions::return_loan::handler(&mut ctx, max_gross_raw)?;
        let loan = &ctx.accounts.loan;
        emit_cpi!(LoanReturned {
            loan: loan.key(),
            offer: loan.offer,
            lender: loan.lender,
            borrower: loan.borrower,
            mint: loan.mint,
            amount_raw: loan.amount_raw,
            gross_raw: gross,
            net_received_raw: net,
            fee_bps,
            collateral_released: loan.collateral_usdc,
        });
        Ok(())
    }

    pub fn claim_collateral(mut ctx: Context<ClaimCollateral>) -> Result<()> {
        let loan_key = ctx.accounts.loan.key();
        let offer = ctx.accounts.loan.offer;
        let lender = ctx.accounts.loan.lender;
        let borrower = ctx.accounts.loan.borrower;
        let mint = ctx.accounts.loan.mint;
        let amount_raw = ctx.accounts.loan.amount_raw;
        let collateral_usdc = ctx.accounts.loan.collateral_usdc;
        let claimed_by = ctx.accounts.caller.key();
        instructions::claim_collateral::handler(&mut ctx)?;
        emit_cpi!(LoanClaimed {
            loan: loan_key,
            offer,
            lender,
            borrower,
            mint,
            amount_raw,
            collateral_usdc,
            claimed_by,
        });
        Ok(())
    }
}

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint as ClassicMint, Token},
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use crate::constants::*;
use crate::errors::LocateError;
use crate::state::{Loan, Offer};

#[event_cpi]
#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CreateOffer<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lender,
        associated_token::token_program = token_2022_program,
    )]
    pub lender_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = lender,
        space = OFFER_SPACE,
        seeds = [b"offer", lender.key().as_ref(), mint.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub offer: Account<'info, Offer>,
    #[account(address = USDC_MINT @ LocateError::InvalidUsdcMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = lender,
        associated_token::mint = usdc_mint,
        associated_token::authority = lender,
        associated_token::token_program = token_program,
    )]
    pub lender_usdc: InterfaceAccount<'info, TokenAccount>,
    pub token_2022_program: Interface<'info, TokenInterface>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct CancelOffer<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    #[account(
        mut,
        has_one = lender,
        close = lender,
        seeds = [b"offer", offer.lender.as_ref(), offer.mint.as_ref(), &offer.nonce.to_le_bytes()],
        bump = offer.bump,
    )]
    pub offer: Account<'info, Offer>,
    /// CHECK: recorded lender token account. Revoke is a client instruction.
    #[account(address = offer.lender_ata)]
    pub lender_ata: UncheckedAccount<'info>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct TakeOffer<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    /// CHECK: receives the offer rent. Address checked against the offer.
    #[account(mut, address = offer.lender)]
    pub lender: UncheckedAccount<'info>,
    #[account(
        mut,
        close = lender,
        seeds = [b"offer", offer.lender.as_ref(), offer.mint.as_ref(), &offer.nonce.to_le_bytes()],
        bump = offer.bump,
    )]
    pub offer: Box<Account<'info, Offer>>,
    #[account(address = offer.mint)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, address = offer.lender_ata)]
    pub lender_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = borrower,
        associated_token::mint = mint,
        associated_token::authority = borrower,
        associated_token::token_program = token_2022_program,
    )]
    pub borrower_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = borrower,
        space = LOAN_SPACE,
        seeds = [b"loan", offer.key().as_ref()],
        bump
    )]
    pub loan: Box<Account<'info, Loan>>,
    #[account(
        init,
        payer = borrower,
        associated_token::mint = usdc_mint,
        associated_token::authority = loan,
        associated_token::token_program = token_program,
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = USDC_MINT @ LocateError::InvalidUsdcMint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = borrower,
        associated_token::token_program = token_program,
    )]
    pub borrower_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = lender,
        associated_token::token_program = token_program,
    )]
    pub lender_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: official memo program
    #[account(address = MEMO_PROGRAM_ID)]
    pub memo_program: UncheckedAccount<'info>,
    pub token_2022_program: Interface<'info, TokenInterface>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct ReturnLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        mut,
        has_one = borrower,
        close = borrower,
        seeds = [b"loan", loan.offer.as_ref()],
        bump = loan.bump,
    )]
    pub loan: Account<'info, Loan>,
    #[account(address = loan.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = borrower,
        token::token_program = token_2022_program,
    )]
    pub borrower_source: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: recorded lender
    #[account(address = loan.lender)]
    pub lender: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = borrower,
        associated_token::mint = mint,
        associated_token::authority = lender,
        associated_token::token_program = token_2022_program,
    )]
    pub lender_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = loan,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = borrower,
        associated_token::mint = usdc_mint,
        associated_token::authority = borrower,
        associated_token::token_program = token_program,
    )]
    pub borrower_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = USDC_MINT @ LocateError::InvalidUsdcMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: official memo program
    #[account(address = MEMO_PROGRAM_ID)]
    pub memo_program: UncheckedAccount<'info>,
    pub token_2022_program: Interface<'info, TokenInterface>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
pub struct ClaimCollateral<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(
        mut,
        close = borrower,
        seeds = [b"loan", loan.offer.as_ref()],
        bump = loan.bump,
    )]
    pub loan: Account<'info, Loan>,
    /// CHECK: rent destination, the borrower who paid it
    #[account(mut, address = loan.borrower)]
    pub borrower: UncheckedAccount<'info>,
    /// CHECK: recorded lender
    #[account(address = loan.lender)]
    pub lender: UncheckedAccount<'info>,
    #[account(address = loan.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = loan,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = caller,
        associated_token::mint = usdc_mint,
        associated_token::authority = lender,
        associated_token::token_program = token_program,
    )]
    pub lender_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = USDC_MINT @ LocateError::InvalidUsdcMint)]
    pub usdc_mint: Account<'info, ClassicMint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_2022_program: Interface<'info, TokenInterface>,
}
