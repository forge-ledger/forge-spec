#!/usr/bin/env node
/**
 * Forge Ledger Format v1 的零依赖校验器。
 *
 * 它做四件事：
 *   1. 用 schema.json 校验示例 front-matter；
 *   2. 用 schema/taxonomy.yaml 校验机器可读部分没有漂移；
 *   3. 检查 ID 前缀、必填字段、必填章节、真实日期与 span；
 *   4. 跑一组变异样例，证明每一条检查都会红。
 *
 * 第 4 条不是装饰：只会变绿的检查不是检查。
 *
 * 用法：
 *   node validate.mjs
 *   node validate.mjs --self-test   # 显式要求自证（默认也会跑）
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

const ROOT = import.meta.dirname;
const SCHEMA = JSON.parse(readFileSync(join(ROOT, "schema.json"), "utf8"));

// taxonomy 位于 ROOT/schema/（或在上一级 schema/）。
const TAXONOMY_PATH = [
  join(ROOT, "schema", "taxonomy.yaml"),
  join(ROOT, "..", "schema", "taxonomy.yaml"),
].find((candidate) => existsSync(candidate));
if (TAXONOMY_PATH === undefined) {
  process.stderr.write("✗ 找不到 schema/taxonomy.yaml\n");
  process.exit(1);
}
const TAXONOMY_TEXT = readFileSync(TAXONOMY_PATH, "utf8");

// 示例目录为 examples/assets/。
const EXAMPLES_ROOT = [
  join(ROOT, "examples", "assets"),
  join(ROOT, "examples", "ledger"),
].find((candidate) => existsSync(candidate));
if (EXAMPLES_ROOT === undefined) {
  process.stderr.write("✗ 找不到示例目录（examples/assets 或 examples/ledger）\n");
  process.exit(1);
}

const ASSET_TYPES = ["decision", "state", "event", "rule"];
const ID_PREFIX = {
  decision: "dec_",
  state: "state_",
  event: "event_",
  rule: "rule_",
};
const REQUIRED_FIELDS = {
  decision: [],
  state: ["last_confirmed", "subject"],
  event: [],
  rule: ["origin_incident"],
};
const REQUIRED_SECTIONS = {
  decision: ["问题", "考虑过的选项", "选定", "后果"],
  state: ["当前状态"],
  event: [],
  rule: ["规则", "强制"],
};

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  /** @type {string[]} */
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (stat.isFile()) files.push(full);
  }
  return files.sort(compareStrings);
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * 解析我们用到的那一小撮 YAML：顶层标量、字符串数组、null、布尔、数字。
 * 不追求完整 YAML；遇到不认识的形状就报错，而不是猜。
 *
 * @param {string} text
 * @returns {{ data: Record<string, unknown>, body: string } | { error: string }}
 */
function parseFrontMatter(text) {
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "---") {
    return { error: "文件必须以单独一行的 --- 开头" };
  }
  const close = lines.indexOf("---", 1);
  if (close < 0) {
    return { error: "找不到 front-matter 的结束标记 ---" };
  }

  /** @type {Record<string, unknown>} */
  const data = {};
  let currentKey = null;
  for (let index = 1; index < close; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    if (raw.includes("\t")) return { error: `front-matter 第 ${String(index + 1)} 行含 tab` };

    const indent = raw.length - raw.trimStart().length;
    if (indent === 0) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(trimmed);
      if (match === null) {
        return { error: `front-matter 第 ${String(index + 1)} 行不是 key: value` };
      }
      const key = match[1];
      if (Object.hasOwn(data, key)) {
        return { error: `front-matter 重复定义字段：${key}` };
      }
      const rest = match[2].trim();
      if (rest === "") {
        data[key] = null;
        currentKey = key;
      } else {
        const parsed = parseScalar(rest);
        if ("error" in parsed) return { error: `字段 ${key}：${parsed.error}` };
        data[key] = parsed.value;
        currentKey = null;
      }
      continue;
    }

    if (indent < 2 || currentKey === null) {
      return { error: `front-matter 第 ${String(index + 1)} 行缩进不合法` };
    }
    if (!trimmed.startsWith("- ")) {
      return { error: `front-matter 第 ${String(index + 1)} 行只支持 - item 列表` };
    }
    if (data[currentKey] === null) data[currentKey] = [];
    const list = data[currentKey];
    if (!Array.isArray(list)) {
      return { error: `字段 ${currentKey} 同时出现了标量与列表` };
    }
    const parsed = parseScalar(trimmed.slice(2).trim());
    if ("error" in parsed) return { error: `字段 ${currentKey}：${parsed.error}` };
    list.push(parsed.value);
  }

  return { data, body: lines.slice(close + 1).join("\n") };
}

