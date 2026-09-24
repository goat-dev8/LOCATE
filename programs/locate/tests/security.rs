mod common;

use common::*;
use solana_instruction::AccountMeta;
use solana_keypair::Keypair;
use solana_signer::Signer;
use spl_token_2022_interface::extension::cpi_guard::instruction::enable_cpi_guard;
use spl_token_2022_interface::extension::memo_transfer::instruction::enable_required_transfer_memos;
use spl_token_2022_interface::extension::transfer_fee::TransferFeeConfig;
use spl_token_2022_interface::extension::{BaseStateWithExtensions, StateWithExtensions};
use spl_token_2022_interface::extension::ExtensionType;
use spl_token_2022_interface::instruction::{
    burn_checked, close_account, reallocate, set_authority, transfer_checked, AuthorityType,
};
use spl_token_interface::instruction::{close_account as close_classic, transfer as transfer_classic};
use spl_token_2022_interface::state::Mint as Mint2022;

#[test]
fn s01_substituted_vault_is_rejected() {
    let mut w = World::new();
    w.create(1);
    for index in [3usize, 4, 6, 7] {
        let mut ix = w.take_ix(1, N, K, FEE, TERM);
        let fake = Keypair::new().pubkey();
        ix.accounts[index] = if ix.accounts[index].is_writable {
            AccountMeta::new(fake, false)
        } else {
            AccountMeta::new_readonly(fake, false)
        };
        let result = w.submit("borrower", vec![ix]);
        assert!(!result.ok, "index {index}: {}", result.detail);
    }
}

#[test]
fn s02_fake_usdc_is_rejected() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    ix.accounts[8] = AccountMeta::new_readonly(Keypair::new().pubkey(), false);
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn s03_third_party_return_source_is_rejected() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let mut ix = w.return_ix(1, N * 2);
    ix.accounts[3] = AccountMeta::new(w.lender_ata(), false);
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn s04_return_without_delegation_reverts() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let result = w.submit("borrower", vec![w.return_ix(1, N * 2)]);
    assert!(!result.ok, "{}", result.detail);
    let (offer, _) = w.offer_pda(1);
    assert!(w.exists(&w.loan_pda(&offer).0));
}

#[test]
fn s05_cpi_guard_still_completes() {
    let mut w = World::new();
    let lender_ata = w.lender_ata();
    let lender = w.lender.pubkey();
    let grow = reallocate(&TOKEN_2022, &lender_ata, &lender, &lender, &[], &[ExtensionType::CpiGuard]).unwrap();
    w.submit_ok("lender", vec![grow]);
    let ix = enable_cpi_guard(&TOKEN_2022, &lender_ata, &lender, &[]).unwrap();
    w.submit_ok("lender", vec![ix]);
    w.create(1);
    w.take(1);
    let borrower_ata = w.borrower_ata();
    let borrower = w.borrower.pubkey();
    let grow = reallocate(&TOKEN_2022, &borrower_ata, &borrower, &borrower, &[], &[ExtensionType::CpiGuard]).unwrap();
    w.submit_ok("borrower", vec![grow]);
    let ix = enable_cpi_guard(&TOKEN_2022, &borrower_ata, &borrower, &[]).unwrap();
    w.submit_ok("borrower", vec![ix]);
    w.return_loan(1);
}

#[test]
fn s06_closed_lender_ata_is_recreated_on_return() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let from = w.lender_ata();
    let to = w.borrower_ata();
    let mint = w.mint.pubkey();
    let owner = w.lender.pubkey();
    let amount = w.amount(&from);
    let move_ix = transfer_checked(&TOKEN_2022, &from, &mint, &to, &owner, &[], amount, 9).unwrap();
    w.submit_ok("lender", vec![move_ix]);
    let close_ix = close_account(&TOKEN_2022, &from, &owner, &owner, &[]).unwrap();
    w.submit_ok("lender", vec![close_ix]);
    let before = w.svm.get_account(&from);
    assert!(before.is_none() || before.unwrap().data.is_empty());
    w.return_loan(1);
    assert!(w.amount(&w.lender_ata()) >= N);
}

