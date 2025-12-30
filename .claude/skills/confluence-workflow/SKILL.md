# Confluence Documentation Workflow

This skill provides knowledge about effective Confluence documentation practices and patterns.

## Skill Overview

**Purpose**: Help users create, organize, and maintain high-quality documentation in Confluence

**When to use**: When searching, creating, or organizing Confluence pages

## CQL Query Patterns

### Common Searches

```cql
# Recently updated pages in my space
type=page AND space=TEAM AND lastModified >= -7d ORDER BY lastModified DESC

# Pages created by me
type=page AND creator=currentUser() ORDER BY created DESC

# Pages I'm watching
type=page AND watcher=currentUser()

# Pages with specific label
type=page AND label="api-docs"

# Pages in specific space
type=page AND space=TECH ORDER BY title ASC

# Search by content
type=page AND text~"authentication"

# Pages modified by specific user
type=page AND contributor="john.doe@company.com"
```

### Advanced Searches

```cql
# Stale documentation (not updated in 6 months)
type=page AND space=TEAM AND lastModified < -180d

# Pages without labels
type=page AND space=TEAM AND label is NULL

# Recently created onboarding docs
type=page AND label="onboarding" AND created >= -30d

# API documentation across all spaces
type=page AND (text~"API" OR text~"endpoint") AND label="documentation"

# Pages with attachments
type=page AND attachment is not NULL
```

## Page Organization

### Space Structure

```
Company Wiki (Main Space)
├── Engineering
│   ├── Architecture
│   │   ├── System Design
│   │   ├── API Documentation
│   │   └── Database Schema
│   ├── Processes
│   │   ├── Development Workflow
│   │   ├── Code Review Guidelines
│   │   └── Release Process
│   └── Team Pages
│       ├── Team Alpha
│       └── Team Beta
├── Product
│   ├── Product Requirements
│   ├── User Research
│   └── Roadmap
└── Operations
    ├── Runbooks
    ├── Incident Reports
    └── On-Call Guides
```

### Page Hierarchy Best Practices

1. **Logical Grouping**: Group related content together
2. **Flat When Possible**: Avoid excessive nesting (max 3-4 levels)
3. **Clear Naming**: Use descriptive, searchable titles
4. **Landing Pages**: Create overview pages for each major section

## Page Creation Templates

### Technical Documentation Template

```markdown
# [Feature/Component Name]

## Overview
Brief description of what this is and why it exists.

## Architecture
High-level architecture diagram and explanation.

## Key Components
- **Component 1**: Description
- **Component 2**: Description

## API Reference
### Endpoints
- `GET /api/resource`: Description
- `POST /api/resource`: Description

### Request/Response Examples
```json
{
  "example": "data"
}
```

## Configuration
How to configure this feature/component.

## Troubleshooting
Common issues and solutions.

## Related Documentation
- [Link to related page 1]
- [Link to related page 2]

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2025-01-15 | User | Initial version |
```

### Runbook Template

```markdown
# [Service/System] Runbook

## Service Overview
What is this service? What does it do?

## Monitoring & Alerts
- **Dashboard**: [Link to dashboard]
- **Key Metrics**: List of important metrics
- **Alert Conditions**: When alerts fire

## Common Issues

### Issue 1: [Problem Description]
**Symptoms**: What you'll observe
**Cause**: Why this happens
**Resolution**:
1. Step 1
2. Step 2
3. Step 3

### Issue 2: [Problem Description]
[Same format as above]

## Escalation Path
1. On-call engineer
2. Team lead
3. Engineering manager

## Related Services
Dependencies and related systems.

## Contact Information
- **Owner**: Team Name
- **Slack Channel**: #team-channel
```

### Meeting Notes Template

```markdown
# [Meeting Name] - [Date]

**Attendees**: @person1, @person2, @person3
**Date**: YYYY-MM-DD
**Duration**: X minutes

## Agenda
1. Topic 1
2. Topic 2
3. Topic 3

## Discussion

### Topic 1
Notes from discussion...

**Decisions**:
- Decision 1
- Decision 2

**Action Items**:
- [ ] @person: Action item 1
- [ ] @person: Action item 2

### Topic 2
[Same format as above]

## Next Meeting
- **Date**: YYYY-MM-DD
- **Topics**: Preview of next agenda
```

### Project Documentation Template

