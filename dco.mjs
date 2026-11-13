#!/usr/bin/env node
/**
 * 零依赖 DCO 检查。
 *
 * 它只做一件事：本次变更里的每个非合并提交，提交信息必须带
 * `Signed-off-by: 名字 <邮箱>`。没有这个尾注的提交，说明作者没有按
 * CONTRIBUTING.md 的 DCO 条款作出声明。
 *
 * 为什么要有执行体：只在 CONTRIBUTING 里写"请用 git commit -s"，
 * 等于把一条硬约束交给提交者的自觉。检查必须由 CI 执行。
 *
 * 用法（CI 里传给环境变量，而不是解析 GitHub 的 JSON）：
 *   DCO_EVENT=pull_request DCO_BASE=<base sha> DCO_HEAD=<head sha> node dco.mjs
 *   DCO_EVENT=push DCO_BEFORE=<before sha> DCO_AFTER=<after sha> node dco.mjs
 *
 * 没有可比基线时（首次推送）会**明确打印跳过**，而不是安静地返回绿。
 *
 * 已知边界：只检查尾注是否存在，不比对签名人与提交作者是否一致。
 * 冒名签名仍可能通过；DCO 是声明，不是身份认证。
 */
import { execFileSync } from "node:child_process";

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  process.stderr.write(`✗ ${message}\n`);
  process.exit(1);
}

/**
 * @param {string} message
 * @returns {void}
 */
function info(message) {
  process.stdout.write(`${message}\n`);
}

const event = process.env["DCO_EVENT"] ?? "";
const base =
  event === "pull_request" ? process.env["DCO_BASE"] : process.env["DCO_BEFORE"];
const head =
  event === "pull_request"
    ? (process.env["DCO_HEAD"] ?? "HEAD")
    : (process.env["DCO_AFTER"] ?? "HEAD");

if (base === undefined || base === "" || /^0+$/.test(base)) {
  info("DCO：没有可比基线（首次推送或事件字段缺失），本次跳过。");
  process.exit(0);
}

/** @type {string[]} */
let commits;
try {
  commits = execFileSync("git", ["rev-list", "--no-merges", `${base}..${head}`], {
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
} catch {
  fail(`无法读取提交范围 ${base}..${head}；CI 里请设置 actions/checkout 的 fetch-depth: 0。`);
}

if (commits.length === 0) {
  info("DCO：本次没有需要检查的非合并提交。");
  process.exit(0);
}

/** @type {string[]} */
const missing = [];
for (const sha of commits) {
  const body = execFileSync("git", ["log", "-1", "--format=%B", sha], {
    encoding: "utf8",
  });
  if (!/^Signed-off-by:\s+.+<[^>]+>\s*$/m.test(body)) missing.push(sha.slice(0, 12));
}

if (missing.length > 0) {
  fail(
    `以下提交缺少 Signed-off-by：${missing.join(", ")}\n` +
      "  用 `git commit -s` 重新提交，或 `git rebase --signoff <base>`。\n" +
      "  通过 GitHub 网页编辑时，请在提交信息末尾手动加：\n" +
      "  Signed-off-by: 你的名字 <你的邮箱>",
  );
}

info(`✓ DCO：${String(commits.length)} 个提交都有 Signed-off-by。`);