#[test]
fn s09_closed_lender_usdc_is_recreated_on_claim() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let from = w.lender_usdc();
    let to = w.borrower_usdc();
    let owner = w.lender.pubkey();
    let amount = w.amount(&from);
    let move_ix = transfer_classic(&TOKEN_CLASSIC, &from, &to, &owner, &[], amount).unwrap();
    w.submit_ok("lender", vec![move_ix]);
    let close_ix = close_classic(&TOKEN_CLASSIC, &from, &owner, &owner, &[]).unwrap();
    w.submit_ok("lender", vec![close_ix]);
    w.warp(TERM + GRACE);
    w.claim(1);
    assert!(w.amount(&w.lender_usdc()) >= K);
}

#[test]
fn s07_memo_requirement_still_returns() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let lender_ata = w.lender_ata();
    let lender = w.lender.pubkey();
    let grow = reallocate(&TOKEN_2022, &lender_ata, &lender, &lender, &[], &[ExtensionType::MemoTransfer]).unwrap();
    w.submit_ok("lender", vec![grow]);
    let ix = enable_required_transfer_memos(&TOKEN_2022, &lender_ata, &lender, &[]).unwrap();
    w.submit_ok("lender", vec![ix]);
    w.return_loan(1);
}

#[test]
fn s08_ata_owner_change_fails() {
    let mut w = World::new();
    let ata = w.lender_ata();
    let owner = w.lender.pubkey();
    let ix = set_authority(
        &TOKEN_2022,
        &ata,
        Some(&w.borrower.pubkey()),
        AuthorityType::AccountOwner,
        &owner,
        &[],
    )
    .unwrap();
    let result = w.submit("lender", vec![ix]);
    assert!(!result.ok, "immutable owner must reject SetAuthority: {}", result.detail);
}

#[test]
fn s10_fee_change_is_at_least_two_epochs_out() {
    let mut w = World::new();
    w.schedule_fee(250);
    let data = w.svm.get_account(&w.mint.pubkey()).unwrap().data;
    let state = StateWithExtensions::<Mint2022>::unpack(&data).unwrap();
    let cfg = state.get_extension::<TransferFeeConfig>().unwrap();
    let newer = u64::from(cfg.newer_transfer_fee.epoch);
    assert!(newer >= w.epoch + 2, "newer epoch {newer} current {}", w.epoch);
}

#[test]
fn s12_stale_terms_are_rejected() {
    let mut w = World::new();
    w.create(1);
    let result = w.submit("borrower", vec![w.take_ix(1, N + 1, K, FEE, TERM)]);
    expect_code(&result, 6005);
}

#[test]
fn s13_extreme_amount_does_not_panic() {
    let mut w = World::new();
    w.approve_offer(1, u64::MAX);
    let ix = w.create_ix(1, u64::MAX, w.now + 100);
    let result = w.submit("lender", vec![ix]);
    assert!(!result.ok, "{}", result.detail);
}

#[test]
fn s14_permanent_delegate_burn_then_claim() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let ata = w.borrower_ata();
    let mint = w.mint.pubkey();
    let issuer = w.issuer.pubkey();
    let amount = w.amount(&ata);
    let ix = burn_checked(&TOKEN_2022, &ata, &mint, &issuer, &[], amount, 9).unwrap();
    w.submit_ok("issuer", vec![ix]);
    w.warp(TERM + GRACE);
    let before = w.amount(&w.lender_usdc());
    w.claim(1);
    assert!(w.amount(&w.lender_usdc()) >= before + K);
}

#[test]
fn s11_same_nonce_cannot_be_taken_twice_while_loan_is_open() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    w.approve_offer(1, N);
    w.submit_ok("lender", vec![w.create_ix(1, N, w.now + 100)]);
    let second = w.submit("borrower", vec![w.take_ix(1, N, K, FEE, TERM)]);
    assert!(!second.ok, "loan pda is still open: {}", second.detail);
    w.return_loan(1);
    w.take(1);
}
