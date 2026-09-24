use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke};

use crate::constants::MEMO_PROGRAM_ID;
use crate::errors::LocateError;

pub fn emit_memo<'info>(memo_program: &AccountInfo<'info>, text: &str) -> Result<()> {
    require_keys_eq!(memo_program.key(), MEMO_PROGRAM_ID, LocateError::InvalidMint);
    let ix = Instruction {
        program_id: memo_program.key(),
        accounts: vec![],
        data: text.as_bytes().to_vec(),
    };
    invoke(&ix, &[memo_program.clone()]).map_err(|_| error!(LocateError::MathOverflow))?;
    Ok(())
}
