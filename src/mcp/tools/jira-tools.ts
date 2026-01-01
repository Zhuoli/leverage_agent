import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { JiraClient } from '../../api/jira-client.js';
import type { Config } from '../../config/index.js';
import { JIRA_TOOLS } from '../atlassian-types.js';

/**
 * Register all Jira MCP tools with the server
 */
export function registerJiraTools(server: Server, config: Config) {
  const jiraClient = new JiraClient(config);

  // Tool 1: search_jira_tickets
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'search_jira_tickets') {
      const { jql, max_results = 50 } = request.params.arguments as any;

      if (!jql) {
        return {
          content: [{ type: 'text', text: "Error: 'jql' parameter is required" }],
        };
      }

      try {
        const issues = await jiraClient.searchJiraTickets(jql, max_results);
        const formatted = issues.map((issue) => jiraClient.formatIssue(issue));

        if (formatted.length === 0) {
          return {
            content: [{ type: 'text', text: 'No issues found matching the query.' }],
          };
        }

        let result = `Found ${formatted.length} issue(s):\n\n`;
        formatted.forEach((issue, i) => {
          result += `${i + 1}. [${issue.key}] ${issue.summary}\n`;
          result += `   Status: ${issue.status} | Priority: ${issue.priority}\n`;
          result += `   Type: ${issue.issue_type} | Assignee: ${issue.assignee}\n`;
          if (issue.sprint) {
            result += `   Sprint: ${issue.sprint}\n`;
          }
          result += `   URL: ${issue.url}\n\n`;
        });

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error searching Jira tickets: ${error}` }],
        };
      }
    }

    // Tool 2: create_jira_ticket
    if (request.params.name === 'create_jira_ticket') {
      const { project_key, summary, description, issue_type = 'Task' } = request.params
        .arguments as any;

      if (!project_key || !summary || !description) {
        return {
          content: [
            {
              type: 'text',
              text: "Error: 'project_key', 'summary', and 'description' are required",
            },
          ],
        };
      }

      try {
        const issue = await jiraClient.createJiraTicket(
          project_key,
          summary,
          description,
          issue_type
        );
        const issueKey = issue.key || 'Unknown';
        const url = `${config.jiraUrl}/browse/${issueKey}`;

        const result =
          `✓ Created Jira ticket: ${issueKey}\n` +
          `Summary: ${summary}\n` +
          `Type: ${issue_type}\n` +
          `URL: ${url}\n`;

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error creating Jira ticket: ${error}` }],
        };
      }
    }

    // Tool 3: update_jira_ticket
    if (request.params.name === 'update_jira_ticket') {
      const { issue_key, summary, description } = request.params.arguments as any;

      if (!issue_key) {
        return {
          content: [{ type: 'text', text: "Error: 'issue_key' is required" }],
        };
      }

      const fields: Record<string, any> = {};
      if (summary) fields.summary = summary;
      if (description) fields.description = description;

      if (Object.keys(fields).length === 0) {
        return {
          content: [
            { type: 'text', text: 'Error: At least one field to update must be provided' },
          ],
        };
      }

      try {
        const issue = await jiraClient.updateJiraTicket(issue_key, fields);
        const formatted = jiraClient.formatIssue(issue);

        const result =
          `✓ Updated Jira ticket: ${issue_key}\n` +
          `Summary: ${formatted.summary}\n` +
          `Status: ${formatted.status}\n` +
          `URL: ${formatted.url}\n`;

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error updating Jira ticket: ${error}` }],
        };
      }
    }

    // Tool 4: add_jira_comment
    if (request.params.name === 'add_jira_comment') {
      const { issue_key, comment } = request.params.arguments as any;

      if (!issue_key || !comment) {
        return {
          content: [{ type: 'text', text: "Error: 'issue_key' and 'comment' are required" }],
        };
      }

      try {
        await jiraClient.addJiraComment(issue_key, comment);

        const result =
          `✓ Added comment to Jira ticket: ${issue_key}\n` +
          `Comment: ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}\n`;

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error adding comment to Jira ticket: ${error}` }],
        };
      }
    }

    // Tool 5: get_my_sprint_tasks
    if (request.params.name === 'get_my_sprint_tasks') {
      const { include_future_sprints = false, max_results = 50 } = request.params.arguments as any;

      try {
        const issues = await jiraClient.getSprintIssues(include_future_sprints, max_results);
        const formatted = issues.map((issue) => jiraClient.formatIssue(issue));

        if (formatted.length === 0) {
          return {
            content: [{ type: 'text', text: 'No sprint tasks found.' }],
          };
        }

        let result = `Found ${formatted.length} sprint task(s):\n\n`;
        formatted.forEach((issue, i) => {
          result += `${i + 1}. [${issue.key}] ${issue.summary}\n`;
          result += `   Status: ${issue.status} | Priority: ${issue.priority}\n`;
          if (issue.sprint) {
            result += `   Sprint: ${issue.sprint}\n`;
          }
          if (issue.story_points) {
            result += `   Story Points: ${issue.story_points}\n`;
          }
          result += `   URL: ${issue.url}\n\n`;
        });

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error getting sprint tasks: ${error}` }],
        };
      }
    }

    // Return null if tool not handled (will be caught by router)
    return { content: [{ type: 'text', text: 'Unknown tool' }] };
  });
}
