import { FungibleConditionCode, PostConditionMode } from "@stacks/transactions";

export async function buildStxPostConditions(
  stxAddress: string,
  amount: bigint
) {
  if (!stxAddress) throw new Error("Missing stxAddress for post condition");
  if (amount == null) throw new Error("Missing amount for post condition");

  const allowFallback = {
    postConditionMode: PostConditionMode.Allow as PostConditionMode,
  };

  try {
    const mod = await import("@stacks/transactions");

    const possibleFns = [
      (mod as any).makeStandardSTXPostCondition,
      (mod as any).createSTXPostCondition,
      (mod as any).makeStandardSTXCondition,
    ].filter(Boolean);

    for (const fn of possibleFns) {
      try {
        const pc = fn(stxAddress, FungibleConditionCode.Equal, amount);
        return {
          postConditions: [pc],
          postConditionMode: PostConditionMode.Deny as PostConditionMode,
        };
      } catch {
        try {
          const pc = fn(stxAddress, FungibleConditionCode.Equal);
          return {
            postConditions: [pc],
            postConditionMode: PostConditionMode.Deny as PostConditionMode,
          };
        } catch {}
      }
    }

    console.warn(
      "[stacksPostCondition] No valid post-condition constructor found; fallback to Allow mode."
    );
    return allowFallback;
  } catch (err) {
    console.error("[stacksPostCondition] Error building post-condition:", err);
    return allowFallback;
  }
}
