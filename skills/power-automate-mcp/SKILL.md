---
name: power-automate-mcp
description: Use when working with Power Automate flows through the v1 local MCP server from this repository. Covers automatic browser-backed connection, reading, validating, editing, running, inspecting, and reverting flows.
---

# Power Automate MCP

Use this skill when the user wants AI help with Microsoft Power Automate flows through the local MCP server and Chromium extension from this repository.

The extension is a passive capture and status surface. Do not ask the user to click extension buttons to make normal MCP work proceed. The AI should operate through MCP tools.

Provider notes live in [references/providers.md](references/providers.md).

## Operating Rules

1. Start with `doctor` or `get_context`.
2. Use `connect_flow` when the target is not already explicit.
3. Identify the target by both `envId` and `flowId`; do not use a name or browser tab as write authorization.
4. Call `get_flow` for that explicit target before edits.
5. Call `preview_flow_update` with the same target and candidate definition before saving. Keep its `expectedFlowHash` and `previewHash` with that exact proposal.
6. Call `validate_flow` with the same explicit target before and after save when available.
7. If `highRiskReasons` is non-empty, explain the exact changes and obtain the user's explicit approval before proceeding. Then call `apply_flow_update` with the same target, candidate definition, both hashes, and `confirmHighRisk: true`. If it reports that the flow changed, fetch and preview again.
8. Call `get_last_update` after save and summarize the review diff.
9. Use `get_flow_backups` to inspect immutable pre-update backups for that target.
10. To revert the last edit, call `get_flow` for the explicit target and pass its current `flowHash` to `revert_last_update`. If the tool reports high-risk changes, review `get_last_update`, obtain explicit user approval, then retry with `confirmHighRisk: true`.
11. Pass an explicit target to `invoke_trigger`; it runs the flow and may cause business side effects.
12. Prefer test or staging flows before production flows.

## Recommended Workflows

### Inspection

1. `doctor`
2. `get_context`
3. `connect_flow` if needed
4. `get_flow`
5. `list_runs` or `get_latest_run` if run history matters
6. `get_run_actions` when a run needs action-level triage

### Solution Work

Use solution write tools only for unmanaged solutions and only when adding cloud flows is the intended change.

1. `doctor`
2. `get_context`
3. Confirm `canManageSolutions.available` is true, or follow its reason before retrying.
4. `list_solutions`
5. `list_solution_components` when a specific solution needs component inventory.
6. `list_environment_variables` when environment variable definitions or current values matter.
7. `add_flow_to_solution` for an existing flow, or `create_flow_in_solution` when a new blank flow should be created and added.

### Safe Edit

1. `doctor`
2. `connect_flow`
3. Set `{envId, flowId}` explicitly from the intended flow.
4. `get_flow` for that explicit target; retain its `flowHash` for potential revert.
5. Build the smallest candidate flow change.
6. `preview_flow_update` for that target and candidate.
7. `validate_flow` for that target.
8. `apply_flow_update` with both preview hashes, the same target, and the same candidate. If high-risk changes are reported, pause for the user's explicit approval.
9. `get_last_update`
10. `validate_flow` again when available

### Manual Trigger Test

Use only when the trigger is manual/request based and the payload is safe.

1. `get_flow` for an explicit `{envId, flowId}`
2. `get_trigger_callback_url` for that same target
3. `invoke_trigger` with that same target
4. `wait_for_run`
5. `get_run`
6. `get_run_actions`

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

## Error Guidance

- `LEGACY_TOKEN_MISSING`: deeper flow-service operations need a compatible browser token. Focus or reopen a real flow page so the extension can capture it automatically.
- `AUTHENTICATION_FAILED`: the captured token was rejected for that endpoint. Reopen or focus the flow page and retry after capture.
- `BAP_TOKEN_MISSING`: solution inspection needs a Power Platform/BAP token. Open make.powerapps.com or make.powerautomate.com in the target environment with the extension enabled.
- `DATAVERSE_TOKEN_MISSING`: solution inspection needs a token for the Dataverse org. Open the Dataverse org or a model-driven app in that environment with the extension enabled.
- `SCHEMA_VALIDATION_FAILED`: fix the candidate flow JSON. If details include a rejected member such as `retryPolicy`, remove or relocate that field intentionally.
- `CONNECTION_AUTHORIZATION_FAILED`: stop retrying saves. The user must fix the named connector or connection permissions in Power Automate.
- `FLOW_NOT_FOUND`: call `list_flows` and `connect_flow`; browser-captured flows may still be usable even when the live catalog is stale.

## Good Prompts

- "Inspect the connected flow and explain what it does."
- "Connect to the flow whose name contains invoices, then validate it."
- "Preview the smallest change needed, validate it, save it, and show me the review diff."
- "Run a safe test payload through this request-triggered flow and tell me which action failed."

## Production Warning

This MCP can perform real edits. Keep production work supervised, review diffs after save, and use staging flows whenever possible.

Solution writes are limited to `add_flow_to_solution` and `create_flow_in_solution` for unmanaged solutions. Do not invent or simulate unsupported write operations such as creating solutions, setting environment variable values, publishing customizations, deleting solution components, or deleting flows.
