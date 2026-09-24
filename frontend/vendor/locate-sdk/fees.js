export function epochFee(bps, maxFee, amount) {
    if (bps === 0 || amount === 0n)
        return 0n;
    const raw = (amount * BigInt(bps) + 9999n) / 10000n;
    return raw < maxFee ? raw : maxFee;
}
export function grossForNet(bps, maxFee, net) {
    if (net === 0n || bps === 0)
        return net;
    const denom = 10000n - BigInt(bps);
    let gross = net + (net * BigInt(bps) + denom - 1n) / denom;
    if (gross - net > maxFee)
        gross = net + maxFee;
    for (let i = 0; i < 3; i++) {
        if (gross - epochFee(bps, maxFee, gross) >= net)
            break;
        gross += 1n;
    }
    while (gross > net) {
        const prev = gross - 1n;
        if (prev - epochFee(bps, maxFee, prev) >= net)
            gross = prev;
        else
            break;
    }
    return gross;
}
export function rawToUi(raw, decimals, multiplier) {
    const [whole, frac = ""] = multiplier.split(".");
    const scale = 10n ** BigInt(frac.length);
    const mult = BigInt(whole + frac.padEnd(frac.length, "0"));
    const base = 10n ** BigInt(decimals);
    const scaled = (raw * mult) / (base * scale);
    const remainder = (raw * mult) % (base * scale);
    if (remainder === 0n)
        return scaled.toString();
    const digits = remainder.toString().padStart(decimals + frac.length, "0").replace(/0+$/, "");
    return scaled.toString() + "." + digits;
}
export function uiToRaw(ui, decimals) {
    const [whole, frac = ""] = ui.split(".");
    const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
    return BigInt(whole + padded);
}
