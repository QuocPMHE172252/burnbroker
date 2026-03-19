import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "BurnBroker",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo_burnbroker_2026",
  chains: [polygonAmoy],
  ssr: true,
});
