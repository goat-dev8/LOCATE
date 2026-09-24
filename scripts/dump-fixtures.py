#!/usr/bin/env python3
"""Dump mainnet OPENAI and USDC mint accounts. Does not print the RPC URL."""
import hashlib, json, os, time, urllib.request

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
env = {}
for line in open(os.path.join(root, ".env"), encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    env[key] = value.strip().strip('"')
rpc = env["SOLANA_RPC_URL_MAINNET"]

def rpc_call(method, params):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(rpc, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as res:
        payload = json.load(res)
    if "error" in payload:
        raise SystemExit(method + " failed")
    return payload["result"]

epoch = rpc_call("getEpochInfo", [{"commitment": "finalized"}])
accounts = {
    "openai_mint.json": "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    "usdc_mint.json": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
}
out_dir = os.path.join(root, "tests/fixtures/mainnet")
os.makedirs(out_dir, exist_ok=True)
files = {}
for name, pubkey in accounts.items():
    info = rpc_call("getAccountInfo", [pubkey, {"encoding": "base64", "commitment": "finalized"}])
    value = info["value"]
    raw = __import__("base64").b64decode(value["data"][0])
    doc = {
        "pubkey": pubkey,
        "lamports": value["lamports"],
        "owner": value["owner"],
        "executable": value["executable"],
        "rentEpoch": value["rentEpoch"],
        "slot": info["context"]["slot"],
        "data": value["data"][0],
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "disclosure": "Mainnet account bytes. Fork-test balances are injected by direct account write; the issuer did not mint them.",
    }
    open(os.path.join(out_dir, name), "w", encoding="utf-8").write(json.dumps(doc) + "\n")
    files[name] = {"pubkey": pubkey, "sha256": doc["sha256"], "bytes": doc["bytes"], "slot": doc["slot"]}
    print(name, doc["bytes"], doc["sha256"], doc["slot"])
elf_path = os.path.join(out_dir, "token2022.so")
elf = open(elf_path, "rb").read() if os.path.exists(elf_path) else b""
manifest = {
    "slot": epoch["absoluteSlot"],
    "epoch": epoch["epoch"],
    "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "token2022": {
        "program": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        "file": "token2022.so",
        "bytes": len(elf),
        "sha256": hashlib.sha256(elf).hexdigest() if elf else None,
    },
    "accounts": files,
    "disclosure": "Balances injected by direct account write in tests; mint and program bytes are real mainnet at the recorded slot.",
}
open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8").write(json.dumps(manifest, indent=2) + "\n")
print("epoch", epoch["epoch"], "slot", epoch["absoluteSlot"])
