//! Cloned mainnet mint bytes, executed locally in LiteSVM.
//! This is not a mainnet transaction.

mod common;

use std::fs;
use std::path::PathBuf;

use common::*;
use locate::token2022::{gross_for_net, read_mint_flags};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use solana_instruction::AccountMeta;
use solana_keypair::Keypair;
use solana_signer::Signer;
use spl_token_2022_interface::extension::pausable::PausableConfig;
use spl_token_2022_interface::extension::{BaseStateWithExtensionsMut, StateWithExtensionsMut};
use spl_token_2022_interface::instruction::{close_account, transfer_checked};
use spl_token_2022_interface::state::Mint as Mint2022;

fn proof_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../proof/mainnet-fork")
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

fn program_hash() -> String {
    let so = std::env::var("LOCATE_SO").unwrap_or_else(|_| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../target/deploy/locate.so")
            .to_string_lossy()
            .to_string()
    });
    let bytes = fs::read(&so).unwrap_or_else(|e| panic!("read {so}: {e}"));
    sha256_hex(&bytes)
}

fn fixture_meta(name: &str) -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/mainnet")
        .join(name);
    let doc: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
    json!({
        "file": name,
        "pubkey": doc["pubkey"],
        "owner": doc["owner"],
        "lamports": doc["lamports"],
        "slot": doc["slot"],
        "sha256": doc["sha256"],
        "bytes": doc["bytes"],
        "executable": doc["executable"],
    })
}

fn flags_of(w: &World) -> Value {
    let acct = w.svm.get_account(&w.mint_id).expect("mint");
    let flags = read_mint_flags(&acct.data, w.epoch).expect("flags");
    json!({
        "paused": flags.paused,
        "hookSet": flags.hook_set,
        "feeBps": flags.fee_bps,
        "maxFee": flags.max_fee.to_string(),
        "feePending": flags.fee_pending,
        "decimals": flags.decimals,
    })
}

fn return_live(w: &mut World, nonce: u64) {
    let (bps, max_fee) = w.live_fee();
    let gross = gross_for_net(bps, max_fee, N).expect("gross");
    let (offer, _) = w.offer_pda(nonce);
    let (loan, _) = w.loan_pda(&offer);
    w.approve_return(&loan, gross);
    w.submit_ok("borrower", vec![w.return_ix(nonce, gross)]);
}

fn force_paused(w: &mut World) {
    let mint = w.mint_id;
    let mut acct = w.svm.get_account(&mint).expect("mint");
    {
        let mut state = StateWithExtensionsMut::<Mint2022>::unpack(&mut acct.data).expect("unpack");
        let pausable = state.get_extension_mut::<PausableConfig>().expect("pausable");
        pausable.paused = true.into();
    }
    w.svm.set_account(mint, acct).unwrap();
}

struct Row {
    id: String,
    mint: String,
    expected: String,
    ok: bool,
    code: Option<u32>,
    detail: String,
    evidence: Value,
}

fn row(id: &str, mint: &str, expected: &str, result: &IxResult, evidence: Value, passed: bool) -> Row {
    Row {
        id: id.to_string(),
        mint: mint.to_string(),
        expected: expected.to_string(),
        ok: passed,
        code: result.code,
        detail: if result.detail.is_empty() {
            result.logs.last().cloned().unwrap_or_default()
        } else {
            result.detail.clone()
        },
        evidence,
    }
}

