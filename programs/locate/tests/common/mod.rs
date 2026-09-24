//! LiteSVM harness for the LOCATE program.
//!
//! The synthetic mint mirrors OPENAI's extensions. It is not a PreStocks token.
//! Test USDC is a classic mint written at the pinned mainnet address.

use std::path::PathBuf;

use litesvm::LiteSVM;
use locate::constants::{MEMO_PROGRAM_ID, USDC_MINT};
use locate::token2022::{epoch_fee, gross_for_net};
use sha2::{Digest, Sha256};
use solana_account::Account;
use solana_address::{address, Address};
use solana_clock::Clock;
use solana_instruction::{AccountMeta, Instruction};
use solana_instruction_error::InstructionError;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_program_option::COption;
use solana_program_pack::Pack;
use solana_signer::Signer;
use solana_transaction::Transaction;
use solana_transaction_error::TransactionError;
use spl_associated_token_account_interface::address::get_associated_token_address_with_program_id;
use spl_associated_token_account_interface::instruction::create_associated_token_account_idempotent;
use spl_token_2022_interface::extension::default_account_state::instruction::initialize_default_account_state;
use spl_token_2022_interface::extension::pausable::instruction::{initialize as init_pausable, pause, resume};
use spl_token_2022_interface::extension::scaled_ui_amount::instruction::initialize as init_scaled;
use spl_token_2022_interface::extension::transfer_fee::instruction::{
    initialize_transfer_fee_config, set_transfer_fee,
};
use spl_token_2022_interface::extension::transfer_hook::instruction::{
    initialize as init_hook, update as update_hook,
};
use spl_token_2022_interface::extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions};
use spl_token_2022_interface::instruction::{
    approve_checked, initialize_mint2, initialize_permanent_delegate, mint_to_checked, revoke,
};
use spl_token_2022_interface::state::Mint as Mint2022;
use spl_token_interface::instruction::mint_to;
use spl_token_interface::state::{Account as TokenAccount, Mint};

pub const PROGRAM_ID: Address = locate::ID;
pub const TOKEN_2022: Address = spl_token_2022_interface::ID;
pub const TOKEN_CLASSIC: Address = spl_token_interface::ID;
pub const ATA_PROGRAM: Address = address!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
pub const SYSTEM_PROGRAM: Address = address!("11111111111111111111111111111111");
pub const MEMO: Address = MEMO_PROGRAM_ID;

pub const N: u64 = 2_018_660;
pub const K: u64 = 1_000_000;
pub const FEE: u64 = 50_000;
pub const TERM: i64 = 3600;
pub const GRACE: i64 = 3600;

pub struct World {
    pub svm: LiteSVM,
    pub issuer: Keypair,
    pub lender: Keypair,
    pub borrower: Keypair,
    pub mint: Keypair,
    pub mint_id: Address,
    pub now: i64,
    pub epoch: u64,
    pub nonce: u64,
}

pub struct IxResult {
    pub ok: bool,
    pub code: Option<u32>,
    pub cu: u64,
    pub logs: Vec<String>,
    pub detail: String,
}

