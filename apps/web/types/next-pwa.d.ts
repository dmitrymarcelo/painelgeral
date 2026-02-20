declare module "next-pwa" {
  import type { NextConfig } from "next";

  type WithPWAOptions = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
  };

  export default function withPWA(options?: WithPWAOptions): (config: NextConfig) => NextConfig;
}
