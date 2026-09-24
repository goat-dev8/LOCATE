use anchor_lang::prelude::*;

#[error_code]
pub enum LocateError {
    #[msg("Unsupported token")]
    InvalidMint,
    #[msg("Wrong USDC mint")]
    InvalidUsdcMint,
    #[msg("Terms out of range")]
    InvalidTerms,
    #[msg("Use your main token account")]
    InvalidLenderAccount,
    #[msg("Offer expired")]
    OfferExpired,
    #[msg("Offer changed — refresh")]
    TermsMismatch,
    #[msg("You can't take your own offer")]
    SelfTakeNotAllowed,
    #[msg("Token transfers are paused by the issuer")]
    TakeRefusedPaused,
    #[msg("Token has an active transfer hook")]
    TakeRefusedHook,
    #[msg("Issuer scheduled a fee change — wait")]
    TakeRefusedFeePending,
    #[msg("Lender no longer has the tokens or approval")]
    TakeRefusedUnfunded,
    #[msg("Paused — your claim deadline is extended")]
    ReturnRefusedPaused,
    #[msg("Hook active — claim deadline extended")]
    ReturnRefusedHook,
    #[msg("Fee rose — approve a higher amount")]
    ReturnExceedsMaxGross,
    #[msg("Not enough tokens delivered")]
    ReturnRefusedShortDelivery,
    #[msg("Not claimable yet")]
    ClaimRefusedNotMatured,
    #[msg("Deferred while the token is paused or hooked")]
    ClaimDeferredPaused,
    #[msg("Amount too large")]
    MathOverflow,
    #[msg("Not your offer or loan")]
    Unauthorized,
}
