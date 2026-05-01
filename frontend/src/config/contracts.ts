import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";

export const NETWORK =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet"
    ? STACKS_MAINNET
    : STACKS_TESTNET;