/**
 * @param {string} text
 * @returns {{ value: unknown } | { error: string }}
 */
function parseScalar(text) {
  if (text === "null" || text === "~") return { value: null };
  if (text === "true") return { value: true };
  if (text === "false") return { value: false };
  if (text === "[]") return { value: [] };
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return { value: Number(text) };

  if (text.startsWith('"')) {
    if (!text.endsWith('"') || text.length < 2) return { error: "双引号字符串没有闭合" };
    try {
      return { value: JSON.parse(text) };
    } catch {
      return { error: "双引号字符串不是合法 JSON 字符串" };
    }
  }
  if (text.startsWith("'")) {
    if (!text.endsWith("'") || text.length < 2) return { error: "单引号字符串没有闭合" };
    return { value: text.slice(1, -1).replace(/''/g, "'") };
  }
  if (text.startsWith("[") || text.endsWith("]")) {
    return { error: "只支持 [] 空数组；非空列表请用 - item" };
  }
  return { value: text };
}

/**
 * @param {unknown} value
 * @param {string} type
 * @returns {boolean}
 */
function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

/**
 * 只实现 schema.json 用到的 JSON Schema 子集。遇到不认识的 keyword 不报错，
 * 因为这份校验器的职责是校验示例，不是实现完整 JSON Schema。
 *
 * @param {unknown} value
 * @param {any} schema
 * @param {string} path
 * @param {string[]} errors
 * @returns {string[]}
 */
function validateAgainstSchema(value, schema, path, errors) {
  if (schema === null || typeof schema !== "object") return errors;

  if (Array.isArray(schema.allOf)) {
    for (const part of schema.allOf) validateAgainstSchema(value, part, path, errors);
  }

  if (schema.if !== undefined) {
    /** @type {string[]} */
    const branch = [];
    validateAgainstSchema(value, schema.if, path, branch);
    if (branch.length === 0 && schema.then !== undefined) {
      validateAgainstSchema(value, schema.then, path, errors);
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path} 必须是 ${JSON.stringify(schema.const)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path} 必须是 ${schema.enum.join(" / ")} 之一`);
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(`${path} 类型必须是 ${types.join(" | ")}`);
      return errors;
    }
  }

  if (typeof value === "string") {
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path} 不匹配 ${schema.pattern}`);
    }
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`${path} 长度小于 ${String(schema.minLength)}`);
    }
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      errors.push(`${path} 长度大于 ${String(schema.maxLength)}`);
    }
  }

  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push(`${path} 小于 ${String(schema.minimum)}`);
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push(`${path} 大于 ${String(schema.maximum)}`);
    }
  }

  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, index) => validateAgainstSchema(item, schema.items, `${path}[${String(index)}]`, errors));
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = /** @type {Record<string, unknown>} */ (value);
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.hasOwn(record, key)) errors.push(`${path}.${key} 是必填字段`);
      }
    }
    if (schema.properties !== undefined && typeof schema.properties === "object") {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (Object.hasOwn(record, key)) {
          validateAgainstSchema(record[key], childSchema, `${path}.${key}`, errors);
        }
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(record)) {
          if (!Object.hasOwn(schema.properties, key)) errors.push(`${path}.${key} 是未知字段`);
        }
      }
    }
  }

  return errors;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function sectionTitles(text) {
  /** @type {string[]} */
  const titles = [];
  for (const line of text.split("\n")) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match !== null) titles.push(match[1].trim());
  }
  return titles;
}

/**
 * @param {string} span
 * @param {string} root
 * @returns {{ ok: true } | { ok: false, code: string, error: string }}
 */