```markdown
# [Project Name]

## Executive Summary
One-paragraph overview for stakeholders.

## Goals & Objectives
- Goal 1
- Goal 2
- Goal 3

## Scope
**In Scope**:
- Item 1
- Item 2

**Out of Scope**:
- Item 1
- Item 2

## Timeline
| Phase | Start Date | End Date | Status |
|-------|------------|----------|--------|
| Planning | YYYY-MM-DD | YYYY-MM-DD | ✅ Complete |
| Development | YYYY-MM-DD | YYYY-MM-DD | 🔄 In Progress |
| Testing | YYYY-MM-DD | YYYY-MM-DD | ⏳ Pending |

## Team
| Role | Name | Responsibilities |
|------|------|-----------------|
| Project Lead | @person | Overall delivery |
| Tech Lead | @person | Technical decisions |

## Technical Design
[Link to technical design doc]

## Risks & Mitigation
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Risk 1 | High | Medium | Strategy 1 |

## Success Metrics
- Metric 1: Target value
- Metric 2: Target value

## Resources
- [Jira Epic]
- [Design Mockups]
- [Technical Specs]
```

## Content Best Practices

### Writing Style

1. **Clear and Concise**: Avoid jargon unless necessary
2. **Scannable**: Use headings, bullets, and tables
3. **Up-to-date**: Include last updated date
4. **Actionable**: Provide clear next steps
5. **Visual**: Use diagrams and screenshots

### Formatting Guidelines

#### Use Headers Hierarchically

```markdown
# H1: Page Title (only one per page)
## H2: Major Sections
### H3: Subsections
#### H4: Detailed breakdowns (use sparingly)
```

#### Tables for Structured Data

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |
```

#### Code Blocks with Syntax Highlighting

```markdown
```python
def example():
    return "Use language-specific highlighting"
```
```

#### Callout Boxes

Use Confluence macros:
- **Info**: General information
- **Note**: Important points
- **Warning**: Cautions
- **Tip**: Helpful suggestions

### Linking Best Practices

1. **Internal Links**: Always link related pages
2. **Anchor Links**: Link to specific sections
3. **External Links**: Include context about what they link to
4. **Broken Links**: Regularly audit and fix

## Labels and Organization

### Recommended Label Categories

#### By Type
- `documentation`
- `runbook`
- `design-doc`
- `meeting-notes`
- `howto`

#### By Team/Product
- `team-alpha`
- `team-beta`
- `product-api`
- `product-web`

#### By Status
- `draft`
- `in-review`
- `approved`
- `archived`
- `outdated`

#### By Topic
- `onboarding`
- `architecture`
- `deployment`
- `troubleshooting`
- `security`

### Label Naming Convention

- Use lowercase
- Use hyphens for spaces
- Be specific but concise
- Maintain consistency across spaces

## Version Control

### Page Versioning

1. **Major Updates**: Note in page header
2. **Change Log**: Maintain table of changes
3. **Version History**: Use Confluence's built-in versioning
4. **Archive Old Versions**: Mark outdated content clearly

### Change Log Format

```markdown
## Change Log

| Date | Author | Change Summary |
|------|--------|---------------|
| 2025-01-15 | @user | Updated API endpoints |
| 2025-01-10 | @user | Added troubleshooting section |
| 2025-01-01 | @user | Initial version |
```

## Collaboration Features

### Page Comments

**When to use**:
- Asking questions
- Suggesting changes
- Providing feedback
- Discussing specific sections

**Best practices**:
- Be specific (quote the section)
- Resolve comments when addressed
- Use @mentions for specific people

### Page Reviews

**Review Process**:
1. Author creates page with `draft` label
2. Add reviewers as page watchers
3. Request reviews via comments
4. Address feedback
5. Mark as `approved` when ready

### Inline Comments

Use for:
- Section-specific feedback
- Collaborative editing
- Questions about specific content

## Search Optimization

### Make Pages Discoverable

1. **Descriptive Titles**: Include key searchable terms
2. **Excerpts**: Write clear page descriptions
3. **Labels**: Apply relevant labels
4. **Keywords**: Include important terms in first paragraph
5. **Links**: Well-linked pages rank higher in search

### Search Tips for Users

```cql
# Exact phrase search
type=page AND text~"exact phrase"

# Multiple terms
type=page AND text~"term1 AND term2"

# Exclude terms
type=page AND text~"term1 NOT term2"