fn openai_lifecycle() -> (Value, Vec<Row>) {
    let mut w = World::fork(1041);
    let lender = w.lender_ata();
    let borrower = w.borrower_ata();
    let lender_usdc = w.lender_usdc();
    let borrower_usdc = w.borrower_usdc();
    let before_lender = w.amount(&lender);
    let before_borrower = w.amount(&borrower);
    let before_borrower_usdc = w.amount(&borrower_usdc);
    w.create(1);
    let create_ok = w.exists(&w.offer_pda(1).0);
    let take = w.take(1);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    let vault = w.vault(&loan);
    let after_take_borrower = w.amount(&borrower);
    let after_take_lender = w.amount(&lender);
    let vault_after_take = w.amount(&vault);
    return_live(&mut w, 1);
    let after_return_lender = w.amount(&lender);
    let after_return_borrower_usdc = w.amount(&borrower_usdc);
    let loan_closed = !w.exists(&loan);
    let second = w.submit("borrower", vec![w.return_ix(1, N * 2)]);
    let (bps, _) = w.live_fee();
    let net = N - locate::token2022::epoch_fee(bps, u64::MAX, N).unwrap();
    let delivered = after_take_borrower - before_borrower;
    let passed = create_ok
        && take.ok
        && delivered == net
        && after_return_lender >= before_lender
        && after_return_borrower_usdc == before_borrower_usdc - FEE
        && loan_closed
        && !second.ok
        && vault_after_take == K;
    let body = json!({
        "label": "Cloned Mainnet State — Local Execution",
        "mint": "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
        "epoch": 1041,
        "flags": flags_of(&w),
        "passed": passed,
        "balances": {
            "lenderTokenBefore": before_lender.to_string(),
            "lenderTokenAfterTake": after_take_lender.to_string(),
            "lenderTokenAfterReturn": after_return_lender.to_string(),
            "borrowerTokenBefore": before_borrower.to_string(),
            "borrowerTokenAfterTake": after_take_borrower.to_string(),
            "deliveredRaw": delivered.to_string(),
            "requiredNetRaw": net.to_string(),
            "vaultAfterTake": vault_after_take.to_string(),
            "borrowerUsdcBefore": before_borrower_usdc.to_string(),
            "borrowerUsdcAfterReturn": after_return_borrower_usdc.to_string(),
            "loanClosed": loan_closed,
            "secondReturnRefused": !second.ok,
            "secondReturnCode": second.code,
        }
    });
    let rows = vec![
        Row {
            id: "01-happy-create".into(),
            mint: "OPENAI".into(),
            expected: "offer account exists".into(),
            ok: create_ok,
            code: None,
            detail: String::new(),
            evidence: json!({"offerExists": create_ok}),
        },
        Row {
            id: "02-happy-take".into(),
            mint: "OPENAI".into(),
            expected: "borrower receives net amount and vault holds collateral only".into(),
            ok: take.ok && delivered == net && vault_after_take == K,
            code: take.code,
            detail: take.detail.clone(),
            evidence: json!({"delivered": delivered.to_string(), "net": net.to_string(), "vault": vault_after_take.to_string()}),
        },
        Row {
            id: "03-happy-return".into(),
            mint: "OPENAI".into(),
            expected: "lender token position restored and borrower USDC returned minus fee".into(),
            ok: after_return_lender >= before_lender && after_return_borrower_usdc == before_borrower_usdc - FEE && loan_closed,
            code: None,
            detail: String::new(),
            evidence: json!({"lenderAfter": after_return_lender.to_string(), "borrowerUsdcAfter": after_return_borrower_usdc.to_string()}),
        },
        row("15-replay-return", "OPENAI", "second return fails", &second, json!({"loanClosed": loan_closed}), !second.ok),
    ];
    let _ = lender_usdc;
    (body, rows)
}

