mod common;

use common::*;
use solana_signer::Signer;

#[test]
fn t01_create_take_return() {
    let mut w = World::new();
    let before = w.amount(&w.lender_ata());
    let usdc_before = w.amount(&w.borrower_usdc());
    w.create(1);
    w.assert_invariants(1);
    w.take(1);
    w.assert_invariants(1);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    assert!(w.exists(&loan));
    assert!(!w.exists(&offer));
    w.return_loan(1);
    w.assert_invariants(1);
    assert!(!w.exists(&loan));
    assert!(w.svm.get_account(&w.vault(&loan)).is_none() || w.amount(&w.vault(&loan)) == 0);
    assert!(w.amount(&w.lender_ata()) >= before, "I9 lender tokens");
    assert_eq!(w.amount(&w.borrower_usdc()), usdc_before - FEE);
}

#[test]
fn t02_claim_after_grace() {
    let mut w = World::new();
    let lender_usdc = w.amount(&w.lender_usdc());
    w.create(1);
    w.take(1);
    w.warp(TERM + GRACE);
    w.claim(1);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    assert!(!w.exists(&loan));
    assert_eq!(w.amount(&w.lender_usdc()), lender_usdc + K + FEE);
    assert!(w.amount(&w.borrower_ata()) > 0);
}

#[test]
fn t03_early_claim() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    w.warp(TERM);
    let caller = w.lender.pubkey();
    let ix = w.claim_ix(1, &caller);
    let result = w.submit("lender", vec![ix]);
    expect_code(&result, 6015);
    let (offer, _) = w.offer_pda(1);
    assert!(w.exists(&w.loan_pda(&offer).0));
}

#[test]
fn t04_max_gross_and_short() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    let too_small = w.return_ix(1, 1);
    let result = w.submit("borrower", vec![too_small]);
    expect_code(&result, 6013);
    let gross = locate::token2022::gross_for_net(100, u64::MAX, N).unwrap();
    w.approve_return(&loan, gross);
    let data_account = w.borrower_ata();
    let mut acct = w.svm.get_account(&data_account).unwrap();
    acct.data[64..72].copy_from_slice(&1u64.to_le_bytes());
    w.svm.set_account(data_account, acct).unwrap();
    let ix = w.return_ix(1, gross);
    let result = w.submit("borrower", vec![ix]);
    assert!(!result.ok, "short delivery must fail\n{}", result.logs.join("\n"));
    assert!(w.exists(&loan));
}

#[test]
fn t05_pause_blocks_take() {
    let mut w = World::new();
    w.create(1);
    w.pause_mint();
    let ix = w.take_ix(1, N, K, FEE, TERM);
    let result = w.submit("borrower", vec![ix]);
    expect_code(&result, 6007);
}

#[test]
fn t06_pause_defers_claim() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    w.pause_mint();
    w.warp(TERM + GRACE);
    let caller = w.lender.pubkey();
    let ix = w.claim_ix(1, &caller);
    let result = w.submit("lender", vec![ix]);
    expect_code(&result, 6016);
    w.warp(7 * 24 * 60 * 60);
    w.claim(1);
}

#[test]
fn t07_hook_blocks_take_return_and_defers_claim() {
    let mut w = World::new();
    w.set_hook(Some(PROGRAM_ID));
    w.approve_offer(1, N);
    let expires = w.now + 86_400;
    let ix = w.create_ix(1, N, expires);
    let created = w.submit("lender", vec![ix]);
    expect_code(&created, 6008);
    w.set_hook(None);
    w.create(1);
    w.take(1);
    w.set_hook(Some(PROGRAM_ID));
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    let gross = locate::token2022::gross_for_net(100, u64::MAX, N).unwrap();
    w.approve_return(&loan, gross);
    let ix = w.return_ix(1, gross);
    let returned = w.submit("borrower", vec![ix]);
    expect_code(&returned, 6012);
    w.warp(TERM + GRACE);
    let caller = w.lender.pubkey();
    let ix = w.claim_ix(1, &caller);
    let claimed = w.submit("lender", vec![ix]);
    expect_code(&claimed, 6016);
}

#[test]
fn t08_fee_pending_blocks_take() {
    let mut w = World::new();
    w.create(1);
    w.schedule_fee(250);
    let ix = w.take_ix(1, N, K, FEE, TERM);
    let result = w.submit("borrower", vec![ix]);
    expect_code(&result, 6009);
}

#[test]
fn t09_revoke_blocks_take() {
    let mut w = World::new();
    w.create(1);
    w.revoke_lender();
    let ix = w.take_ix(1, N, K, FEE, TERM);
    let result = w.submit("borrower", vec![ix]);
    expect_code(&result, 6010);
}

