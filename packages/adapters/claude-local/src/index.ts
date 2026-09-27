export const DEFAULT_CLAUDE_LOCAL_MODEL = "claude-opus-5";

/** Resolve Paperclip's default without replacing an explicit provider model. */
export function resolveClaudeModel(
  model: unknown,
  env: Record<string, unknown> = {},
): string {
  const configured = typeof model === "string" ? model.trim() : "";
  if (configured) return configured;
  const environmentModel = typeof env.ANTHROPIC_MODEL === "string" ? env.ANTHROPIC_MODEL.trim() : "";
  if (environmentModel) return environmentModel;
  // These providers use their own model IDs and region-specific defaults.
  const providerFlag = (value: unknown) => value === "1" || value === "true";
  if (
    providerFlag(env.CLAUDE_CODE_USE_BEDROCK)
    || providerFlag(env.CLAUDE_CODE_USE_VERTEX)
    || (typeof env.ANTHROPIC_BEDROCK_BASE_URL === "string" && env.ANTHROPIC_BEDROCK_BASE_URL.trim())
  ) {
    return "";
  }
  return DEFAULT_CLAUDE_LOCAL_MODEL;
}

export const type = "claude_local";

export function claudeLocalReasoningEffortsForModel(model: string): readonly string[] {
  const id = model.trim().replace(/\[1m\]$/, "").replace(/^(?:(?:us|eu|apac|global)\.)?anthropic\./, "");
  if (/^claude-haiku-/.test(id)) return [];
  if (/^claude-(?:opus-5(?:-5)?|opus-4-[78]|sonnet-5|fable-5(?:-1)?)$/.test(id)) {
    return ["low", "medium", "high", "xhigh", "max"];
  }
  if (/^claude-(?:opus|sonnet)-4-6(?:-v1)?$/.test(id)) return ["low", "medium", "high", "max"];
  return ["low", "medium", "high"];
}
export const label = "Claude Code";

export const SANDBOX_INSTALL_COMMAND = "npm install -g @anthropic-ai/claude-code";

