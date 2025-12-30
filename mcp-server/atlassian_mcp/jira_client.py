from typing import List, Dict, Any, Optional
from atlassian import Jira
from .config import Config


class JiraClient:
    """Client for interacting with Jira via REST API"""

    def __init__(self, config: Config):
        self.config = config
        self.client = Jira(
            url=config.jira_url,
            username=config.jira_username,
            password=config.jira_api_token,
            cloud=False  # Set to False for self-hosted/enterprise instances
        )
        self.user_email = config.user_email

    def search_jira_tickets(
        self,
        jql: str,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search for Jira tickets using JQL

        Args:
            jql: JQL query string
            max_results: Maximum number of results to return

        Returns:
            List of issues
        """
        try:
            results = self.client.jql(jql, limit=max_results)
            return results.get('issues', [])
        except Exception as e:
            raise RuntimeError(f"Failed to search Jira tickets: {e}")

    def get_my_issues(
        self,
        max_results: int = 50,
        additional_jql: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get issues assigned to the current user

        Args:
            max_results: Maximum number of results to return
            additional_jql: Optional additional JQL filters

        Returns:
            List of issues
        """
        # Base JQL to find issues assigned to user
        jql = f'assignee = "{self.user_email}"'

        if additional_jql:
            jql += f' AND {additional_jql}'

        jql += ' ORDER BY priority DESC, updated DESC'

        return self.search_jira_tickets(jql, max_results)

    def get_sprint_issues(
        self,
        include_future_sprints: bool = False,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get issues assigned to the user in active sprints

        Args:
            include_future_sprints: Whether to include future sprints
            max_results: Maximum number of results

        Returns:
            List of sprint issues
        """
        sprint_filter = "sprint in openSprints()"
        if include_future_sprints:
            sprint_filter = "sprint in openSprints() OR sprint in futureSprints()"

        return self.get_my_issues(
            max_results=max_results,
            additional_jql=sprint_filter
        )

    def create_jira_ticket(
        self,
        project_key: str,
        summary: str,
        description: str,
        issue_type: str = "Task",
        **extra_fields
    ) -> Dict[str, Any]:
        """
        Create a new Jira ticket

        Args:
            project_key: Project key (e.g., "PROJ")
            summary: Issue summary
            description: Issue description
            issue_type: Issue type (Task, Bug, Story, etc.)
            **extra_fields: Additional fields

        Returns:
            Created issue data
        """
        try:
            fields = {
                "project": {"key": project_key},
                "summary": summary,
                "description": description,
                "issuetype": {"name": issue_type},
                **extra_fields
            }

            issue = self.client.create_issue(fields=fields)
            return issue
        except Exception as e:
            raise RuntimeError(f"Failed to create Jira ticket: {e}")

    def update_jira_ticket(
        self,
        issue_key: str,
        **fields
    ) -> Dict[str, Any]:
        """
        Update a Jira ticket

        Args:
            issue_key: Issue key (e.g., "PROJ-123")
            **fields: Fields to update

        Returns:
            Updated issue data
        """
        try:
            self.client.update_issue_field(issue_key, fields)
            # Fetch and return updated issue
            return self.client.issue(issue_key)
        except Exception as e:
            raise RuntimeError(f"Failed to update Jira ticket: {e}")

    def add_jira_comment(
        self,
        issue_key: str,
        comment: str
    ) -> Dict[str, Any]:
        """
        Add a comment to a Jira ticket

        Args:
            issue_key: Issue key (e.g., "PROJ-123")
            comment: Comment text

        Returns:
            Comment data
        """
        try:
            result = self.client.issue_add_comment(issue_key, comment)
            return result
        except Exception as e:
            raise RuntimeError(f"Failed to add comment to Jira ticket: {e}")

    def format_issue(self, issue: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format a Jira issue into a simpler structure

        Args:
            issue: Raw Jira issue

        Returns:
            Formatted issue dictionary
        """
        fields = issue.get('fields', {})

        return {
            'key': issue.get('key'),
            'summary': fields.get('summary'),
            'status': fields.get('status', {}).get('name'),
            'priority': fields.get('priority', {}).get('name', 'None'),
            'assignee': fields.get('assignee', {}).get('displayName') if fields.get('assignee') else 'Unassigned',
            'issue_type': fields.get('issuetype', {}).get('name'),
            'created': fields.get('created'),
            'updated': fields.get('updated'),
            'description': fields.get('description', 'No description'),
            'labels': fields.get('labels', []),
            'sprint': self._extract_sprint_name(fields),
            'story_points': fields.get('customfield_10016'),  # Common story points field
            'url': f"{self.config.jira_url}/browse/{issue.get('key')}"
        }

    def _extract_sprint_name(self, fields: Dict[str, Any]) -> Optional[str]:
        """Extract sprint name from issue fields"""
        sprint_field = fields.get('customfield_10020')  # Common sprint field
        if sprint_field and isinstance(sprint_field, list) and len(sprint_field) > 0:
            sprint = sprint_field[-1]  # Get the latest sprint
            if isinstance(sprint, dict):
                return sprint.get('name')
            elif isinstance(sprint, str):
                # Parse sprint string format
                import re
                match = re.search(r'name=([^,\]]+)', sprint)
                if match:
                    return match.group(1)
        return None
