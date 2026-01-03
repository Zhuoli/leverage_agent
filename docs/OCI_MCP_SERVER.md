# OCI MCP Server

Oracle Cloud Infrastructure Model Context Protocol (MCP) Server for AI-powered cloud operations.

## Overview

The OCI MCP Server provides comprehensive tools for interacting with Oracle Cloud Infrastructure services through the Model Context Protocol. It enables AI agents to manage OKE (Oracle Kubernetes Engine) clusters, OCI DevOps pipelines, Container Registry, and more.

## Features

- **55+ MCP Tools** for daily cloud operations
- **Session Token Authentication** for secure access
- **Lazy-loaded Service Clients** for optimal performance
- Support for **OKE**, **DevOps**, **Container Registry**, **Bastion**, and **Compute**

## Prerequisites

1. **OCI CLI** installed and configured
2. **Session Token** created using:
   ```bash
   oci session authenticate --profile-name <profile> --region <region>
   ```
3. **Node.js** >= 18.0.0

## Configuration

Set the following environment variables in your `.env` file:

```bash
# Required
OCI_MCP_ENABLED=true
OCI_MCP_REGION=us-phoenix-1           # Your OCI region
OCI_MCP_COMPARTMENT_ID=ocid1.compartment.oc1..xxxxx
OCI_MCP_TENANCY_ID=ocid1.tenancy.oc1..xxxxx

# Optional
OCI_MCP_PROFILE=DEFAULT               # OCI config profile name
OCI_MCP_CONFIG_PATH=~/.oci/config     # Path to OCI config file
```

## Running the Server

```bash
# Build the server
npm run build:mcp:oci

# Run the server
npm run mcp:oci

# Debug with MCP Inspector
npm run inspector:oci
```

## Available Tools

### Connection & Identity (2 tools)

| Tool | Description |
|------|-------------|
| `test_oci_connection` | Test OCI connection and validate authentication |
| `list_oci_compartments` | List all compartments in the OCI tenancy |

### Compute Instances (2 tools)

| Tool | Description |
|------|-------------|
| `list_oci_instances` | List compute instances in a compartment |
| `get_oci_instance` | Get details of a specific compute instance |

### OKE Clusters (3 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_oke_clusters` | List OKE clusters in a compartment | `compartment_id` (optional) |
| `get_oke_cluster` | Get details of a specific OKE cluster | `cluster_id` (required) |
| `create_oke_kubeconfig` | Generate kubeconfig for kubectl access | `cluster_id` (required) |

### OKE Node Pools (3 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_oke_node_pools` | List node pools for a cluster | `cluster_id` (required) |
| `get_oke_node_pool` | Get detailed node pool info | `node_pool_id` (required) |
| `scale_oke_node_pool` | Scale node pool size | `node_pool_id`, `size` (required) |

### OKE Virtual Node Pools (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_oke_virtual_node_pools` | List serverless node pools | `cluster_id` (required) |
| `get_oke_virtual_node_pool` | Get virtual node pool details | `virtual_node_pool_id` (required) |

### OKE Work Requests (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_oke_work_requests` | Monitor async operations | `compartment_id`, `cluster_id` (optional) |
| `get_oke_work_request` | Get work request status | `work_request_id` (required) |

### OKE Addons (3 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_oke_addon_options` | Available addons for K8s version | `kubernetes_version` (required) |
| `list_oke_cluster_addons` | Installed addons on cluster | `cluster_id` (required) |
| `get_oke_cluster_addon` | Get addon configuration | `cluster_id`, `addon_name` (required) |

### Bastion (3 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_oci_bastions` | List bastion hosts | `compartment_id` (optional) |
| `get_oci_bastion` | Get bastion details | `bastion_id` (required) |
| `list_bastion_sessions` | List bastion sessions | `bastion_id` (required) |

### DevOps Projects (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_projects` | List DevOps projects | `compartment_id`, `name` (optional) |
| `get_devops_project` | Get project details | `project_id` (required) |

### DevOps Build Pipelines (4 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_build_pipelines` | List build pipelines | `project_id` (required) |
| `get_devops_build_pipeline` | Get pipeline details | `build_pipeline_id` (required) |
| `list_devops_build_pipeline_stages` | List pipeline stages | `build_pipeline_id` (required) |
| `get_devops_build_pipeline_stage` | Get stage details | `build_pipeline_stage_id` (required) |

### DevOps Build Runs (5 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_build_runs` | List build runs | `project_id` (required), `build_pipeline_id`, `lifecycle_state`, `limit` (optional) |
| `get_devops_build_run` | Get build run details | `build_run_id` (required) |
| `trigger_devops_build_run` | Trigger a new build | `build_pipeline_id` (required), `display_name`, `commit_info_commit_hash`, `commit_info_repository_branch`, `build_run_arguments` (optional) |
| `cancel_devops_build_run` | Cancel a running build | `build_run_id` (required), `reason` (optional) |
| `get_devops_build_run_logs` | Get build logs | `build_run_id` (required), `stage_name` (optional) |

### DevOps Deploy Pipelines (4 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_deploy_pipelines` | List deploy pipelines | `project_id` (required) |
| `get_devops_deploy_pipeline` | Get pipeline details | `deploy_pipeline_id` (required) |
| `list_devops_deploy_stages` | List deploy stages | `deploy_pipeline_id` (required) |
| `get_devops_deploy_stage` | Get stage details | `deploy_stage_id` (required) |

