/**
 * Tool profiles exposed to AI clients through mcp-proxy.mjs.
 * REA 6.4.0 advertises 170 tools; many clients cap the tool count and smaller models pick
 * tools poorly from long lists, so "essential" keeps the everyday investigation path.
 */
export const TOOL_PROFILES = {
  essential: {
    label: "新手精选（约 40 个工具）",
    description: "覆盖文件盘点、JS/Electron、原生反编译核心、.NET、安卓、苹果、网页和手机基础操作。工具少，AI 更不容易选错，也不会超出部分客户端的工具数量上限。",
    tools: new Set([
      // any file
      "inspect_artifact",
      "extract_artifact",
      // JavaScript / Electron
      "analyze_javascript_application",
      "trace_application_feature",
      "trace_javascript_semantics",
      "recover_javascript_sources",
      // native binaries (needs Ghidra / Hopper / IDA)
      "open_binary",
      "close_binary",
      "binary_session",
      "binary_overview",
      "analyze_function",
      "procedure_pseudo_code",
      "batch_decompile",
      "list_procedures",
      "search_procedures",
      "search_strings",
      "procedure_callers",
      "procedure_callees",
      "xrefs",
      "trace_feature",
      // .NET
      "inspect_managed_artifact",
      "inspect_managed_members",
      // Android
      "inspect_android_package",
      "search_android_classes",
      "inspect_android_class",
      "inspect_android_method",
      "trace_android_references",
      "decode_android_resources",
      // Apple
      "inspect_macho",
      "inspect_signature",
      "inspect_plist",
      // Windows resources
      "inspect_pe_resources",
      // web
      "inspect_web_page",
      "analyze_web_bundle",
      "capture_web_screenshot",
      "inspect_web_network_capture",
      // phone / emulator
      "list_adb_devices",
      "list_adb_packages",
      "pull_adb_package",
    ]),
  },
  full: {
    label: "全部工具（170 个）",
    description: "REA 的完整能力，包括运行时观察、版本对比、固件、EVM 等进阶工具。适合 Claude、GPT 等大模型；部分客户端可能因工具太多而报错。",
    tools: null,
  },
};

export function profileAllows(profile, name) {
  const tools = TOOL_PROFILES[profile]?.tools;
  return !tools || tools.has(name);
}
