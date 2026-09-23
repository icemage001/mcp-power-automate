<p align="center">
  <img src="./assets/readme-banner.svg" alt="MCP Power Automate banner" width="100%" />
</p>

# MCP Power Automate

Local MCP server and Chromium extension for AI-operated Microsoft Power Automate flows.

The extension captures the browser session, current flow, snapshots, and token candidates automatically. The MCP server exposes one clean v1 tool surface so the AI can inspect, edit, validate, run, review, and revert flows without asking the user to click extension buttons just to make the connection work.

> No Microsoft Entra ID app registration, admin consent, or custom enterprise app setup is required.
> The MCP uses your existing logged-in Chromium session.

## What v1 Changes

- One command registry powers both MCP tools and HTTP bridge routes.
- The local bridge is authoritative; reused MCP instances proxy commands to the bridge owner.
- Flow targeting is automatic-first through captured tabs, explicit `connect_flow`, catalog data, and snapshots.
- The extension is status and diagnostics only. It no longer requires manual refresh/sync buttons for normal operation.
- npm ships the built server and built extension together.

## Install

Register the MCP:

```powershell
codex mcp add power-automate-local -- npx -y @kaael1/mcp-power-automate
```

Find the packaged extension path:

```powershell
npx -y @kaael1/mcp-power-automate extension-path
```

Load that folder in Chromium:

1. Open `chrome://extensions` or `edge://extensions`
2. Enable Developer Mode
3. Choose `Load unpacked`
4. Select the path printed by `extension-path`

Open or focus any Power Automate flow page. The extension captures the context automatically.

Check readiness:

```powershell
npx -y @kaael1/mcp-power-automate doctor
```

## Recommended AI Workflow

Ask your MCP client to:

1. `doctor`
2. `get_context`
3. `connect_flow`
4. Choose the exact `{envId, flowId}` target and call `get_flow` with it.
5. Call `preview_flow_update` with that target and the candidate definition; retain its `expectedFlowHash` and `previewHash`.
6. `validate_flow` for the same target.
7. `apply_flow_update` with the same target, candidate, and both preview hashes. If the preview reports high-risk changes, obtain explicit user approval before setting `confirmHighRisk: true`.
8. `get_last_update`

For run inspection and manual/request trigger tests, use `list_runs`, `get_latest_run`, `get_run`, `get_run_actions`, `wait_for_run`, `get_trigger_callback_url`, and `invoke_trigger`.

For Dataverse solution work, use `list_solutions`, `list_solution_components`, `list_environment_variables`, `add_flow_to_solution`, and `create_flow_in_solution`. Solution writes are intentionally limited to adding cloud flows to unmanaged solutions.

## Public v1 Tools

- `get_context`
- `doctor`
- `connect_flow`
- `list_flows`
- `list_solutions`
- `list_solution_components`
- `list_environment_variables`
- `add_flow_to_solution`
- `get_flow`
- `preview_flow_update`
- `validate_flow`
- `apply_flow_update`
- `get_flow_backups`
- `get_last_update`
- `revert_last_update`
- `list_runs`
- `get_latest_run`
- `get_run`
- `get_run_actions`
- `wait_for_run`
- `get_trigger_callback_url`
- `invoke_trigger`
- `create_flow`
- `create_flow_in_solution`
- `clone_flow`

## Solutions And Environment Variables

The extension can capture Power Platform/BAP and Dataverse-audience tokens from the logged-in browser session. When those tokens are present, `get_context` and `/health` expose `canManageSolutions` and the MCP can inspect Dataverse solutions for the current or provided environment.

The solution-oriented surface supports inspection plus one focused write path for unmanaged solutions:

- `list_solutions` lists visible unmanaged solutions by default.
- `list_solution_components` lists components for a solution unique name, with optional enrichment for cloud flows and environment variables.
- `list_environment_variables` lists environment variable definitions and current values, optionally scoped to one solution.
- `add_flow_to_solution` adds an existing cloud flow as a workflow component in an unmanaged solution.
- `create_flow_in_solution` creates a blank cloud flow in the current environment, then adds it to an unmanaged solution.

Write operations such as creating solutions, setting environment variable values, publishing customizations, deleting components, or deleting flows are not exposed in this phase. Managed solutions are rejected for flow-add operations.

## HTTP Bridge

The bridge listens on `127.0.0.1:17373`.

- `GET /health` is kept for simple probes.
- `GET /v1/health` returns bridge identity and readiness.
- `GET /v1/context` returns the same context used by the MCP.
- `GET /v1/commands` lists the public v1 command surface.
- `POST /v1/commands/:name` runs any public v1 command with a JSON body.

Only the process that owns the bridge port executes stateful work. Other MCP instances reuse the healthy bridge and proxy commands to it.

## Safety Model

- Flow edits, validation, trigger calls, and reverts require an explicit `{envId, flowId}` target. The captured session must be from the same environment.
- `preview_flow_update` returns `expectedFlowHash` for the live baseline and `previewHash` for that exact proposed definition. `apply_flow_update` rejects either stale or changed content and requires a live server read. A browser snapshot is not accepted as the edit baseline.
- Renames, trigger or connection changes, and bulk action removal are marked high risk and require the caller to set `confirmHighRisk: true` after user approval.
- A successful edit is read back from the requested flow and compared with the proposal before it is reported as saved. Legacy API fallback is limited to explicit endpoint compatibility failures.
- Each edit writes an append-only pre-update backup to local `data/flow-backups.json`. Use `get_flow_backups` to retrieve a prior definition; restore it with `apply_flow_update` after a fresh preview.
- Use `validate_flow` before and after meaningful edits when available.
- Use `get_last_update` to review the persisted diff.
- Use `get_flow` to capture the current `flowHash`, then pass it with the explicit target to `revert_last_update` if the saved result is wrong.
- Prefer test or staging flows before production flows.

The hash check catches changes made between preview and save. The current Power Automate request path does not use an ETag/conditional PATCH, so it cannot make the read-and-write sequence atomic against another client editing at the same moment.

If Power Automate rejects a save because of a connection permission problem, the MCP reports `CONNECTION_AUTHORIZATION_FAILED` and waits for the user to fix that connection in Power Automate. If the service rejects a field such as `retryPolicy`, the MCP reports `SCHEMA_VALIDATION_FAILED` with the rejected member so the AI can correct the candidate flow instead of guessing.

## Development

```powershell
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run pack:dry-run
```

For a local clone:

```powershell
npm run build
codex mcp add power-automate-local -- node C:\path\to\mcp-power-automate\dist\server\index.js
node C:\path\to\mcp-power-automate\dist\server\index.js extension-path
```

Runtime state lives in `data/` and must not be committed.

## Package Links

- GitHub: https://github.com/kaael1/mcp-power-automate
- npm: https://www.npmjs.com/package/@kaael1/mcp-power-automate
- MCP Registry: https://registry.modelcontextprotocol.io/v0/servers?search=io.github.kaael1/mcp-power-automate

## License

MIT. See [`LICENSE`](LICENSE).
