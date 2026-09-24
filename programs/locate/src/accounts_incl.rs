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
    pub offer: Account<'info, Offer>,
    #[account(address = offer.mint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, address = offer.lender_ata)]
    pub lender_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = borrower,
        associated_token::mint = mint,
        associated_token::authority = borrower,
        associated_token::token_program = token_2022_program,
    )]
    pub borrower_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = borrower,
        space = LOAN_SPACE,
        seeds = [b"loan", offer.key().as_ref()],
        bump
    )]
    pub loan: Account<'info, Loan>,
    #[account(
        init,
        payer = borrower,
        associated_token::mint = usdc_mint,
        associated_token::authority = loan,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(address = USDC_MINT @ LocateError::InvalidUsdcMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = borrower,
        associated_token::token_program = token_program,
    )]
    pub borrower_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = lender,
        associated_token::token_program = token_program,
    )]
    pub lender_usdc: InterfaceAccount<'info, TokenAccount>,
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
