use anchor_lang::prelude::*;

use crate::state::Offer;

pub fn handler(ctx: &mut Context<crate::CancelOffer>) -> Result<()> {
    let _offer = &ctx.accounts.offer;
    Ok(())
}
