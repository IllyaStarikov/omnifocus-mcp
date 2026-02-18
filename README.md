# omnifocus-mcp-server

Feature-complete [Model Context Protocol](https://modelcontextprotocol.io/) server for [OmniFocus](https://www.omnigroup.com/omnifocus). Full CRUD access to tasks, projects, folders, tags, and perspectives — 50 tools, 2 resources, and 3 prompts.

## Install

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-server"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add omnifocus -- npx -y omnifocus-mcp-server
```

Or add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-server"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-server"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-server"]
    }
  }
}
```

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.omnifocus]
command = "npx"
args = ["-y", "omnifocus-mcp-server"]
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-server"]
    }
  }
}
```

## Requirements

- macOS (OmniFocus is macOS-only)
- OmniFocus 4 (or OmniFocus 3 with Omni Automation support)
- Node.js >= 18
- Automation permission granted in System Settings > Privacy & Security > Automation

## Tools (50)

### Tasks (23)

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with filters for status, flags, tags, projects, date ranges, and text search |
| `get_task` | Get task details by ID, optionally including subtask hierarchy |
| `create_task` | Create a task in inbox or a project, with tags, dates, and recurrence |
| `update_task` | Update task properties (name, note, dates, flags, recurrence) |
| `complete_task` | Mark a task as completed |
| `uncomplete_task` | Re-open a completed task |
| `drop_task` | Mark a task as dropped (cancelled) |
| `delete_task` | Permanently delete a task |
| `move_tasks` | Move tasks to a different project, parent task, or inbox |
| `duplicate_tasks` | Duplicate tasks, optionally into a different project |
| `set_task_tags` | Set, add, or remove tags on a task |
| `add_task_notification` | Add an absolute or due-relative notification |
| `remove_task_notification` | Remove a notification from a task |
| `list_task_notifications` | List all notifications on a task |
| `append_task_note` | Append text to a task's note |
| `get_inbox_tasks` | Get all inbox tasks |
| `get_flagged_tasks` | Get all available flagged tasks |
| `get_today_completed_tasks` | Get tasks completed today |
| `get_task_count` | Count tasks matching filters (faster than list) |
| `convert_task_to_project` | Convert a task into a project, preserving subtasks |
| `batch_create_tasks` | Create multiple tasks at once with subtask hierarchies |
| `batch_complete_tasks` | Complete multiple tasks at once |
| `batch_delete_tasks` | Delete multiple tasks at once |

### Projects (11)

| Tool | Description |
|------|-------------|
| `list_projects` | List projects with filters for status, folder, and text search |
| `get_project` | Get project details by ID or name |
| `create_project` | Create a project with folder, sequential, SAL, tags, and review options |
| `update_project` | Update project properties |
| `complete_project` | Mark a project as done |
| `drop_project` | Mark a project as dropped (cancelled) |
| `move_project` | Move a project to a different folder |
| `delete_project` | Permanently delete a project |
| `get_project_tasks` | Get all tasks in a project |
| `get_review_queue` | Get projects due for review |
| `mark_reviewed` | Mark a project as reviewed |

### Folders (5)

| Tool | Description |
|------|-------------|
| `list_folders` | List all folders |
| `get_folder` | Get folder details including child folders and projects |
| `create_folder` | Create a folder (supports nesting) |
| `update_folder` | Update folder name or status |
| `delete_folder` | Permanently delete a folder |

### Tags (5)

| Tool | Description |
|------|-------------|
| `list_tags` | List all tags |
| `get_tag` | Get tag details including child tags |
| `create_tag` | Create a tag (supports nesting and allowsNextAction) |
| `update_tag` | Update tag properties |
| `delete_tag` | Permanently delete a tag |

### Perspectives (2)

| Tool | Description |
|------|-------------|
| `list_perspectives` | List perspectives (built-in and/or custom) |
| `get_perspective_tasks` | Get tasks shown in a specific perspective |

### Database (4)

| Tool | Description |
|------|-------------|
| `get_database_summary` | Get counts of inbox items, projects, tags, folders, and task statistics |
| `search` | Search across all items (tasks, projects, folders, tags) by name or note |
| `dump_database` | Dump the entire database in a single call |
| `save_database` | Explicitly save the database to disk |

## Resources

| URI | Description |
|-----|-------------|
| `omnifocus://database/summary` | Database summary with counts |
| `omnifocus://perspectives` | List of all perspectives |

## Prompts

| Prompt | Description |
|--------|-------------|
| `weekly-review` | Guided weekly review of projects and tasks |
| `inbox-processing` | Process inbox items using GTD methodology |
| `daily-planning` | Plan today's tasks based on due dates, flags, and completions |

## Development

```bash
npm install
npm run build      # Compile TypeScript
npm run dev        # Run with tsx (hot reload)
npm test           # Run unit tests
npm run test:watch # Watch mode
```

### Integration Tests

Tests against a real OmniFocus instance (creates and cleans up test items):

```bash
OMNIFOCUS_LIVE=1 npm run test:integration
```

## License

MIT
