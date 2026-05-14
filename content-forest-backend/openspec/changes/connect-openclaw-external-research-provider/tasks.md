## 1. Configuration

- [x] 1.1 Extend backend app config with OpenClaw research settings and fallback provider setting.
- [x] 1.2 Add OpenClaw settings to `.env.example` without real secrets.
- [x] 1.3 Ensure config warnings are emitted for enabled OpenClaw when Gateway URL or token is missing.
- [x] 1.4 Ensure config and warnings never expose the OpenClaw auth token.

## 2. OpenClaw Client

- [x] 2.1 Add an OpenClaw Gateway client abstraction for running agent research instructions.
- [x] 2.2 Add OpenClaw session key generation using a ContentForest prefix and task/run entropy.
- [x] 2.3 Add OpenClaw session deletion support through the client.
- [x] 2.4 Ensure client timeout closes the active OpenClaw call and reports a unified provider timeout.
- [x] 2.5 Add fake OpenClaw client test doubles for success, failure, timeout, malformed output, and delete-session failure.

## 3. OpenClaw Provider

- [x] 3.1 Implement `OpenClawExternalResearchProvider` as a `NetworkProvider`.
- [x] 3.2 Reuse the external research package contract: summary, items, depositableBlocks, limitations.
- [x] 3.3 Map OpenClaw results to `RawNetworkResearchItem`, restricted statuses, and provider failures.
- [x] 3.4 Execute OpenClaw session deletion in a provider/client `finally` path.
- [x] 3.5 Record delete-session failure in脱敏 Trace or failure metadata without discarding successful research results.
- [x] 3.6 Ensure OpenClaw Provider never exposes session deletion as an Agent callable tool.

## 4. Provider Routing

- [x] 4.1 Update default network provider construction to support OpenClaw primary provider.
- [x] 4.2 Add Codex fallback provider execution when OpenClaw fails, times out, returns malformed output, or returns no usable content.
- [x] 4.3 Preserve Codex-only mode when configured.
- [x] 4.4 Preserve legacy local search/browser providers as explicitly enabled non-default providers.
- [x] 4.5 Ensure router trace records provider order, OpenClaw failure, Codex fallback, and final result counts.

## 5. Tests

- [x] 5.1 Add tests for OpenClaw successful research result normalization.
- [x] 5.2 Add tests for OpenClaw failure automatically falling back to Codex.
- [x] 5.3 Add tests for OpenClaw timeout falling back to Codex.
- [x] 5.4 Add tests ensuring OpenClaw session deletion runs after success and after failure.
- [x] 5.5 Add tests ensuring OpenClaw session deletion failure does not discard successful results.
- [x] 5.6 Add tests ensuring OpenClaw auth token is not present in failures, trace, or config warnings.
- [x] 5.7 Add tests ensuring Codex-only mode does not create OpenClaw sessions.

## 6. Documentation and Verification

- [x] 6.1 Update `docs/design/内容森林Agent架构设计文档.md` if needed to mention OpenClaw as another external Agent Provider.
- [x] 6.2 Update `docs/内容森林第二期开发规划文�?md` if needed to mention OpenClaw/Codex fallback under external Agent delegated research.
- [x] 6.3 Run `npm run typecheck`.
- [x] 6.4 Run `npm run lint`.
- [x] 6.5 Run `npm test`.
- [x] 6.6 Run `npx openspec validate connect-openclaw-external-research-provider --strict`.
