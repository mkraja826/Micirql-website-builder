const path = require("node:path");

const buildMetadata = {
  MICIRQL_BUILD_SHA:
    process.env.WORKERS_CI_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.MICIRQL_BUILD_SHA ??
    "unknown",
  MICIRQL_BUILD_BRANCH:
    process.env.WORKERS_CI_BRANCH ??
    process.env.GITHUB_REF_NAME ??
    process.env.MICIRQL_BUILD_BRANCH ??
    "unknown",
  MICIRQL_BUILD_ID:
    process.env.WORKERS_CI_BUILD_UUID ??
    process.env.GITHUB_RUN_ID ??
    process.env.MICIRQL_BUILD_ID ??
    "local",
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  env: buildMetadata,
};

module.exports = nextConfig;
