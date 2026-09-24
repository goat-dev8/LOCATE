//! Deterministic vectors from the program math. The TypeScript replay must match exactly.

use std::fs;
use std::path::PathBuf;

use locate::token2022::{epoch_fee, gross_for_net};
use serde_json::json;
use solana_address::Address;

const SEED: u64 = 0x4C4F_4341_5445;

fn next(state: &mut u64) -> u64 {
    *state = state.wrapping_mul(6364136223846793005).wrapping_add(1);
    *state
}

fn address_from(state: &mut u64) -> Address {
    let mut bytes = [0u8; 32];
    for chunk in bytes.chunks_mut(8) {
        chunk.copy_from_slice(&next(state).to_le_bytes());
    }
    Address::new_from_array(bytes)
}

#[test]
fn write_cross_runtime_vectors() {
    let mut state = SEED;
    let mut lines = Vec::new();
    for i in 0..10_000 {
        let amount = next(&mut state);
        let bps = (next(&mut state) % 10_001) as u16;
        let max_fee = if next(&mut state) % 5 == 0 { next(&mut state) } else { u64::MAX };
        let fee = epoch_fee(bps, max_fee, amount).expect("fee");
        lines.push(json!({
            "family": "epoch_fee",
            "i": i,
            "bps": bps,
            "maxFee": max_fee.to_string(),
            "amount": amount.to_string(),
            "fee": fee.to_string(),
        }));
    }
    for i in 0..10_000 {
        let net = (next(&mut state) % 1_000_000_000_000) + 1;
        let bps = (next(&mut state) % 10_001) as u16;
        let max_fee = if next(&mut state) % 4 == 0 { next(&mut state) % 1_000_000_000 + 1 } else { u64::MAX };
        let gross = gross_for_net(bps, max_fee, net).ok();
        lines.push(json!({
            "family": "gross_for_net",
            "i": i,
            "bps": bps,
            "maxFee": max_fee.to_string(),
            "net": net.to_string(),
            "gross": gross.map(|n| n.to_string()),
        }));
    }
    for i in 0..10_000 {
        let start = (next(&mut state) % 2_000_000_000) as i64;
        let term = (next(&mut state) % 5_184_000) as i64;
        let grace = (next(&mut state) % 604_800) as i64;
        let maturity = start.checked_add(term);
        let claim_after = maturity.and_then(|m| m.checked_add(grace));
        lines.push(json!({
            "family": "schedule",
            "i": i,
            "start": start.to_string(),
            "term": term.to_string(),
            "grace": grace.to_string(),
            "maturity": maturity.map(|n| n.to_string()),
            "claimAfter": claim_after.map(|n| n.to_string()),
        }));
    }
    for i in 0..10_000 {
        let collateral = next(&mut state) % (u64::MAX / 2);
        let fee = next(&mut state) % (u64::MAX / 2);
        let sum = collateral.checked_add(fee);
        lines.push(json!({
            "family": "collateral",
            "i": i,
            "collateral": collateral.to_string(),
            "fee": fee.to_string(),
            "sum": sum.map(|n| n.to_string()),
        }));
    }
    let program = locate::ID;
    for i in 0..5_000 {
        let lender = address_from(&mut state);
        let mint = address_from(&mut state);
        let nonce = next(&mut state);
        let (offer, _) = Address::find_program_address(
            &[b"offer", lender.as_ref(), mint.as_ref(), &nonce.to_le_bytes()],
            &program,
        );
        let (loan, _) = Address::find_program_address(&[b"loan", offer.as_ref()], &program);
        lines.push(json!({
            "family": "pda",
            "i": i,
            "lender": lender.to_string(),
            "mint": mint.to_string(),
            "nonce": nonce.to_string(),
            "offer": offer.to_string(),
            "loan": loan.to_string(),
        }));
    }
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../proof/replay");
    fs::create_dir_all(&dir).unwrap();
    let body = lines.iter().map(|line| line.to_string()).collect::<Vec<_>>().join("\n") + "\n";
    fs::write(dir.join("vectors.jsonl"), body).unwrap();
    fs::write(
        dir.join("manifest.json"),
        serde_json::to_string_pretty(&json!({
            "seed": SEED.to_string(),
            "total": lines.len(),
            "families": {
                "epoch_fee": 10000,
                "gross_for_net": 10000,
                "schedule": 10000,
                "collateral": 10000,
                "pda": 5000
            },
            "programId": program.to_string(),
        })).unwrap(),
    ).unwrap();
    assert_eq!(lines.len(), 45_000);
}