#[test]
fn t10_second_offer_replaces_delegate() {
    let mut w = World::new();
    w.create(1);
    w.nonce = 2;
    w.create(2);
    let ix = w.take_ix(1, N, K, FEE, TERM);
    let first = w.submit("borrower", vec![ix]);
    expect_code(&first, 6010);
    w.take(2);
}

#[test]
fn t11_no_double_settlement() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    w.return_loan(1);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    let gross = locate::token2022::gross_for_net(100, u64::MAX, N).unwrap();
    let ix = w.return_ix(1, gross);
    let again = w.submit("borrower", vec![ix]);
    expect_code(&again, 3012);
    let caller = w.lender.pubkey();
    let ix = w.claim_ix(1, &caller);
    let claim = w.submit("lender", vec![ix]);
    expect_code(&claim, 3012);
    let _ = loan;
}

#[test]
fn t12_double_take_and_take_after_cancel() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let ix = w.take_ix(1, N, K, FEE, TERM);
    let second = w.submit("borrower", vec![ix]);
    assert!(!second.ok);
    let mut w = World::new();
    w.create(1);
    let ix = w.cancel_ix(1);
    w.submit_ok("lender", vec![ix]);
    let ix = w.take_ix(1, N, K, FEE, TERM);
    let taken = w.submit("borrower", vec![ix]);
    assert!(!taken.ok);
}

#[test]
fn t13_self_take() {
    let mut w = World::new();
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    let lender = w.lender.pubkey();
    ix.accounts[0] = solana_instruction::AccountMeta::new(lender, true);
    ix.accounts[1] = solana_instruction::AccountMeta::new(lender, true);
    ix.accounts[5] = solana_instruction::AccountMeta::new(w.lender_ata(), false);
    ix.accounts[9] = solana_instruction::AccountMeta::new(w.lender_usdc(), false);
    let result = w.submit("lender", vec![ix]);
    expect_code(&result, 2040);
}

#[test]
fn t14_fee_increase_mid_loan() {
    let mut w = World::new();
    let before = w.amount(&w.lender_ata());
    w.create(1);
    w.take(1);
    w.schedule_fee(250);
    w.set_clock(w.now, w.epoch + 3);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    let gross = locate::token2022::gross_for_net(250, u64::MAX, N).unwrap();
    w.approve_return(&loan, gross);
    let ix = w.return_ix(1, gross);
    w.submit_ok("borrower", vec![ix]);
    assert!(w.amount(&w.lender_ata()) >= before);
}

#[test]
fn t15_invalid_terms() {
    let mut w = World::new();
    w.approve_offer(1, N);
    let bad_term = {
        let (offer, _) = w.offer_pda(1);
        let mut data = disc("create_offer").to_vec();
        for n in [1u64, N, K, FEE] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        for n in [0i64, GRACE, w.now + 100] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        let _ = offer;
        w.create_ix(1, N, w.now + 100)
    };
    let mut ix = bad_term;
    ix.data = {
        let mut data = disc("create_offer").to_vec();
        for n in [1u64, N, K, FEE] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        for n in [0i64, GRACE, w.now + 100] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        data
    };
    expect_code(&w.submit("lender", vec![ix]), 6002);
    let zero_k = {
        let mut data = disc("create_offer").to_vec();
        for n in [1u64, N, 0, FEE] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        for n in [TERM, GRACE, w.now + 100] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        let mut ix = w.create_ix(1, N, w.now + 100);
        ix.data = data;
        ix
    };
    expect_code(&w.submit("lender", vec![zero_k]), 6002);
}

#[test]
fn t16_cancel_conserves_tokens() {
    let mut w = World::new();
    let before = w.amount(&w.lender_ata());
    w.create(1);
    let after_create = w.svm.get_balance(&w.lender.pubkey()).unwrap();
    let ix = w.cancel_ix(1);
    w.submit_ok("lender", vec![ix]);
    assert_eq!(w.amount(&w.lender_ata()), before);
    let after = w.svm.get_balance(&w.lender.pubkey()).unwrap();
    assert!(after > after_create, "offer rent returns to the lender");
}

#[test]
fn m01_compute_under_budget() {
    let mut w = World::new();
    let c = w.create(1);
    let t = w.take(1);
    let r = w.return_loan(1);
    for (name, cu) in [("create", c.cu), ("take", t.cu), ("return", r.cu)] {
        assert!(cu < 120_000, "{name} used {cu}");
        assert!(cu > 0, "{name} recorded no compute");
    }
}