export const models = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1" },
  { id: "claude-fable-5", label: "Claude Fable 5" },
  { id: "claude-mythos-5", label: "Claude Mythos 5" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
  { id: "claude-opus-5", label: "Claude Opus 5" },
  { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

export const agentConfigurationDoc = `# claude_local agent configuration

Adapter: claude_local

Core fields:
- engine (string, optional): defaults to ACP, including legacy unset/"auto" values. Missing prerequisites and execution failures fail the run without changing engines. Set "cli" to explicitly select the CLI engine.
- cwd (string, optional): default absolute working directory fallback for the agent process (created if missing when possible)
- instructionsFilePath (string, optional): absolute path to a markdown instructions file injected at runtime
- model (string, optional): Claude model id. Missing or blank defaults to ${DEFAULT_CLAUDE_LOCAL_MODEL} in both CLI and ACP, including existing agents. Explicit model IDs and ANTHROPIC_MODEL overrides are preserved. Bedrock/Vertex without an explicit model retain their provider default.
- effort (string, optional): model-specific reasoning effort passed via --effort (low|medium|high; current Opus, Sonnet 5, and Fable models also support xhigh|max)
- chrome (boolean, optional): pass --chrome when running Claude
- promptTemplate (string, optional): run prompt template
- maxTurnsPerRun (number, optional): max turns for one run
- dangerouslySkipPermissions (boolean, optional, default true): allow non-interactive Claude runs to proceed without approval prompts. Local and remote targets receive --dangerously-skip-permissions for all built-in and connected tools. Managed sandbox targets also identify themselves to Claude so root container launches support bypass. Non-sandbox root processes must run Claude as a non-root user; Paperclip does not silently downgrade the requested mode.
- outputInactivityTimeoutMs (number | null, optional): output-inactivity monitor around the claude child. Resets on every line of stdout that parses as JSON (claude runs with --output-format stream-json, so every system/assistant/user/result event — including the assistant turns that carry thinking output — counts). Defaults to 15 * 60_000 ms when unset or non-positive. Set to \`null\` to disable the monitor entirely (only do this for known-slow tasks; the platform-level silent-run safety net still applies). On fire, the adapter sends SIGTERM to the process group, waits 5s, then SIGKILL, and surfaces the run as failed with errorMessage "monitor: no claude output for {N}m {S}s" (errorCode claude_output_inactivity_monitor) so the run is retried, not left holding its slot.
- runWallClockTimeoutSec (number | null, optional): run-level wall-clock cap backstop for the streaming inference process. Only applies when timeoutSec is unset/0 (the historical "disabled for local" case); an explicit timeoutSec or a sandbox default takes precedence. Defaults to 4 * 60 * 60 s (aligns with the platform-level 4h critical silent-run monitor) when unset or non-positive. Set to \`null\` to disable the cap (a hung run is then only reaped by the platform-level safety net).
- command (string, optional): defaults to "claude"
- extraArgs (string[], optional): additional CLI args
- env (object, optional): KEY=VALUE environment variables
- workspaceStrategy (object, optional): execution workspace strategy; currently supports { type: "git_worktree", baseRef?, branchTemplate?, worktreeParentDir? }
- workspaceRuntime (object, optional): reserved for workspace runtime metadata; workspace runtime services are manually controlled from the workspace UI and are not auto-started by heartbeats
- filesystemScope (string, optional): set to "workspace" to confine local CLI filesystem access with Bubblewrap. Off by default. The workspace and Claude config remain writable; other host paths are hidden.
- filesystemExtraPaths (array, optional): additional absolute host paths exposed inside the workspace sandbox. String entries are read-only; object entries use { path: "/absolute/path", access: "ro" | "rw" }.
- filesystemSandboxCommand (string, optional): Bubblewrap executable name or absolute path; defaults to "bwrap". Linux only.
- networkScope (string, optional): "deny" blocks all network egress; "allowlist" permits only networkAllowlist targets through Paperclip's HTTP(S) proxy. Off by default.
- networkAllowlist (string[], optional): exact hostnames, hostname:port entries, or origin URLs. Include the configured Claude provider origin, such as "api.anthropic.com", Bedrock/Vertex endpoints, or a custom gateway.

ACP fields (only when engine="acp"):
- agentCommand (string, optional): override for the Claude ACP server command; defaults to the package-local claude-agent-acp binary
- mode (string, optional, default "persistent"): ACP session mode ("persistent" or "oneshot")
- stateDir (string, optional): ACP session state directory; defaults to Paperclip-managed company/agent scoped storage
- nonInteractivePermissions (string, optional, default "deny"): fallback when the ACP agent asks for input outside an interactive session
- warmHandleIdleMs (number, optional, default 0): keep the ACP process warm for this many ms after a successful run

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds

Notes:
- Claude Opus 5.5 uses model ID \`claude-opus-5-5\` and requires Claude Code v2.1.280 or later.
- filesystemScope and networkScope are spawn-level confinement and are orthogonal to Claude permission flags. Both require Bubblewrap on the host and explicit engine="cli"; default or explicit ACP is rejected because ACP confinement is not yet supported. networkScope="allowlist" injects HTTP_PROXY/HTTPS_PROXY for the CLI while its private network namespace blocks direct sockets, so every required provider/API hostname must be listed explicitly.
- The Claude ACP lane requires Node >=24.11.0 and @agentclientprotocol/claude-agent-acp to be installed with this adapter package. Missing prerequisites fail both default and explicit ACP runs with an actionable setup error; the adapter never switches engines automatically.
- For ACP runs, model selection is passed through ANTHROPIC_MODEL at ACP server startup; Paperclip-managed Claude permissions and ephemeral skill materialization are handled by the shared ACP engine.
- When Paperclip realizes a workspace/runtime for a run, it injects PAPERCLIP_WORKSPACE_* and PAPERCLIP_RUNTIME_* env vars for agent-side tooling.
`;