fn openai_claim() -> (Value, Vec<Row>) {
    let mut w = World::fork(1041);
    let lender_usdc = w.lender_usdc();
    let before = w.amount(&lender_usdc);
    w.create(1);
    w.take(1);
    w.warp(TERM);
    let early = w.submit("lender", vec![w.claim_ix(1, &w.lender.pubkey())]);
    w.warp(GRACE);
    let claim = w.claim(1);
    let after = w.amount(&lender_usdc);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    let closed = !w.exists(&loan);
    let again = w.submit("lender", vec![w.claim_ix(1, &w.lender.pubkey())]);
    let back = w.submit("borrower", vec![w.return_ix(1, N * 2)]);
    let passed = !early.ok && early.code == Some(6015) && claim.ok && after == before + K + FEE && closed && !again.ok && !back.ok;
    let body = json!({
        "label": "Cloned Mainnet State — Local Execution",
        "mint": "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
        "epoch": 1041,
        "passed": passed,
        "earlyClaimCode": early.code,
        "claimOk": claim.ok,
        "lenderUsdcBefore": before.to_string(),
        "lenderUsdcAfter": after.to_string(),
        "delta": (after - before).to_string(),
        "loanClosed": closed,
        "secondClaimRefused": !again.ok,
        "returnAfterClaimRefused": !back.ok,
        "secondClaimCode": again.code,
        "returnAfterClaimCode": back.code,
    });
    let rows = vec![
        Row {
            id: "04-happy-claim".into(),
            mint: "OPENAI".into(),
            expected: "lender USDC increases by collateral plus fee and loan closes".into(),
            ok: claim.ok && after == before + K + FEE && closed,
            code: claim.code,
            detail: claim.detail.clone(),
            evidence: json!({"before": before.to_string(), "after": after.to_string()}),
        },
        row("05-early-claim", "OPENAI", "code 6015", &early, json!({}), !early.ok && early.code == Some(6015)),
        row("14-double-settlement", "OPENAI", "return after claim fails", &back, json!({"secondClaimCode": again.code}), !again.ok && !back.ok),
    ];
    (body, rows)
}

fn substitute(id: &str, index: usize) -> Row {
    let mut w = World::fork(1041);
    w.create(1);
    let mut ix = w.take_ix(1, N, K, FEE, TERM);
    let key = Keypair::new().pubkey();
    ix.accounts[index] = if ix.accounts[index].is_writable {
        AccountMeta::new(key, false)
    } else {
        AccountMeta::new_readonly(key, false)
    };
    let result = w.submit("borrower", vec![ix]);
    row(
        id,
        "OPENAI",
        "take refused",
        &result,
        json!({"substitutedIndex": index, "code": result.code}),
        !result.ok,
    )
}

