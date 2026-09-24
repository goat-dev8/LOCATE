use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{
        BaseStateWithExtensions, ExtensionType, StateWithExtensions,
        pausable::PausableConfig,
        transfer_fee::TransferFeeConfig,
        transfer_hook::TransferHook,
    },
    state::Mint as SplMint,
};

use crate::errors::LocateError;

pub struct MintFlags {
    pub decimals: u8,
    pub paused: bool,
    pub hook_set: bool,
    pub non_transferable: bool,
    pub fee_bps: u16,
    pub max_fee: u64,
    pub fee_pending: bool,
    pub has_fee_config: bool,
}

pub fn read_mint_flags(mint_data: &[u8], epoch: u64) -> Result<MintFlags> {
    let state = StateWithExtensions::<SplMint>::unpack(mint_data).map_err(|_| LocateError::InvalidMint)?;
    let types = state.get_extension_types().map_err(|_| LocateError::InvalidMint)?;
    let non_transferable = types.iter().any(|t| *t == ExtensionType::NonTransferable);

    let paused = match state.get_extension::<PausableConfig>() {
        Ok(p) => bool::from(p.paused),
        Err(_) => false,
    };

    let hook_set = match state.get_extension::<TransferHook>() {
        Ok(hook) => hook.program_id.0 != Pubkey::default(),
        Err(_) => false,
    };

    let (fee_bps, max_fee, fee_pending, has_fee_config) = match state.get_extension::<TransferFeeConfig>() {
        Ok(cfg) => {
            let newer_epoch = u64::from(cfg.newer_transfer_fee.epoch);
            let pending = newer_epoch > epoch;
            let active = cfg.get_epoch_fee(epoch);
            (
                u16::from(active.transfer_fee_basis_points),
                u64::from(active.maximum_fee),
                pending,
                true,
            )
        }
        Err(_) => (0u16, 0u64, false, false),
    };

    Ok(MintFlags {
        decimals: state.base.decimals,
        paused,
        hook_set,
        non_transferable,
        fee_bps,
        max_fee,
        fee_pending,
        has_fee_config,
    })
}

pub fn epoch_fee(bps: u16, max_fee: u64, amount: u64) -> Result<u64> {
    if bps == 0 || amount == 0 {
        return Ok(0);
    }
    let raw = (amount as u128)
        .checked_mul(bps as u128)
        .ok_or(LocateError::MathOverflow)?
        .checked_add(9_999)
        .ok_or(LocateError::MathOverflow)?
        / 10_000;
    let fee = u64::try_from(raw).map_err(|_| LocateError::MathOverflow)?;
    Ok(fee.min(max_fee))
}

/// Smallest gross such that `gross - fee(gross) >= net`, or MathOverflow.
pub fn gross_for_net(bps: u16, max_fee: u64, net: u64) -> Result<u64> {
    if net == 0 {
        return err!(LocateError::MathOverflow);
    }
    if bps == 0 {
        return Ok(net);
    }
    if bps > 10_000 {
        return err!(LocateError::MathOverflow);
    }

    if bps == 10_000 {
        if max_fee == u64::MAX {
            return err!(LocateError::MathOverflow);
        }
        let gross = net.checked_add(max_fee).ok_or(LocateError::MathOverflow)?;
        let fee = epoch_fee(bps, max_fee, gross)?;
        let got = gross.checked_sub(fee).ok_or(LocateError::MathOverflow)?;
        if got >= net {
            return Ok(gross);
        }
        return err!(LocateError::MathOverflow);
    }

    let denom = 10_000u128 - u128::from(bps);
    let inverse = (u128::from(net))
        .checked_mul(u128::from(bps))
        .ok_or(LocateError::MathOverflow)?
        .checked_add(denom - 1)
        .ok_or(LocateError::MathOverflow)?
        / denom;
    let inverse_u = u64::try_from(inverse).map_err(|_| LocateError::MathOverflow)?;

    let mut gross = if inverse_u > max_fee {
        net.checked_add(max_fee).ok_or(LocateError::MathOverflow)?
    } else {
        net.checked_add(inverse_u).ok_or(LocateError::MathOverflow)?
    };

    let mut found = false;
    for _ in 0..3 {
        let fee = epoch_fee(bps, max_fee, gross)?;
        let got = gross.checked_sub(fee).ok_or(LocateError::MathOverflow)?;
        if got >= net {
            found = true;
            break;
        }
        gross = gross.checked_add(1).ok_or(LocateError::MathOverflow)?;
    }
    if !found {
        return err!(LocateError::MathOverflow);
    }

    while gross > net {
        let prev = gross - 1;
        let fee = epoch_fee(bps, max_fee, prev)?;
        let got = prev.checked_sub(fee).ok_or(LocateError::MathOverflow)?;
        if got >= net {
            gross = prev;
        } else {
            break;
        }
        if net + 8 < gross {
            break;
        }
    }
    Ok(gross)
}

pub fn is_fee_pending(newer_epoch: u64, current_epoch: u64) -> bool {
    newer_epoch > current_epoch
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_bps_is_identity() {
        assert_eq!(gross_for_net(0, u64::MAX, 2_018_660).unwrap(), 2_018_660);
    }

    #[test]
    fn hundred_bps_edges() {
        let max = u64::MAX;
        for n in [1u64, 99, 100, 101, 2_018_660] {
            let g = gross_for_net(100, max, n).unwrap();
            let fee = epoch_fee(100, max, g).unwrap();
            assert!(g - fee >= n, "n={n} g={g} fee={fee}");
            if g > 1 {
                let prev_fee = epoch_fee(100, max, g - 1).unwrap();
                assert!(g - 1 - prev_fee < n, "not minimal n={n} g={g}");
            }
        }
    }

    #[test]
    fn ten_thousand_bps_fails_closed_when_uncapped() {
        assert!(gross_for_net(10_000, u64::MAX, 100).is_err());
    }

    #[test]
    fn max_fee_cap_still_delivers() {
        let g = gross_for_net(100, 1, 100).unwrap();
        let fee = epoch_fee(100, 1, g).unwrap();
        assert_eq!(fee, 1);
        assert!(g - fee >= 100);
    }

    #[test]
    fn fee_pending_boundaries() {
        assert!(!is_fee_pending(1039, 1039));
        assert!(!is_fee_pending(1039, 1041));
        assert!(is_fee_pending(1039, 1038));
    }
}