function validateSpan(span, root) {
  const match = /^(file|src):\/\/([^#]+)(?:#(.+))?$/.exec(span);
  if (match === null) {
    return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: "span 语法不合法" };
  }
  const scheme = match[1];
  const target = match[2];
  const anchor = match[3] ?? null;

  if (scheme !== "file") {
    return {
      ok: false,
      code: "PROV_SCHEME_UNAVAILABLE",
      error: "示例必须是自包含的；请使用 file:// span（src:// 需要 sources/ 层）",
    };
  }
  if (isAbsolute(target)) {
    return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: "span 目标必须是相对路径" };
  }

  const absolute = resolve(root, target);
  const rel = relative(root, absolute);
  if (rel.split(/[\\/]/).includes("..")) {
    return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: "span 目标越出了仓库根目录" };
  }

  let text;
  try {
    text = readFileSync(absolute, "utf8").replace(/\r\n?/g, "\n");
  } catch {
    return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: `目标文件不存在：${target}` };
  }

  if (anchor === null) return { ok: true };

  if (anchor.startsWith("t:")) {
    const needle = normalizeWhitespace(anchor.slice(2));
    if (needle.length < 8) {
      return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: "#t: 片段少于 8 个字符" };
    }
    if (!normalizeWhitespace(text).includes(needle)) {
      return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: `#t: 在 ${target} 里找不到` };
    }
    return { ok: true };
  }

  if (anchor.startsWith("h:")) {
    const wanted = normalizeWhitespace(anchor.slice(2));
    /** @type {string[]} */
    const headings = [];
    for (const line of text.split("\n")) {
      const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
      if (heading !== null) headings.push(normalizeWhitespace(heading[1]));
    }
    if (!headings.includes(wanted)) {
      return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: `#h: 在 ${target} 里找不到标题“${wanted}”` };
    }
    return { ok: true };
  }

  if (anchor.startsWith("k:")) {
    return {
      ok: false,
      code: "PROV_SCHEME_UNAVAILABLE",
      error: "#k: 需要结构化来源解析器；示例必须使用 #t:、#h: 或 #L",
    };
  }

  const lineRange = /^L(\d+)-L(\d+)$/.exec(anchor);
  if (lineRange !== null) {
    const start = Number(lineRange[1]);
    const end = Number(lineRange[2]);
    const lineCount = text.split("\n").length;
    if (start < 1 || end < start || end > lineCount) {
      return {
        ok: false,
        code: "PROV_SPAN_UNRESOLVED",
        error: `#${anchor} 越界（目标共 ${String(lineCount)} 行）`,
      };
    }
    return { ok: true };
  }

  return { ok: false, code: "PROV_SPAN_UNRESOLVED", error: `不认识的锚点：${anchor}` };
}

/**
 * @param {string} text
 * @param {{ root: string, taxonomyVersion: number, schema: any }} options
 * @returns {string[]}
 */
function validateAssetText(text, options) {
  /** @type {string[]} */
  const errors = [];
  const parsed = parseFrontMatter(text);
  if ("error" in parsed) return [`[FRONTMATTER_PARSE] ${parsed.error}`];

  const data = parsed.data;
  /** @type {string[]} */
  const schemaErrors = [];
  validateAgainstSchema(data, options.schema, "$", schemaErrors);
  for (const error of schemaErrors) errors.push(`[SCHEMA] ${error}`);

  const type = data["type"];
  if (typeof type !== "string" || !ASSET_TYPES.includes(type)) {
    return errors;
  }
  const typed = /** @type {"decision" | "state" | "event" | "rule"} */ (type);

  const id = data["id"];
  if (typeof id === "string" && !id.startsWith(ID_PREFIX[typed])) {
    errors.push(`[ID_PREFIX_MISMATCH] id ${id} 的前缀与 type ${typed} 不一致`);
  }

  const version = data["schema_version"];
  if (typeof version === "number" && version !== options.taxonomyVersion) {
    errors.push(
      `[SCHEMA_VERSION_MISMATCH] schema_version=${String(version)}，分类法是 v${String(options.taxonomyVersion)}`,
    );
  }

  for (const field of ["created", "last_confirmed"]) {
    const value = data[field];
    if (typeof value === "string" && !isCalendarDate(value)) {
      errors.push(`[INVALID_DATE] ${field}=${value} 不是真实存在的日历日期`);
    }
  }

  const sources = data["sources"];
  if (!Array.isArray(sources) || sources.length === 0) {
    errors.push("[PROV_NO_SOURCES] sources 为空：断言没有出处");
  } else {
    for (const source of sources) {
      if (typeof source !== "string") {
        errors.push("[PROV_SPAN_UNRESOLVED] sources 里出现了非字符串");
        continue;
      }
      const result = validateSpan(source, options.root);
      if (!result.ok) errors.push(`[${result.code}] ${source}：${result.error}`);
    }
  }

  for (const field of REQUIRED_FIELDS[typed]) {
    const value = data[field];
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      errors.push(`[REQUIRED_FIELD_MISSING] ${typed} 要求字段 ${field}`);
    }
  }

  const titles = sectionTitles(parsed.body);
  for (const section of REQUIRED_SECTIONS[typed]) {
    if (!titles.includes(section)) {
      errors.push(`[REQUIRED_SECTION_MISSING] ${typed} 要求章节 ## ${section}`);
    }
  }

  return [...new Set(errors)];
}

