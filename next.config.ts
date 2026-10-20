import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  // Only the version reaches the browser, not the rest of package.json.
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
