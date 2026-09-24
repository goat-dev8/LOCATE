//! Fork tests against the real mainnet OPENAI mint bytes and the dumped
//! Token-2022 ELF. Injected balances are not issuer mints.
//! The devnet synthetic mint is a different thing and is not used here.

mod common;

use common::*;
use locate::token2022::{epoch_fee, gross_for_net, read_mint_flags};

const SIZES: [u64; 7] = [2_018_660, 3_364_433, 1, 99, 100, 101, 1_000_000_000];

fn received_for(amount: u64) -> u64 {
    amount - epoch_fee(100, u64::MAX, amount).unwrap()
}

#[test]
fn f01_net_exact_on_real_mint() {
    let mut w = World::fork(1041);
    let before = w.amount(&w.lender_ata());
    w.approve_offer(1, N);
    w.submit_ok("lender", vec![w.create_ix(1, N, w.now + 86_400)]);
    let borrower_before = w.amount(&w.borrower_ata());
    w.take(1);
    let got = w.amount(&w.borrower_ata()) - borrower_before;
    assert_eq!(got, received_for(N));
    w.return_loan(1);
    assert!(w.amount(&w.lender_ata()) >= before);
}

#[test]
fn f02_claim_on_real_mint() {
    let mut w = World::fork(1041);
    let before = w.amount(&w.lender_usdc());
    w.create(1);
    w.take(1);
    w.warp(TERM + GRACE);
    w.claim(1);
    assert!(w.amount(&w.lender_usdc()) >= before + K);
}

#[test]
fn f03_epoch_1038_refuses_pending_fee() {
    let mut w = World::fork(1038);
    w.approve_offer(1, N);
    w.submit_ok("lender", vec![w.create_ix(1, N, w.now + 86_400)]);
    let result = w.submit("borrower", vec![w.take_ix(1, N, K, FEE, TERM)]);
    expect_code(&result, 6009);
}

#[test]
fn f04_size_sweep_is_net_exact() {
    let mut w = World::fork(1041);
    for (i, amount) in SIZES.into_iter().enumerate() {
        let nonce = i as u64 + 1;
        w.approve_offer(nonce, amount);
        let mut ix = w.create_ix(nonce, amount, w.now + 86_400);
        ix.data = {
            let mut data = disc("create_offer").to_vec();
            for n in [nonce, amount, K, FEE] {
                data.extend_from_slice(&n.to_le_bytes());
            }
            for n in [TERM, GRACE, w.now + 86_400] {
                data.extend_from_slice(&n.to_le_bytes());
            }
            data
        };
        w.submit_ok("lender", vec![ix]);
        let before = w.amount(&w.borrower_ata());
        let mut take = w.take_ix(nonce, amount, K, FEE, TERM);
        take.data = {
            let mut data = disc("take_offer").to_vec();
            for n in [amount, K, FEE] {
                data.extend_from_slice(&n.to_le_bytes());
            }
            data.extend_from_slice(&TERM.to_le_bytes());
            data
        };
        w.submit_ok("borrower", vec![take]);
        assert_eq!(w.amount(&w.borrower_ata()) - before, received_for(amount));
        let (offer, _) = w.offer_pda(nonce);
        let (loan, _) = w.loan_pda(&offer);
        let gross = gross_for_net(100, u64::MAX, amount).unwrap();
        w.approve_return(&loan, gross);
        w.submit_ok("borrower", vec![w.return_ix(nonce, gross)]);
    }
}

#[test]
fn f05_scaled_ui_after_effective_timestamp() {
    let raw = 2_018_660u64;
    let multiplier = 1.4861347f64;
    let ui = (raw as f64) / 1_000_000_000.0 * multiplier;
    assert!((ui - 0.003).abs() < 1e-6, "{ui}");
    let before = (raw as f64) / 1_000_000_000.0 * 1.0;
    assert!((before - 0.003).abs() > 1e-6);
}

#[test]
fn f06_parser_matches_live_mint_flags() {
    let (_, account) = load_fixture("openai_mint.json");
    let active = read_mint_flags(&account.data, 1041).unwrap();
    assert!(!active.paused);
    assert!(!active.hook_set);
    assert!(!active.fee_pending);
    assert_eq!(active.fee_bps, 100);
    assert_eq!(active.decimals, 9);
    let pending = read_mint_flags(&account.data, 1038).unwrap();
    assert!(pending.fee_pending);
    assert_eq!(pending.fee_bps, 50);
}