/**
 * @param {string} text
 * @returns {{ version: number | null, types: Record<string, { prefix: string | null, fields: string[], sections: string[] }> }}
 */
function parseTaxonomySummary(text) {
  /** @type {{ version: number | null, types: Record<string, { prefix: string | null, fields: string[], sections: string[] }> }} */
  const summary = { version: null, types: {} };
  let inAssetTypes = false;
  let current = null;
  /** @type {"fields" | "sections" | null} */
  let section = null;

  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const versionMatch = /^version:\s*(\d+)\s*$/.exec(raw);
    if (versionMatch !== null) {
      summary.version = Number(versionMatch[1]);
      continue;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*:/.test(raw)) {
      inAssetTypes = raw.startsWith("asset_types:");
      current = null;
      section = null;
      continue;
    }
    if (!inAssetTypes) continue;

    const typeMatch = /^ {2}([a-z_]+):\s*$/.exec(raw);
    if (typeMatch !== null) {
      current = typeMatch[1];
      summary.types[current] = { prefix: null, fields: [], sections: [] };
      section = null;
      continue;
    }
    if (current === null) continue;

    const prefixMatch = /^ {4}prefix:\s*(\S+)\s*$/.exec(raw);
    if (prefixMatch !== null) {
      summary.types[current].prefix = prefixMatch[1];
      continue;
    }
    if (/^ {4}requires_fields:\s*\[\s*\]\s*$/.test(raw)) {
      section = null;
      continue;
    }
    if (/^ {4}requires_sections:\s*\[\s*\]\s*$/.test(raw)) {
      section = null;
      continue;
    }
    if (/^ {4}requires_fields:\s*$/.test(raw)) {
      section = "fields";
      continue;
    }
    if (/^ {4}requires_sections:\s*$/.test(raw)) {
      section = "sections";
      continue;
    }
    if (/^ {4}[a-z_]+:/.test(raw)) {
      section = null;
      continue;
    }

    const itemMatch = /^ {6}- (.+?)\s*$/.exec(raw);
    if (itemMatch !== null && section !== null) {
      const list = section === "fields" ? summary.types[current].fields : summary.types[current].sections;
      list.push(itemMatch[1]);
    }
  }

  return summary;
}

/**
 * 校验发布版本（VERSION）与格式版本（taxonomy.version）的映射。
 * 两层版本的含义见 README 的「版本与兼容性」。
 * @param {string} versionText
 * @param {number} taxonomyVersion
 * @returns {string[]}
 */
function checkReleaseVersion(versionText, taxonomyVersion) {
  const trimmed = versionText.trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(trimmed);
  if (match === null) {
    return [`[VERSION_INVALID] VERSION 必须是 x.y.z，实际：${trimmed === "" ? "(空)" : trimmed}`];
  }
  const major = Number(match[1]);
  if (major !== taxonomyVersion) {
    return [
      `[VERSION_MISMATCH] VERSION=${trimmed} 的主版本 ${String(major)} 与格式版本 v${String(taxonomyVersion)} 不一致`,
    ];
  }
  return [];
}

/**
 * 证明版本检查不是只会变绿。
 * @returns {number}
 */