### DevOps Deployments (6 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_deployments` | List deployments | `project_id` (required), `deploy_pipeline_id`, `lifecycle_state`, `limit` (optional) |
| `get_devops_deployment` | Get deployment details | `deployment_id` (required) |
| `trigger_devops_deployment` | Trigger a deployment | `deploy_pipeline_id` (required), `display_name`, `deployment_arguments`, `deploy_artifact_override_arguments` (optional) |
| `approve_devops_deployment` | Approve/reject deployment | `deployment_id`, `stage_id`, `action` (required), `reason` (optional) |
| `cancel_devops_deployment` | Cancel deployment | `deployment_id` (required), `reason` (optional) |
| `get_devops_deployment_logs` | Get deployment logs | `deployment_id` (required), `stage_name` (optional) |

### DevOps Artifacts (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_artifacts` | List deploy artifacts | `project_id` (required) |
| `get_devops_artifact` | Get artifact details | `artifact_id` (required) |

### DevOps Repositories (5 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_repositories` | List code repositories | `project_id` (required) |
| `get_devops_repository` | Get repository details | `repository_id` (required) |
| `list_devops_repository_refs` | List branches/tags | `repository_id` (required), `ref_type` (optional: BRANCH, TAG) |
| `list_devops_repository_commits` | List commits | `repository_id` (required), `ref_name`, `limit` (optional) |
| `get_devops_repository_commit` | Get commit details | `repository_id`, `commit_id` (required) |

### DevOps Triggers (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_triggers` | List triggers | `project_id` (required) |
| `get_devops_trigger` | Get trigger details | `trigger_id` (required) |

### DevOps Connections (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_connections` | List external connections | `project_id` (required), `connection_type` (optional) |
| `get_devops_connection` | Get connection details | `connection_id` (required) |

### DevOps Environments (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_environments` | List deploy environments | `project_id` (required) |
| `get_devops_environment` | Get environment details | `environment_id` (required) |

### Container Registry - OCIR (5 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_container_repositories` | List OCIR repositories | `compartment_id`, `display_name` (optional) |
| `get_container_repository` | Get repository details | `repository_id` (required) |
| `list_container_images` | List container images | `compartment_id`, `repository_name`, `display_name` (optional) |
| `get_container_image` | Get image details | `image_id` (required) |
| `delete_container_image` | Delete an image | `image_id` (required) |

### DevOps Work Requests (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_devops_work_requests` | List DevOps work requests | `compartment_id`, `project_id` (optional) |
| `get_devops_work_request` | Get work request status | `work_request_id` (required) |

## Usage Examples

### List OKE Clusters

```json
{
  "tool": "list_oke_clusters",
  "arguments": {}
}
```

### Trigger a Build Run

```json
{
  "tool": "trigger_devops_build_run",
  "arguments": {
    "build_pipeline_id": "ocid1.devopsbuildpipeline.oc1..xxxxx",
    "display_name": "Production Build",
    "commit_info_repository_branch": "main"
  }
}
```

### Scale Node Pool

```json
{
  "tool": "scale_oke_node_pool",
  "arguments": {
    "node_pool_id": "ocid1.nodepool.oc1..xxxxx",
    "size": 5
  }
}
```

### Approve Deployment

```json
{
  "tool": "approve_devops_deployment",
  "arguments": {
    "deployment_id": "ocid1.devopsdeployment.oc1..xxxxx",
    "stage_id": "ocid1.devopsdeploystage.oc1..xxxxx",
    "action": "APPROVE",
    "reason": "Approved after review"
  }
}
```

### Generate Kubeconfig

```json
{
  "tool": "create_oke_kubeconfig",
  "arguments": {
    "cluster_id": "ocid1.cluster.oc1..xxxxx"
  }
}
```

## Claude Desktop Integration

Add the following to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "oci": {
      "command": "node",
      "args": ["/path/to/leverage_agent/dist/mcp/oci-server.js"],
      "env": {
        "OCI_MCP_ENABLED": "true",
        "OCI_MCP_REGION": "us-phoenix-1",
        "OCI_MCP_COMPARTMENT_ID": "ocid1.compartment.oc1..xxxxx",
        "OCI_MCP_TENANCY_ID": "ocid1.tenancy.oc1..xxxxx"
      }
    }
  }
}
```

## Architecture

```
src/mcp/
├── oci-server.ts        # MCP server entry point
├── oci-types.ts         # Tool schema definitions
└── tools/
    └── oci-tools.ts     # Tool handlers

src/api/
└── oci-client.ts        # OCI SDK integration
```

## Error Handling

All tools return structured responses:

- **Success**: Tool-specific formatted output
- **Error**: `Error executing <tool_name>: <error_message>`

## Session Token Refresh

Session tokens expire after a period of time. To refresh:

```bash
oci session refresh --profile <profile-name>
```

Or create a new session:

```bash
oci session authenticate --profile-name <profile> --region <region>
```

## Troubleshooting

### Connection Failed

1. Verify session token is valid: `oci session validate --profile <profile>`
2. Check environment variables are set correctly
3. Ensure compartment and tenancy IDs are correct

### Permission Denied

1. Verify IAM policies allow access to required services
2. Check the user/group has necessary permissions for OKE, DevOps, etc.

### Tool Not Found

1. Rebuild the server: `npm run build:mcp:oci`
2. Check server logs for initialization errors

## License

MIT