impl World {
    pub fn new() -> Self {
        let mut svm = LiteSVM::new();
        let so = std::env::var("LOCATE_SO").unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../../target/deploy/locate.so")
                .to_string_lossy()
                .to_string()
        });
        svm.add_program_from_file(PROGRAM_ID, &so)
            .unwrap_or_else(|e| panic!("load locate.so at {so}: {e}"));
        let elf = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/fixtures/mainnet/token2022.so");
        if elf.exists() {
            svm.add_program_from_file(TOKEN_2022, &elf)
                .unwrap_or_else(|e| panic!("load dumped token2022: {e}"));
        }
        let mint = Keypair::new();
        let mint_id = mint.pubkey();
        let mut world = Self {
            svm,
            issuer: Keypair::new(),
            lender: Keypair::new(),
            borrower: Keypair::new(),
            mint,
            mint_id,
            now: 1_700_000_000,
            epoch: 10,
            nonce: 1,
        };
        world.set_clock(world.now, world.epoch);
        for kp in [&world.issuer, &world.lender, &world.borrower] {
            world.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
        }
        world.install_usdc();
        world.install_syn_mint();
        world.create_atas();
        world.mint_supply();
        world
    }

    /// Real mainnet OPENAI and USDC account bytes. Token balances are written
    /// directly after the ATAs exist. The issuer did not mint them.
    pub fn fork(epoch: u64) -> Self {
        let mut world = Self::new();
        let openai = load_fixture("openai_mint.json");
        let usdc = load_fixture("usdc_mint.json");
        world.mint_id = openai.0;
        world.svm.set_account(openai.0, openai.1).unwrap();
        world.svm.set_account(usdc.0, usdc.1).unwrap();
        world.set_clock(1_800_000_000, epoch);
        world.create_atas();
        world.set_amount(&world.lender_ata(), 1_000_000_000_000);
        world.set_amount(&world.borrower_ata(), 1_000_000_000_000);
        world.set_amount(&world.lender_usdc(), 1_000_000_000_000);
        world.set_amount(&world.borrower_usdc(), 1_000_000_000_000);
        world
    }

    pub fn set_amount(&mut self, account: &Address, amount: u64) {
        let mut acct = self.svm.get_account(account).expect("token account");
        acct.data[64..72].copy_from_slice(&amount.to_le_bytes());
        self.svm.set_account(*account, acct).unwrap();
    }

    pub fn set_clock(&mut self, unix: i64, epoch: u64) {
        self.now = unix;
        self.epoch = epoch;
        self.svm.set_sysvar(&Clock {
            slot: epoch.saturating_mul(432_000),
            epoch_start_timestamp: unix.saturating_sub(60),
            epoch,
            leader_schedule_epoch: epoch,
            unix_timestamp: unix,
        });
    }

    pub fn warp(&mut self, secs: i64) {
        self.set_clock(self.now.saturating_add(secs), self.epoch);
    }

    fn install_usdc(&mut self) {
        let mut mint = Mint {
            mint_authority: COption::Some(self.issuer.pubkey()),
            supply: 0,
            decimals: 6,
            is_initialized: true,
            freeze_authority: COption::None,
        };
        let mut data = vec![0u8; Mint::LEN];
        Mint::pack(mint, &mut data).unwrap();
        let lamports = self.svm.minimum_balance_for_rent_exemption(data.len());
        self.svm
            .set_account(
                USDC_MINT,
                Account {
                    lamports,
                    data,
                    owner: TOKEN_CLASSIC,
                    executable: false,
                    rent_epoch: 0,
                },
            )
            .unwrap();
        let _ = mint;
    }

    fn install_syn_mint(&mut self) {
        let extensions = [
            ExtensionType::TransferFeeConfig,
            ExtensionType::DefaultAccountState,
            ExtensionType::PermanentDelegate,
            ExtensionType::TransferHook,
            ExtensionType::ScaledUiAmount,
            ExtensionType::Pausable,
        ];
        let space = ExtensionType::try_calculate_account_len::<Mint2022>(&extensions).unwrap();
        let lamports = self.svm.minimum_balance_for_rent_exemption(space);
        let mint = self.mint_id;
        let payer = self.issuer.pubkey();
        let create = solana_system_interface::instruction::create_account(
            &payer,
            &mint,
            lamports,
            space as u64,
            &TOKEN_2022,
        );
        let issuer = self.issuer.insecure_clone();
        let mint_kp = self.mint.insecure_clone();
        self.send_signers(&[issuer, mint_kp], vec![create]);
        let ixs = vec![
            initialize_transfer_fee_config(
                &TOKEN_2022,
                &mint,
                Some(&payer),
                Some(&payer),
                100,
                u64::MAX,
            )
            .unwrap(),
            initialize_default_account_state(
                &TOKEN_2022,
                &mint,
                &spl_token_2022_interface::state::AccountState::Initialized,
            )
            .unwrap(),
            initialize_permanent_delegate(&TOKEN_2022, &mint, &payer).unwrap(),
            init_hook(&TOKEN_2022, &mint, Some(payer), None).unwrap(),
            init_scaled(&TOKEN_2022, &mint, Some(payer), 1.4861347).unwrap(),
            init_pausable(&TOKEN_2022, &mint, &payer).unwrap(),
            initialize_mint2(&TOKEN_2022, &mint, &payer, Some(&payer), 9).unwrap(),
        ];
        self.submit("issuer", ixs);
    }

    fn create_atas(&mut self) {
        let mint = self.mint_id;
        for owner in [self.lender.pubkey(), self.borrower.pubkey()] {
            let ix = create_associated_token_account_idempotent(
                &self.issuer.pubkey(),
                &owner,
                &mint,
                &TOKEN_2022,
            );
            self.submit("issuer", vec![ix]);
            let usdc = create_associated_token_account_idempotent(
                &self.issuer.pubkey(),
                &owner,
                &USDC_MINT,
                &TOKEN_CLASSIC,
            );
            self.submit("issuer", vec![usdc]);
        }
    }

    fn mint_supply(&mut self) {
        let mint = self.mint_id;
        let lender_ata = ata(&self.lender.pubkey(), &mint, &TOKEN_2022);
        let issuer = self.issuer.pubkey();
        let ix = mint_to_checked(&TOKEN_2022, &mint, &lender_ata, &issuer, &[], 1_000_000_000_000, 9).unwrap();
        self.submit("issuer", vec![ix]);
        let borrower_ata = ata(&self.borrower.pubkey(), &mint, &TOKEN_2022);
        let extra = mint_to_checked(&TOKEN_2022, &mint, &borrower_ata, &issuer, &[], 1_000_000_000_000, 9).unwrap();
        self.submit("issuer", vec![extra]);
        let owners = [self.lender.pubkey(), self.borrower.pubkey()];
        for owner in owners {
            let usdc_ata = ata(&owner, &USDC_MINT, &TOKEN_CLASSIC);
            let ix = mint_to(&TOKEN_CLASSIC, &USDC_MINT, &usdc_ata, &issuer, &[], 1_000_000_000_000).unwrap();
            self.submit("issuer", vec![ix]);
        }
    }

    fn clone_role(&self, role: &str) -> Keypair {
        match role {
            "lender" => self.lender.insecure_clone(),
            "borrower" => self.borrower.insecure_clone(),
            "issuer" => self.issuer.insecure_clone(),
            _ => panic!("unknown role {role}"),
        }
    }

    pub fn submit(&mut self, role: &str, ixs: Vec<Instruction>) -> IxResult {
        let payer = self.clone_role(role);
        self.send(&payer, ixs)
    }

    pub fn submit_ok(&mut self, role: &str, ixs: Vec<Instruction>) -> IxResult {
        let payer = self.clone_role(role);
        self.send_expect(&payer, ixs)
    }

    pub fn send_signers(&mut self, signers: &[Keypair], ixs: Vec<Instruction>) -> IxResult {
        let refs: Vec<&Keypair> = signers.iter().collect();
        let msg = Message::new(&ixs, Some(&signers[0].pubkey()));
        let tx = Transaction::new(&refs, msg, self.svm.latest_blockhash());
        let result = match self.svm.send_transaction(tx) {
            Ok(meta) => IxResult {
                ok: true,
                code: None,
                cu: meta.compute_units_consumed,
                logs: meta.logs,
                detail: String::new(),
            },
            Err(err) => IxResult {
                ok: false,
                code: custom_code(&err.err),
                cu: err.meta.compute_units_consumed,
                logs: err.meta.logs.clone(),
                detail: format!("{:?} {}", err.err, err.meta.logs.join(" | ")),
            },
        };
        self.svm.expire_blockhash();
        result
    }

    pub fn send(&mut self, payer: &Keypair, ixs: Vec<Instruction>) -> IxResult {
        self.send_signers(std::slice::from_ref(payer), ixs)
    }

    pub fn send_expect(&mut self, payer: &Keypair, ixs: Vec<Instruction>) -> IxResult {
        let result = self.send(payer, ixs);
        if !result.ok {
            panic!("tx failed code={:?} {}\n{}", result.code, result.detail, result.logs.join("\n"));
        }
        assert!(result.cu < 120_000, "compute {} exceeds 120k", result.cu);
        result
    }

    pub fn offer_pda(&self, nonce: u64) -> (Address, u8) {
        Address::find_program_address(
            &[
                b"offer",
                self.lender.pubkey().as_ref(),
                self.mint_id.as_ref(),
                &nonce.to_le_bytes(),
            ],
            &PROGRAM_ID,
        )
    }

    pub fn loan_pda(&self, offer: &Address) -> (Address, u8) {
        Address::find_program_address(&[b"loan", offer.as_ref()], &PROGRAM_ID)
    }

    pub fn event_authority() -> Address {
        Address::find_program_address(&[b"__event_authority"], &PROGRAM_ID).0
    }

    pub fn lender_ata(&self) -> Address {
        ata(&self.lender.pubkey(), &self.mint_id, &TOKEN_2022)
    }

    pub fn borrower_ata(&self) -> Address {
        ata(&self.borrower.pubkey(), &self.mint_id, &TOKEN_2022)
    }

    pub fn lender_usdc(&self) -> Address {
        ata(&self.lender.pubkey(), &USDC_MINT, &TOKEN_CLASSIC)
    }

    pub fn borrower_usdc(&self) -> Address {
        ata(&self.borrower.pubkey(), &USDC_MINT, &TOKEN_CLASSIC)
    }

    pub fn vault(&self, loan: &Address) -> Address {
        ata(loan, &USDC_MINT, &TOKEN_CLASSIC)
    }

    pub fn amount(&self, account: &Address) -> u64 {
        let data = self.svm.get_account(account).expect("account").data;
        token_amount(&data)
    }

    pub fn exists(&self, account: &Address) -> bool {
        self.svm
            .get_account(account)
            .map(|a| a.data.len() > 8 && a.owner == PROGRAM_ID)
            .unwrap_or(false)
    }

    pub fn approve_offer(&mut self, nonce: u64, amount: u64) {
        let (offer, _) = self.offer_pda(nonce);
        let ix = approve_checked(
            &TOKEN_2022,
            &self.lender_ata(),
            &self.mint_id,
            &offer,
            &self.lender.pubkey(),
            &[],
            amount,
            9,
        )
        .unwrap();
        self.submit_ok("lender", vec![ix]);
    }

    pub fn approve_return(&mut self, loan: &Address, amount: u64) {
        let ix = approve_checked(
            &TOKEN_2022,
            &self.borrower_ata(),
            &self.mint_id,
            loan,
            &self.borrower.pubkey(),
            &[],
            amount,
            9,
        )
        .unwrap();
        self.submit_ok("borrower", vec![ix]);
    }

    pub fn create_ix(&self, nonce: u64, amount: u64, expires_at: i64) -> Instruction {
        let (offer, _) = self.offer_pda(nonce);
        let mut data = disc("create_offer").to_vec();
        for n in [nonce, amount, K, FEE] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        for n in [TERM, GRACE, expires_at] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(self.lender.pubkey(), true),
                AccountMeta::new_readonly(self.mint_id, false),
                AccountMeta::new(self.lender_ata(), false),
                AccountMeta::new(offer, false),
                AccountMeta::new_readonly(USDC_MINT, false),
                AccountMeta::new(self.lender_usdc(), false),
                AccountMeta::new_readonly(TOKEN_2022, false),
                AccountMeta::new_readonly(TOKEN_CLASSIC, false),
                AccountMeta::new_readonly(ATA_PROGRAM, false),
                AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
                AccountMeta::new_readonly(Self::event_authority(), false),
                AccountMeta::new_readonly(PROGRAM_ID, false),
            ],
            data,
        }
    }

    pub fn create(&mut self, nonce: u64) -> IxResult {
        self.approve_offer(nonce, N);
        let expires = self.now + 86_400;
        let ix = self.create_ix(nonce, N, expires);
        let result = self.submit_ok("lender", vec![ix]);
        self.assert_invariants(nonce);
        result
    }

    pub fn take_ix(&self, nonce: u64, amount: u64, collateral: u64, fee: u64, term: i64) -> Instruction {
        let (offer, _) = self.offer_pda(nonce);
        let (loan, _) = self.loan_pda(&offer);
        let mut data = disc("take_offer").to_vec();
        for n in [amount, collateral, fee] {
            data.extend_from_slice(&n.to_le_bytes());
        }
        data.extend_from_slice(&term.to_le_bytes());
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(self.borrower.pubkey(), true),
                AccountMeta::new(self.lender.pubkey(), false),
                AccountMeta::new(offer, false),
                AccountMeta::new_readonly(self.mint_id, false),
                AccountMeta::new(self.lender_ata(), false),
                AccountMeta::new(self.borrower_ata(), false),
                AccountMeta::new(loan, false),
                AccountMeta::new(self.vault(&loan), false),
                AccountMeta::new_readonly(USDC_MINT, false),
                AccountMeta::new(self.borrower_usdc(), false),
                AccountMeta::new(self.lender_usdc(), false),
                AccountMeta::new_readonly(MEMO, false),
                AccountMeta::new_readonly(TOKEN_2022, false),
                AccountMeta::new_readonly(TOKEN_CLASSIC, false),
                AccountMeta::new_readonly(ATA_PROGRAM, false),
                AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
                AccountMeta::new_readonly(Self::event_authority(), false),
                AccountMeta::new_readonly(PROGRAM_ID, false),
            ],
            data,
        }
    }

    pub fn take(&mut self, nonce: u64) -> IxResult {
        let ix = self.take_ix(nonce, N, K, FEE, TERM);
        let result = self.submit_ok("borrower", vec![ix]);
        self.assert_invariants(nonce);
        result
    }

    pub fn return_ix(&self, nonce: u64, max_gross: u64) -> Instruction {
        let (offer, _) = self.offer_pda(nonce);
        let (loan, _) = self.loan_pda(&offer);
        let mut data = disc("return_loan").to_vec();
        data.extend_from_slice(&max_gross.to_le_bytes());
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(self.borrower.pubkey(), true),
                AccountMeta::new(loan, false),
                AccountMeta::new_readonly(self.mint_id, false),
                AccountMeta::new(self.borrower_ata(), false),
                AccountMeta::new(self.lender.pubkey(), false),
                AccountMeta::new(self.lender_ata(), false),
                AccountMeta::new(self.vault(&loan), false),
                AccountMeta::new(self.borrower_usdc(), false),
                AccountMeta::new_readonly(USDC_MINT, false),
                AccountMeta::new_readonly(MEMO, false),
                AccountMeta::new_readonly(TOKEN_2022, false),
                AccountMeta::new_readonly(TOKEN_CLASSIC, false),
                AccountMeta::new_readonly(ATA_PROGRAM, false),
                AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
                AccountMeta::new_readonly(Self::event_authority(), false),
                AccountMeta::new_readonly(PROGRAM_ID, false),
            ],
            data,
        }
    }

    pub fn return_loan(&mut self, nonce: u64) -> IxResult {
        let (offer, _) = self.offer_pda(nonce);
        let (loan, _) = self.loan_pda(&offer);
        let gross = gross_for_net(100, u64::MAX, N).unwrap();
        if self.mint.pubkey() == self.mint_id {
            let mint = self.mint_id;
            let dest = self.borrower_ata();
            let issuer = self.issuer.pubkey();
            let top = mint_to_checked(&TOKEN_2022, &mint, &dest, &issuer, &[], gross, 9).unwrap();
            self.submit_ok("issuer", vec![top]);
        }
        self.approve_return(&loan, gross);
        let ix = self.return_ix(nonce, gross);
        let result = self.submit_ok("borrower", vec![ix]);
        self.assert_invariants(nonce);
        result
    }

    pub fn claim_ix(&self, nonce: u64, caller: &Address) -> Instruction {
        let (offer, _) = self.offer_pda(nonce);
        let (loan, _) = self.loan_pda(&offer);
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*caller, true),
                AccountMeta::new(loan, false),
                AccountMeta::new(self.borrower.pubkey(), false),
                AccountMeta::new_readonly(self.lender.pubkey(), false),
                AccountMeta::new_readonly(self.mint_id, false),
                AccountMeta::new(self.vault(&loan), false),
                AccountMeta::new(self.lender_usdc(), false),
                AccountMeta::new_readonly(USDC_MINT, false),
                AccountMeta::new_readonly(TOKEN_CLASSIC, false),
                AccountMeta::new_readonly(ATA_PROGRAM, false),
                AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
                AccountMeta::new_readonly(TOKEN_2022, false),
                AccountMeta::new_readonly(Self::event_authority(), false),
                AccountMeta::new_readonly(PROGRAM_ID, false),
            ],
            data: disc("claim_collateral").to_vec(),
        }
    }

    pub fn claim(&mut self, nonce: u64) -> IxResult {
        let caller = self.lender.pubkey();
        let ix = self.claim_ix(nonce, &caller);
        let result = self.submit_ok("lender", vec![ix]);
        self.assert_invariants(nonce);
        result
    }

    pub fn cancel_ix(&self, nonce: u64) -> Instruction {
        let (offer, _) = self.offer_pda(nonce);
        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(self.lender.pubkey(), true),
                AccountMeta::new(offer, false),
                AccountMeta::new_readonly(self.lender_ata(), false),
                AccountMeta::new_readonly(Self::event_authority(), false),
                AccountMeta::new_readonly(PROGRAM_ID, false),
            ],
            data: disc("cancel_offer").to_vec(),
        }
    }

    pub fn pause_mint(&mut self) {
        let ix = pause(&TOKEN_2022, &self.mint_id, &self.issuer.pubkey(), &[]).unwrap();
        self.submit_ok("issuer", vec![ix]);
    }

    pub fn resume_mint(&mut self) {
        let ix = resume(&TOKEN_2022, &self.mint_id, &self.issuer.pubkey(), &[]).unwrap();
        self.submit_ok("issuer", vec![ix]);
    }

    pub fn set_hook(&mut self, program: Option<Address>) {
        let ix = update_hook(
            &TOKEN_2022,
            &self.mint_id,
            &self.issuer.pubkey(),
            &[],
            program,
        )
        .unwrap();
        self.submit_ok("issuer", vec![ix]);
    }

    pub fn schedule_fee(&mut self, bps: u16) {
        let ix = set_transfer_fee(
            &TOKEN_2022,
            &self.mint_id,
            &self.issuer.pubkey(),
            &[],
            bps,
            u64::MAX,
        )
        .unwrap();
        self.submit_ok("issuer", vec![ix]);
    }

    pub fn revoke_lender(&mut self) {
        let ix = revoke(
            &TOKEN_2022,
            &self.lender_ata(),
            &self.lender.pubkey(),
            &[],
        )
        .unwrap();
        self.submit_ok("lender", vec![ix]);
    }

    pub fn assert_invariants(&self, nonce: u64) {
        let (offer, _) = self.offer_pda(nonce);
        let (loan, _) = self.loan_pda(&offer);
        let vault = self.vault(&loan);
        if self.exists(&loan) {
            let data = self.svm.get_account(&loan).unwrap().data;
            let collateral = u64::from_le_bytes(data[179..187].try_into().unwrap());
            assert_eq!(self.amount(&vault), collateral, "I2 vault collateral");
            assert!(self.exists(&offer) == false, "I7 offer closed once loan exists");
        }
        let _ = (epoch_fee, StateWithExtensions::<Mint2022>::unpack);
    }
}

