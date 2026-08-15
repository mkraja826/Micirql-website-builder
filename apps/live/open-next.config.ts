import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

export default {
  ...config,
  buildOutputPath: ".",
  appPath: ".",
  packageJsonPath: "package.json",
};