fn failure_rows() -> Vec<Row> {
    let mut rows = Vec::new();

    let mut paused = World::fork(1041);
    paused.create(1);
    force_paused(&mut paused);
    let paused_take = paused.submit("borrower", vec![paused.take_ix(1, N, K, FEE, TERM)]);
    rows.push(row(
        "06-paused-mint",
        "OPENAI",
        "code 6007 after pausable flag is set on the cloned mint",
        &paused_take,
        json!({"note": "pause bit flipped on a copy of the mainnet mint bytes; issuer key was not used"}),
        !paused_take.ok && paused_take.code == Some(6007),
    ));

    let mut pending = World::fork(1038);
    pending.approve_offer(1, N);
    pending.submit_ok("lender", vec![pending.create_ix(1, N, pending.now + 86_400)]);
    let fee = pending.submit("borrower", vec![pending.take_ix(1, N, K, FEE, TERM)]);
    rows.push(row(
        "07-changed-transfer-fee",
        "OPENAI",
        "code 6009 at epoch 1038 while newer fee is still pending on the real mint",
        &fee,
        flags_of(&pending),
        !fee.ok && fee.code == Some(6009),
    ));

    rows.push(substitute("08-wrong-input-mint", 3));
    rows.push(substitute("09-wrong-usdc-mint", 8));
    rows.push(substitute("10-wrong-collateral-vault", 7));

    let mut wrong_lender = World::fork(1041);
    wrong_lender.create(1);
    let mut ix = wrong_lender.take_ix(1, N, K, FEE, TERM);
    ix.accounts[1] = AccountMeta::new(Keypair::new().pubkey(), false);
    let lender_result = wrong_lender.submit("borrower", vec![ix]);
    rows.push(row(
        "11-wrong-lender",
        "OPENAI",
        "take refused",
        &lender_result,
        json!({}),
        !lender_result.ok,
    ));

    let mut closed = World::fork(1041);
    closed.create(1);
    closed.take(1);
    let from = closed.lender_ata();
    let to = closed.borrower_ata();
    let amount = closed.amount(&from);
    let move_ix = transfer_checked(&TOKEN_2022, &from, &closed.mint_id, &to, &closed.lender.pubkey(), &[], amount, 9).unwrap();
    closed.submit_ok("lender", vec![move_ix]);
    let close_ix = close_account(&TOKEN_2022, &from, &closed.lender.pubkey(), &closed.lender.pubkey(), &[]).unwrap();
    let closed_result = closed.submit("lender", vec![close_ix]);
    let ata_gone = closed.svm.get_account(&from).map(|a| a.data.is_empty()).unwrap_or(true);
    let returned = if closed_result.ok && ata_gone {
        return_live(&mut closed, 1);
        closed.amount(&closed.lender_ata())
    } else {
        0
    };
    rows.push(Row {
        id: "12-closed-lender-ata".into(),
        mint: "OPENAI".into(),
        expected: "return recreates the lender token account and delivers the tokens".into(),
        ok: closed_result.ok && ata_gone && returned > 0,
        code: closed_result.code,
        detail: closed_result.detail.clone(),
        evidence: json!({"ataClosed": ata_gone, "lenderRawAfterReturn": returned.to_string()}),
    });

    let mut revoked = World::fork(1041);
    revoked.create(1);
    revoked.revoke_lender();
    let revoked_take = revoked.submit("borrower", vec![revoked.take_ix(1, N, K, FEE, TERM)]);
    rows.push(row(
        "13-delegation-mismatch",
        "OPENAI",
        "code 6010",
        &revoked_take,
        json!({}),
        !revoked_take.ok && revoked_take.code == Some(6010),
    ));

    rows
}

fn neuralink() -> Value {
    let mut w = World::fork_fixture("neuralink_mint.json", 1041);
    let flags = flags_of(&w);
    let fee_pending = flags["feePending"].as_bool().unwrap_or(true);
    let decimals = flags["decimals"].as_u64().unwrap_or(0);
    if fee_pending || decimals != 9 {
        return json!({
            "label": "Cloned Mainnet State — Local Execution",
            "mint": "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S",
            "epoch": 1041,
            "passed": false,
            "executableLifecycle": false,
            "flags": flags,
            "limitation": "Lifecycle not executed because the cloned mint is fee-pending or not 9 decimals at epoch 1041."
        });
    }
    let before_lender = w.amount(&w.lender_ata());
    let before_borrower = w.amount(&w.borrower_ata());
    let before_usdc = w.amount(&w.borrower_usdc());
    w.approve_offer(1, N);
    let created = w.submit("lender", vec![w.create_ix(1, N, w.now + 86_400)]);
    let taken = w.submit("borrower", vec![w.take_ix(1, N, K, FEE, TERM)]);
    let delivered = w.amount(&w.borrower_ata()) - before_borrower;
    let (bps, max_fee) = w.live_fee();
    let net = N - locate::token2022::epoch_fee(bps, max_fee, N).unwrap();
    if taken.ok {
        return_live(&mut w, 1);
    }
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    json!({
        "label": "Cloned Mainnet State — Local Execution",
        "mint": "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S",
        "epoch": 1041,
        "flags": flags,
        "createOk": created.ok,
        "createCode": created.code,
        "takeOk": taken.ok,
        "takeCode": taken.code,
        "deliveredRaw": delivered.to_string(),
        "requiredNetRaw": net.to_string(),
        "lenderRestored": w.amount(&w.lender_ata()) >= before_lender,
        "borrowerUsdcAfter": w.amount(&w.borrower_usdc()).to_string(),
        "borrowerUsdcBefore": before_usdc.to_string(),
        "loanClosed": !w.exists(&loan),
        "passed": created.ok && taken.ok && delivered == net && !w.exists(&loan) && w.amount(&w.lender_ata()) >= before_lender,
    })
}

