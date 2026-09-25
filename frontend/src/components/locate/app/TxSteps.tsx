"use client";

const STEPS = ["Prepare", "Review", "Simulate", "Approve", "Confirm", "Verify"] as const;

const INDEX: Record<string, number> = {
  review: 1,
  simulating: 2,
  ready: 3,
  signing: 3,
  confirming: 4,
  done: 5,
};

export function TxSteps({ phase }: { phase: string }) {
  const active = INDEX[phase] ?? 0;
  return (
    <ol className="mb-4 flex flex-wrap gap-2">
      {STEPS.map((label, index) => (
        <li
          key={label}
          className={
            index < active
              ? "font-mono text-[12px] text-[#3DDC97]"
              : index === active
                ? "font-mono text-[12px] text-white"
                : "font-mono text-[12px] text-ink-3"
          }
        >
          {label}
        </li>
      ))}
    </ol>
  );
}