function runVersionSelfTest() {
  const cases = [
    { name: "主版本与格式版本不一致", text: "2.0.0", code: "VERSION_MISMATCH" },
    { name: "不是 x.y.z", text: "1.0", code: "VERSION_INVALID" },
    { name: "VERSION 为空", text: "", code: "VERSION_INVALID" },
  ];
  const failures = [];
  let caught = 0;

  if (checkReleaseVersion("1.0.0", 1).length > 0) {
    failures.push("基线 VERSION=1.0.0 / 格式 v1 应当是绿的");
  }
  for (const testCase of cases) {
    const errors = checkReleaseVersion(testCase.text, 1);
    if (hasCode(errors, testCase.code)) caught += 1;
    else failures.push(`变异“${testCase.name}”应当报 ${testCase.code}，实际：${errors.join("；") || "没有报错"}`);
  }

  if (failures.length > 0) {
    process.stderr.write(`✗ 版本口径自证失败：\n${failures.map((failure) => `  - ${failure}`).join("\n")}\n`);
    process.exitCode = 1;
    return 0;
  }

  process.stdout.write(
    `✓ 版本口径：${String(caught)}/${String(cases.length)} 个变异都被拦下（VERSION ↔ 格式版本）\n`,
  );
  return caught;
}

/**
 * @param {string[]} errors
 * @param {string} code
 * @returns {boolean}
 */
function hasCode(errors, code) {
  return errors.some((error) => error.startsWith(`[${code}]`));
}

/**
 * @param {Record<string, string>} examples
 * @param {string} label
 * @returns {number}
 */
function runSelfTest(examples, label) {
  const options = { root: ROOT, taxonomyVersion: 1, schema: SCHEMA };
  const decision = examples["decision"] ?? ".";
  const state = examples["state"] ?? ".";
  const rule = examples["rule"] ?? ".";
  if (examples["decision"] === undefined || examples["state"] === undefined || examples["rule"] === undefined) {
    process.stderr.write("✗ 自证需要 decision / state / rule 三种示例\n");
    process.exitCode = 1;
    return 0;
  }

  /** @type {Array<{ name: string, text: string, code: string }>} */
  const cases = [
    {
      name: "没有出处",
      text: decision.replace(
        'sources:\n  - "file://examples/sources/conversation.md#t:只定四种资产类型"\n  - "file://examples/sources/conversation.md#h:2026-11-06"\n',
        "sources: []\n",
      ),
      code: "PROV_NO_SOURCES",
    },
    {
      name: "ID 前缀与类型不一致",
      text: decision.replace("id: dec_", "id: rule_"),
      code: "ID_PREFIX_MISMATCH",
    },
    {
      name: "缺少必填章节",
      text: decision.replace("\n## 后果\n", "\n"),
      code: "REQUIRED_SECTION_MISSING",
    },
    {
      name: "state 缺少题面",
      text: state.replace('subject: "索引层存储后端"', "subject: null"),
      code: "REQUIRED_FIELD_MISSING",
    },
    {
      name: "rule 缺少事故",
      text: rule.replace(
        'origin_incident: "file://examples/sources/conversation.md#t:规则要绑一次事故"',
        "origin_incident: null",
      ),
      code: "REQUIRED_FIELD_MISSING",
    },
    {
      name: "不存在的日历日期",
      text: decision.replace('created: "2026-11-06"', 'created: "2026-02-30"'),
      code: "INVALID_DATE",
    },
    {
      name: "出处解析不到",
      text: decision.replace(
        '"file://examples/sources/conversation.md#t:只定四种资产类型"',
        '"file://examples/sources/missing.md#t:不存在的句子"',
      ),
      code: "PROV_SPAN_UNRESOLVED",
    },
    {
      name: "版本号不一致",
      text: decision.replace("schema_version: 1", "schema_version: 0"),
      code: "SCHEMA_VERSION_MISMATCH",
    },
    {
      name: "示例用了不可校验的 scheme",
      text: decision.replace(
        '"file://examples/sources/conversation.md#t:只定四种资产类型"',
        '"src://src_01M6QE3MZDZ9JE8EFMW27VAVKT#k:conv/msg_1"',
      ),
      code: "PROV_SCHEME_UNAVAILABLE",
    },
  ];

  let caught = 0;
  const failures = [];
  const baseline = validateAssetText(decision, options);
  if (baseline.length > 0) {
    failures.push(`基线样例应当是绿的，实际红了：${baseline.join("；")}`);
  }

  for (const testCase of cases) {
    const errors = validateAssetText(testCase.text, options);
    if (hasCode(errors, testCase.code)) caught += 1;
    else failures.push(`变异“${testCase.name}”应当报 ${testCase.code}，实际：${errors.join("；") || "没有报错"}`);
  }

  if (failures.length > 0) {
    process.stderr.write(`✗ 自证失败：\n${failures.map((failure) => `  - ${failure}`).join("\n")}\n`);
    process.exitCode = 1;
    return 0;
  }

  process.stdout.write(`✓ 自证：${String(caught)}/${String(cases.length)} 个变异都被拦下（${label}）\n`);
  return caught;
}

