mod common;

use common::World;
use locate::token2022::{epoch_fee, gross_for_net};
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(10_000))]
    #[test]
    fn fz01_minimal_gross(net in 1u64..=1_000_000_000_000_000, bps in 0u16..=10_000, cap_flag in 0u8..2, cap in 1u64..u64::MAX) {
        let max_fee = if cap_flag == 0 { u64::MAX } else { cap };
        match gross_for_net(bps, max_fee, net) {
            Ok(gross) => {
                let fee = epoch_fee(bps, max_fee, gross).unwrap();
                let got = gross - fee;
                prop_assert!(got >= net);
                if gross > 0 {
                    let prev_fee = epoch_fee(bps, max_fee, gross - 1).unwrap_or(u64::MAX);
                    if prev_fee != u64::MAX && gross - 1 >= prev_fee {
                        prop_assert!(gross - 1 - prev_fee < net);
                    }
                }
            }
            Err(_) => {}
        }
    }
}

#[test]
fn fz01_svm_spot() {
    let mut w = World::new();
    w.create(1);
    w.take(1);
    let (offer, _) = w.offer_pda(1);
    let (loan, _) = w.loan_pda(&offer);
    let gross = gross_for_net(100, u64::MAX, common::N).unwrap();
    w.approve_return(&loan, gross);
    let ix = w.return_ix(1, gross);
    w.submit_ok("borrower", vec![ix]);
    assert!(w.amount(&w.lender_ata()) >= common::N);
}
