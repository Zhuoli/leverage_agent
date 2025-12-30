# Jira Workflow Best Practices

This skill provides knowledge about effective Jira workflows and best practices for managing work items.

## Skill Overview

**Purpose**: Help users efficiently manage Jira tickets with industry best practices

**When to use**: When creating, updating, or organizing Jira tickets

## JQL Query Patterns

### Common Queries

```jql
# My active sprint tasks
assignee = currentUser() AND sprint in openSprints() ORDER BY priority DESC

# High priority bugs
type = Bug AND priority in (Highest, High) AND status != Done

# Recently updated issues
assignee = currentUser() AND updated >= -7d ORDER BY updated DESC

# Blocked tasks
status = Blocked OR labels in (blocked, dependency)

# Tasks ready for review
status = "In Review" AND assignee = currentUser()

# Overdue tasks
due < now() AND status != Done

# Sprint planning
sprint in futureSprints() ORDER BY priority DESC, rank ASC

# Technical debt
labels = "tech-debt" AND status != Done
```

### Advanced Queries

```jql
# Tasks with no story points
assignee = currentUser() AND "Story Points" is EMPTY AND type = Story

# Cross-team dependencies
labels in (dependency, blocked) AND assignee = currentUser()

# Tasks waiting on external teams
status = "Waiting" AND labels = external-dependency

# Recently completed work
assignee = currentUser() AND status = Done AND resolved >= -14d
```

## Ticket Creation Best Practices

### Issue Summary Format

- **Good**: "Add authentication to user profile API endpoint"
- **Bad**: "Fix bug" or "Update code"

**Pattern**: `[Action Verb] + [What] + [Where/Context]`

### Description Template

```markdown
## Problem
Brief description of the issue or requirement.

## Expected Behavior
What should happen when this is implemented/fixed.

## Current Behavior
What's currently happening (for bugs).

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes
Any technical details, API references, or implementation suggestions.

## Dependencies
Links to related tickets or external dependencies.
```

### Issue Type Selection

- **Story**: New feature or functionality
- **Task**: Work that doesn't fit other categories
- **Bug**: Something broken that needs fixing
- **Epic**: Large initiative broken into multiple stories
- **Sub-task**: Part of a larger story or task

## Sprint Management

### Sprint Planning

1. **Capacity Planning**: Estimate team velocity based on historical data
2. **Prioritization**: High-value, high-priority items first
3. **Balanced Mix**: Bugs, features, tech debt
4. **Clear Goals**: Sprint goal defined and communicated

### Daily Standup Queries

```jql
# What I did yesterday
assignee = currentUser() AND updated >= -1d

# What I'm doing today
assignee = currentUser() AND status in ("In Progress", "In Review")

# Blockers
assignee = currentUser() AND (status = Blocked OR labels = blocked)
```

### Sprint Cleanup

```jql
# Unestimated stories
sprint in openSprints() AND "Story Points" is EMPTY

# Stale issues (no update in 7 days)
sprint in openSprints() AND updated < -7d

# Tasks without assignee
sprint in openSprints() AND assignee is EMPTY
```

## Status Transitions

### Typical Workflow

```
To Do → In Progress → In Review → Done
       ↓
    Blocked (when stuck)
       ↓
    In Progress (when unblocked)
```

### When to Use Each Status

- **To Do**: Work not yet started
- **In Progress**: Actively working on it
- **In Review**: Code/work ready for review
- **Blocked**: Waiting on dependency or blocker
- **Done**: Completed and verified

## Priority Guidelines

- **Highest (P0)**: Production down, critical bug
- **High (P1)**: Major feature, high-impact bug
- **Medium (P2)**: Standard work items
- **Low (P3)**: Nice to have, minor improvements
- **Lowest (P4)**: Future consideration

## Labels Best Practices

### Recommended Labels

- **Technical**: `backend`, `frontend`, `database`, `api`
- **Type**: `bug-fix`, `feature`, `refactor`, `tech-debt`
- **Status**: `blocked`, `needs-review`, `waiting-for-qa`
- **Priority**: `urgent`, `important`
- **Category**: `security`, `performance`, `accessibility`

### Label Naming Convention

- Use lowercase with hyphens
- Be specific but concise
- Avoid duplicating issue type or priority

## Comments Best Practices

### When to Comment

