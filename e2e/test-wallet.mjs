/**
 * Injected only by the e2e runner. Never imported by the frontend.
 * The secret key is read from a path outside the repository.
 */
export function testWalletSource(publicKeyBase58, secretBytes) {
  const secret = JSON.stringify(Array.from(secretBytes));
  return `
    (() => {
      const secret = new Uint8Array(${secret});
      const pubkey = ${JSON.stringify(publicKeyBase58)};
      const account = { address: pubkey, publicKey: secret.slice(32), chains: ["solana:devnet"] };
      const wallet = {
        version: "1.0.0",
        name: "LOCATE Devnet Test",
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
        chains: ["solana:devnet"],
        accounts: [account],
        features: {
          "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
          "standard:events": { version: "1.0.0", on: () => () => {} },
          "solana:signTransaction": { version: "1.0.0", supportedTransactionVersions: ["legacy", 0] }
        }
      };
      window.addEventListener("wallet-standard:app-ready", (event) => {
        event.detail?.register?.(wallet);
      });
      window.dispatchEvent(new Event("wallet-standard:register-wallet"));
    })();
  `;
}
