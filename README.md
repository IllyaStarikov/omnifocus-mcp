# OmniFocus MCP Server

A Model Context Protocol (MCP) server that provides full CRUD access to OmniFocus via the Omni Automation API. Exposes 32 tools across 7 domains for AI assistants to manage tasks, projects, folders, tags, and perspectives.

## Requirements

- macOS (OmniFocus is macOS/iOS only)
- OmniFocus 4 (or OmniFocus 3 with Omni Automation support)
- Node.js >= 18
- Automation permission granted to the calling terminal in System Settings > Privacy & Security > Automation

## Installation

```bash
cd mcp
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/dist/index.js"]
    }
  }
}
```

### Claude Code

Add to your project's `.claude/settings.json` or global settings:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/dist/index.js"]
    }
  }
}
```

## Tools Reference

### Database (2 tools)
| Tool | Description |
|------|-------------|
| `get_database_summary` | Get counts of inbox items, projects, tags, folders, and task statistics |
| `search` | Search across all items by name or note content |

### Tasks (12 tools)
| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with filters (status, flagged, tags, project, dates, search, pagination) |
| `get_task` | Get a specific task by ID |
| `create_task` | Create a task (inbox or in a project, with tags) |
| `update_task` | Update task properties |
| `complete_task` | Mark a task as completed |
| `uncomplete_task` | Re-open a completed task |
| `drop_task` | Mark a task as dropped |
| `delete_task` | Permanently delete a task |
| `move_tasks` | Move tasks to a project or parent task |
| `duplicate_tasks` | Duplicate tasks |
| `set_task_tags` | Set, add, or remove tags on a task |
| `add_task_notification` | Add absolute or relative notifications |

### Projects (8 tools)
| Tool | Description |
|------|-------------|
| `list_projects` | List projects with filters (status, folder, search, pagination) |
| `get_project` | Get a project by ID or name |
| `create_project` | Create a project with options (folder, sequential, SAL, tags, review) |
| `update_project` | Update project properties |
| `complete_project` | Mark a project as done |
| `delete_project` | Permanently delete a project |
| `get_review_queue` | Get projects due for review |
| `mark_reviewed` | Mark a project as reviewed |

### Folders (4 tools)
| Tool | Description |
|------|-------------|
| `list_folders` | List all folders |
| `create_folder` | Create a folder (supports nesting) |
| `update_folder` | Update folder name |
| `delete_folder` | Permanently delete a folder |

### Tags (4 tools)
| Tool | Description |
|------|-------------|
| `list_tags` | List all tags |
| `create_tag` | Create a tag (supports nesting, allowsNextAction) |
| `update_tag` | Update tag properties |
| `delete_tag` | Permanently delete a tag |

### Perspectives (2 tools)
| Tool | Description |
|------|-------------|
| `list_perspectives` | List all custom perspectives |
| `get_perspective_tasks` | Get tasks shown in a perspective |

## Development

```bash
npm run dev        # Run with tsx (hot reload)
npm run build      # Compile TypeScript
npm test           # Run unit tests
npm run test:watch # Watch mode
```

### Live Integration Tests

Tests against a real OmniFocus instance (creates and cleans up test items):

```bash
OMNIFOCUS_LIVE=1 npm run test:integration
```

### Architecture

- **Executor Bridge**: OmniJS scripts run inside OmniFocus via `osascript -l JavaScript` (JXA). Scripts are embedded safely using `JSON.stringify` to prevent injection.
- **Cache**: TTL-based in-memory cache (10s tasks, 30s projects, 60s folders/tags). All write operations invalidate relevant cache prefixes.
- **Error Hierarchy**: Typed errors for common failure modes (NotRunning, Permission, NotFound, Timeout, ScriptError) with retryability hints.

## Limitations

- macOS only (requires `osascript`)
- OmniFocus must be running for all operations
- Automation permission must be granted in System Settings
- Perspective task retrieval requires an open OmniFocus window
- Cache may briefly serve stale data after external changes to OmniFocus