# Within specific space
type=page AND space=TEAM AND text~"search term"
```

## Maintenance & Hygiene

### Regular Maintenance Tasks

#### Weekly
- [ ] Update pages with new information
- [ ] Respond to comments
- [ ] Review watched pages

#### Monthly
- [ ] Audit and update key documentation
- [ ] Clean up draft pages
- [ ] Review and update labels
- [ ] Fix broken links

#### Quarterly
- [ ] Archive outdated content
- [ ] Reorganize page structure if needed
- [ ] Update templates
- [ ] Review space permissions

### Archiving Process

1. **Identify outdated content**: Not updated in 6+ months
2. **Review for relevance**: Is it still needed?
3. **Mark as archived**: Add `archived` label
4. **Move to archive space**: If appropriate
5. **Add archive notice**: Banner at top of page

### Archive Notice Example

```markdown
⚠️ **ARCHIVED**: This page is no longer maintained as of YYYY-MM-DD.
For current information, see [Link to updated page].
```

## Macros and Formatting

### Useful Macros

1. **Table of Contents**: Auto-generate navigation
2. **Excerpt**: Create page summaries
3. **Include**: Embed content from other pages
4. **Code Block**: Format code with syntax highlighting
5. **Info/Warning/Note**: Callout boxes
6. **Status**: Visual status indicators
7. **Jira Issues**: Embed Jira tickets
8. **Recently Updated**: Show recent changes

### Status Indicators

Use status macros for visual clarity:
- 🟢 **Complete**: Finished work
- 🟡 **In Progress**: Ongoing work
- 🔴 **Blocked**: Waiting on something
- ⚪ **Not Started**: Future work

## Integration with Other Tools

### Jira Integration

- **Link Jira tickets**: Use Jira macro
- **Sprint planning pages**: Link sprint docs
- **Epic documentation**: One page per epic
- **Project pages**: Link project Jira board

### Code Repository Links

- **Link to code**: Reference specific files/commits
- **Pull request references**: Link PRs in design docs
- **Deployment docs**: Link to deployment configs

### Diagram Tools

- **Draw.io**: Built-in diagram editor
- **Gliffy**: Alternative diagram tool
- **Lucidchart**: Integration available
- **Mermaid**: For simple diagrams in markdown

## Tips for AI Assistants

When helping users with Confluence:

1. **Search effectively**: Use CQL to find exact matches
2. **Suggest structure**: Recommend page organization
3. **Provide templates**: Offer relevant templates
4. **Format properly**: Use markdown for clear formatting
5. **Add metadata**: Suggest appropriate labels
6. **Link related content**: Connect related pages
7. **Maintain consistency**: Follow existing patterns
8. **Check freshness**: Note when pages are outdated
9. **Encourage collaboration**: Use comments and reviews
10. **Optimize for search**: Include searchable terms

## Anti-Patterns to Avoid

### Don't

- ❌ Create duplicate pages for same topic
- ❌ Use Confluence as file storage (use attachments sparingly)
- ❌ Nest pages more than 4 levels deep
- ❌ Leave pages in draft state indefinitely
- ❌ Copy/paste from Word (formatting issues)
- ❌ Create orphan pages (not linked anywhere)
- ❌ Use vague page titles
- ❌ Skip labeling pages
- ❌ Forget to update outdated content

### Do

- ✅ Use consistent templates
- ✅ Link related pages
- ✅ Keep pages focused and concise
- ✅ Update regularly
- ✅ Use visual aids (diagrams, screenshots)
- ✅ Make pages scannable
- ✅ Add table of contents for long pages
- ✅ Archive obsolete content
- ✅ Use appropriate labels

## Quick Reference

### Most Useful CQL Fields

- `type`: Content type (page, blogpost, attachment)
- `space`: Space key
- `text`: Full-text search
- `title`: Page title
- `creator`: Page creator
- `contributor`: Anyone who edited
- `lastModified`: Last update date
- `created`: Creation date
- `label`: Page labels
- `watcher`: People watching

### Keyboard Shortcuts

- `e`: Edit page
- `c`: Create page
- `k`: Link to page
- `/`: Quick search
- `[`: Recent pages

### Common Macros

- `{toc}`: Table of contents
- `{info}`: Info callout
- `{code}`: Code block
- `{status}`: Status indicator
- `{excerpt}`: Page excerpt
