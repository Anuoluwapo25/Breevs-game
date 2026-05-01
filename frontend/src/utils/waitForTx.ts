export async function waitForTxConfirmation(
  txId: string,
  timeoutSeconds = 30,
  intervalMs = 2000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutSeconds * 1000) {
    try {
      const res = await fetch(
        `https://api.testnet.hiro.so/extended/v1/tx/${txId}`
      );
      const data = await res.json();

      if (data.tx_status === "success") {
        return true;
      }
      if (
        data.tx_status === "abort_by_post_condition" ||
        data.tx_status === "abort_by_response"
      ) {
        console.error(`❌ Transaction ${txId} failed: ${data.tx_status}`);
        return false;
      }
    } catch (err) {
      console.warn("⚠️ Error checking transaction:", err);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  console.error(
    `⏰ Transaction ${txId} not confirmed after ${timeoutSeconds}s`
  );
  return false;
}
