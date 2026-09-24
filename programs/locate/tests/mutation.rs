mod common;

use common::*;
use solana_instruction::AccountMeta;
use solana_keypair::Keypair;
use solana_signer::Signer;

fn mutate_byte(data: &mut [u8], index: usize) {
    data[index] ^= 0xff;
}

#[test]
fn m01_flipped_create_discriminator_is_rejected() {
    let mut w = World::new();
    w.approve_offer(1, N);
    let mut ix = w.create_ix(1, N, w.now + 86_400);
    mutate_byte(&mut ix.data, 0);
    let result = w.submit("lender", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn m02_flipped_take_discriminator_is_rejected() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    mutate_byte(&mut ix.data, 0);
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn m03_take_amount_byte_flip_is_rejected() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    mutate_byte(&mut ix.data, 8);
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn m04_take_collateral_byte_flip_is_rejected() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    mutate_byte(&mut ix.data, 16);
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn m05_truncated_take_data_is_rejected() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    ix.data.truncate(8);
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn m06_return_max_gross_zero_is_rejected() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    w.approve_return(&loan, N * 2);
    let result = w.submit("borrower", vec![w.return_ix(1, 0)]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn m07_claim_before_maturity_is_rejected() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let caller = w.lender.pubkey();
    let result = w.submit("lender", vec![w.claim_ix(1, &caller)]);
    expect_code(&result, 6015);
}

#[test]
fn m08_borrower_cannot_sign_create() {
    let mut w = World::new();
    w.approve_offer(1, N);
    let ix = w.create_ix(1, N, w.now + 86_400);
    let panicked = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| w.submit("borrower", vec![ix])));
    match panicked {
        Err(_) => {}
        Ok(result) => assert!(!result.ok, "{}", result.detail),
    }
}

#[test]
fn m09_stranger_cannot_take_as_borrower() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    let stranger = Keypair::new();
    ix.accounts[0] = AccountMeta::new(stranger.pubkey(), true);
    w.svm.airdrop(&stranger.pubkey(), 10_000_000_000).unwrap();
    let result = w.send(&stranger, vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn m10_wrong_program_id_does_not_land() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    ix.program_id = Keypair::new().pubkey();
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}