fn write_proof(rows: &[Row], lifecycle: &Value, claim: &Value, neural: &Value) {
    let dir = proof_dir();
    fs::create_dir_all(dir.join("accounts")).unwrap();
    fs::create_dir_all(dir.join("snapshots")).unwrap();
    fs::create_dir_all(dir.join("logs")).unwrap();
    let cases: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.id,
                "mint": r.mint,
                "expected": r.expected,
                "result": if r.ok { "PASS" } else { "FAIL" },
                "errorCode": r.code,
                "detail": r.detail,
                "evidence": r.evidence,
            })
        })
        .collect();
    let passed = rows.iter().filter(|r| r.ok).count();
    let body = json!({
        "label": "Cloned Mainnet State — Local Execution",
        "notAMainnetTransaction": true,
        "passed": passed,
        "failed": rows.len() - passed,
        "total": rows.len(),
        "cases": cases,
    });
    fs::write(dir.join("failure-matrix.json"), serde_json::to_string_pretty(&body).unwrap()).unwrap();
    fs::write(dir.join("openai-full-lifecycle.json"), serde_json::to_string_pretty(lifecycle).unwrap()).unwrap();
    fs::write(dir.join("openai-default-claim.json"), serde_json::to_string_pretty(claim).unwrap()).unwrap();
    fs::write(dir.join("neuralink.json"), serde_json::to_string_pretty(neural).unwrap()).unwrap();
    let manifest = json!({
        "label": "Cloned Mainnet State — Local Execution",
        "notAMainnetTransaction": true,
        "programId": PROGRAM_ID.to_string(),
        "programSha256": program_hash(),
        "epochUsedForActiveFee": 1041,
        "accounts": {
            "openai": fixture_meta("openai_mint.json"),
            "neuralink": fixture_meta("neuralink_mint.json"),
            "usdc": fixture_meta("usdc_mint.json"),
        },
        "token2022Program": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        "balances": "Token balances in these runs are written into ATAs on the local machine after the cloned mint bytes are installed. The issuer did not mint them.",
        "matrix": {"passed": passed, "failed": rows.len() - passed, "total": rows.len()},
    });
    fs::write(dir.join("manifest.json"), serde_json::to_string_pretty(&manifest).unwrap()).unwrap();
    fs::write(
        dir.join("logs").join("matrix.json"),
        serde_json::to_string_pretty(&body).unwrap(),
    )
    .unwrap();
}

#[test]
fn p0_cloned_mainnet_fork_proof() {
    let (lifecycle, mut rows) = openai_lifecycle();
    let (claim, claim_rows) = openai_claim();
    rows.extend(claim_rows);
    rows.extend(failure_rows());
    let neural = neuralink();
    rows.push(Row {
        id: "16-neuralink-lifecycle".into(),
        mint: "NEURALINK".into(),
        expected: "create, take, and return against cloned Neuralink mint bytes".into(),
        ok: neural["passed"].as_bool().unwrap_or(false),
        code: neural["takeCode"].as_u64().map(|n| n as u32),
        detail: neural["limitation"].as_str().unwrap_or("").to_string(),
        evidence: neural.clone(),
    });
    write_proof(&rows, &lifecycle, &claim, &neural);
    let failed: Vec<_> = rows.iter().filter(|r| !r.ok).map(|r| format!("{} {}", r.id, r.detail)).collect();
    assert!(failed.is_empty(), "fork failures:\n{}", failed.join("\n"));
    assert!(lifecycle["passed"].as_bool().unwrap());
    assert!(claim["passed"].as_bool().unwrap());
}