- Providing updates on progress
- Documenting decisions made
- Linking related information
- Explaining why something can't be done
- Requesting clarification

### Comment Format

```markdown
**Update**: [Brief summary]

Details about what was done or decided.

**Next Steps**: [What's happening next]
```

## Workflow Automation Tips

### Common Automations

1. **Auto-assign**: When status changes to "In Progress"
2. **Notify**: When issue is blocked
3. **Transition**: When PR is merged
4. **Update**: Parent epic when all sub-tasks complete

### JQL for Automation Rules

```jql
# Stale in-progress issues
status = "In Progress" AND updated < -3d

# Unassigned high priority
priority in (Highest, High) AND assignee is EMPTY

# Issues missing required fields
project = PROJ AND (description is EMPTY OR "Story Points" is EMPTY)
```

## Anti-Patterns to Avoid

### Don't

- ❌ Create vague tickets without clear acceptance criteria
- ❌ Assign multiple people to one ticket
- ❌ Leave tickets in "In Progress" for weeks
- ❌ Skip updating ticket status
- ❌ Put implementation details in the summary
- ❌ Use tickets as chat threads (use comments wisely)
- ❌ Create duplicate tickets without linking

### Do

- ✅ Break large tasks into manageable sub-tasks
- ✅ Keep tickets updated as work progresses
- ✅ Link related tickets and dependencies
- ✅ Use consistent naming conventions
- ✅ Add relevant labels for filtering
- ✅ Document decisions in comments
- ✅ Close tickets when truly done

## Ticket Hygiene

### Weekly Review Checklist

- [ ] Update status of all assigned tickets
- [ ] Add story points to unestimated stories
- [ ] Review and update blocked tickets
- [ ] Close completed tickets
- [ ] Link related tickets
- [ ] Add comments on progress
- [ ] Review sprint backlog

### Monthly Cleanup

- [ ] Archive or close stale tickets
- [ ] Update epic progress
- [ ] Review and refine backlog priorities
- [ ] Clean up obsolete labels
- [ ] Update ticket descriptions with new context

## Integration with Development

### Branch Naming

Link Git branches to tickets:
- `feature/PROJ-123-add-authentication`
- `bugfix/PROJ-456-fix-login-error`

### Commit Messages

Reference ticket in commits:
```
PROJ-123: Add JWT authentication to user API

- Implemented token generation
- Added authentication middleware
- Updated tests
```

### Pull Requests

Link PRs to Jira:
- Include ticket key in PR title
- Reference ticket in PR description
- Ensure CI/CD updates ticket status

## Team Communication

### Using Jira Effectively

1. **Stand-ups**: Reference ticket keys when discussing work
2. **Sprint Planning**: Review backlog in Jira
3. **Retrospectives**: Use Jira data to identify bottlenecks
4. **Reporting**: Generate burndown charts and velocity reports

### Stakeholder Updates

Create JQL filters for stakeholder views:
```jql
# Customer-facing features
project = PROJ AND labels = customer-facing AND status != Done

# Bug fix status
project = PROJ AND type = Bug AND created >= -30d
```

## Tips for AI Assistants

When helping users with Jira:

1. **Always use JQL** for searches rather than manual filtering
2. **Suggest specific queries** based on user's intent
3. **Format results clearly** with ticket keys, summaries, and links
4. **Provide context** about priorities and status
5. **Recommend actions** based on ticket state
6. **Link related tickets** when creating new ones
7. **Follow naming conventions** for consistency
8. **Add appropriate labels** based on ticket content
9. **Set realistic priorities** based on impact and urgency
10. **Include acceptance criteria** for all stories

## Quick Reference

### Most Useful JQL Functions

- `currentUser()`: Current logged-in user
- `openSprints()`: Active sprints
- `futureSprints()`: Upcoming sprints
- `now()`: Current date/time
- `-7d`, `-1w`, `-1M`: Relative dates

### Most Common Fields

- `assignee`: Who is working on it
- `status`: Current workflow state
- `priority`: Importance level
- `sprint`: Associated sprint
- `labels`: Tags for categorization
- `created`, `updated`, `resolved`: Timestamps

### Keyboard Shortcuts (Jira Cloud)

- `c`: Create issue
- `g` + `i`: Go to issue navigator
- `/`: Quick search
- `e`: Edit issue
- `.`: Quick actions menu