const exampleFiles = walk(EXAMPLES_ROOT).filter((file) => file.endsWith(".md"));
if (exampleFiles.length === 0) {
  process.stderr.write(`✗ 找不到示例：${EXAMPLES_ROOT}\n`);
  process.exit(1);
}

const taxonomy = parseTaxonomySummary(TAXONOMY_TEXT);
if (taxonomy.version === null) {
  process.stderr.write("✗ schema/taxonomy.yaml 里没有 version\n");
  process.exit(1);
}

/** @type {string[]} */
const errors = [];
if (taxonomy.version !== 1) {
  errors.push(`[TAXONOMY] version=${String(taxonomy.version)}，本规范校验器只认识 v1`);
}

const VERSION_PATH = join(ROOT, "VERSION");
if (!existsSync(VERSION_PATH)) {
  errors.push("[VERSION_MISSING] 找不到 VERSION 文件");
} else {
  errors.push(...checkReleaseVersion(readFileSync(VERSION_PATH, "utf8"), taxonomy.version));
}

for (const type of ASSET_TYPES) {
  const spec = taxonomy.types[type];
  if (spec === undefined) {
    errors.push(`[TAXONOMY] 缺少资产类型 ${type}`);
    continue;
  }
  if (spec.prefix !== ID_PREFIX[type]) {
    errors.push(`[TAXONOMY] ${type} 的前缀是 ${String(spec.prefix)}，期望 ${ID_PREFIX[type]}`);
  }
  const fields = [...spec.fields].sort(compareStrings).join(",");
  const expectedFields = [...REQUIRED_FIELDS[type]].sort(compareStrings).join(",");
  if (fields !== expectedFields) {
    errors.push(`[TAXONOMY] ${type}.requires_fields 是 [${fields}]，期望 [${expectedFields}]`);
  }
  const sections = [...spec.sections].sort(compareStrings).join(",");
  const expectedSections = [...REQUIRED_SECTIONS[type]].sort(compareStrings).join(",");
  if (sections !== expectedSections) {
    errors.push(`[TAXONOMY] ${type}.requires_sections 是 [${sections}]，期望 [${expectedSections}]`);
  }
}

const extraTypes = Object.keys(taxonomy.types).filter((type) => !ASSET_TYPES.includes(type));
for (const type of extraTypes.sort(compareStrings)) {
  errors.push(`[TAXONOMY] 出现了本校验器不认识的类型：${type}`);
}

/** @type {Record<string, string>} */
const examplesByType = {};
for (const file of exampleFiles) {
  const text = readFileSync(file, "utf8");
  const relativePath = relative(ROOT, file).split("\\").join("/");
  const fileErrors = validateAssetText(text, {
    root: ROOT,
    taxonomyVersion: taxonomy.version,
    schema: SCHEMA,
  });
  if (fileErrors.length > 0) {
    for (const error of fileErrors) errors.push(`[EXAMPLE ${relativePath}] ${error}`);
  }
  const parsed = parseFrontMatter(text);
  if (!("error" in parsed) && typeof parsed.data["type"] === "string") {
    const type = parsed.data["type"];
    if (type === "decision" || type === "state" || type === "event" || type === "rule") {
      examplesByType[type] = text;
    }
  }
}

for (const requiredType of ASSET_TYPES) {
  if (examplesByType[requiredType] === undefined) {
    errors.push(`[EXAMPLE] 缺少 ${requiredType} 类型的示例`);
  }
}

const caught = runSelfTest(examplesByType, "v1");
const versionCaught = runVersionSelfTest();

if (errors.length > 0) {
  process.stderr.write(`✗ 校验失败（${String(errors.length)} 项）：\n`);
  for (const error of errors) process.stderr.write(`  - ${error}\n`);
  process.exit(1);
}

process.stdout.write(
  `✓ schema v${String(taxonomy.version)} · taxonomy ${String(ASSET_TYPES.length)} 种类型 · examples ${String(exampleFiles.length)} 条 · 自证 ${String(caught)} 个变异 · 版本口径 ${String(versionCaught)} 个变异\n`,
);