pub fn ata(owner: &Address, mint: &Address, program: &Address) -> Address {
    get_associated_token_address_with_program_id(owner, mint, program)
}

pub fn token_amount(data: &[u8]) -> u64 {
    u64::from_le_bytes(data[64..72].try_into().expect("token amount"))
}

pub fn disc(name: &str) -> [u8; 8] {
    let hash = Sha256::digest(format!("global:{name}"));
    hash[..8].try_into().unwrap()
}

pub fn custom_code(err: &TransactionError) -> Option<u32> {
    match err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => Some(*code),
        _ => None,
    }
}

pub fn expect_code(result: &IxResult, code: u32) {
    assert!(!result.ok, "expected failure {code}, {}", result.detail);
    assert_eq!(result.code, Some(code), "{}", result.detail);
}

pub fn load_fixture(name: &str) -> (Address, Account) {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/mainnet").join(name);
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {path:?}: {e}"));
    let doc: serde_json::Value = serde_json::from_str(&text).unwrap();
    let pubkey = doc["pubkey"].as_str().unwrap().parse::<Address>().unwrap();
    let owner = doc["owner"].as_str().unwrap().parse::<Address>().unwrap();
    let data = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        doc["data"].as_str().unwrap(),
    )
    .unwrap();
    let account = Account {
        lamports: doc["lamports"].as_u64().unwrap(),
        data,
        owner,
        executable: doc["executable"].as_bool().unwrap(),
        rent_epoch: doc["rentEpoch"].as_u64().unwrap_or(0),
    };
    (pubkey, account)
}
