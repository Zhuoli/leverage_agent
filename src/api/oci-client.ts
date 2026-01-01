import * as common from 'oci-common';
import * as core from 'oci-core';
import * as identity from 'oci-identity';
import * as containerengine from 'oci-containerengine';
import * as bastion from 'oci-bastion';
import type { Config } from '../config/index.js';
import * as os from 'os';
import * as path from 'path';

/**
 * OCI Client using Session Token Authentication
 *
 * This client ONLY uses Session Token for authentication.
 * Session tokens must be created using: oci session authenticate --profile-name <profile> --region <region>
 */
export class OCIClient {
  private provider: common.ConfigFileAuthenticationDetailsProvider;
  private region: string;
  private compartmentId: string;
  private tenancyId: string;

  // Service clients
  private computeClient?: core.ComputeClient;
  private identityClient?: identity.IdentityClient;
  private containerEngineClient?: containerengine.ContainerEngineClient;
  private bastionClient?: bastion.BastionClient;

  constructor(private config: Config) {
    if (!config.ociMcpEnabled) {
      throw new Error('OCI MCP is not enabled. Set OCI_MCP_ENABLED=true in your .env file');
    }

    // Validate required configuration
    if (!config.ociMcpRegion || !config.ociMcpCompartmentId || !config.ociMcpTenancyId) {
      throw new Error(
        'OCI MCP configuration is incomplete. Required: OCI_MCP_REGION, OCI_MCP_COMPARTMENT_ID, OCI_MCP_TENANCY_ID'
      );
    }

    this.region = config.ociMcpRegion;
    this.compartmentId = config.ociMcpCompartmentId;
    this.tenancyId = config.ociMcpTenancyId;

    // Determine config file path
    const configPath =
      config.ociMcpConfigPath ||
      config.ociConfigPath ||
      path.join(os.homedir(), '.oci', 'config');

    // Determine profile name
    const profile = config.ociMcpProfile || config.ociProfile || 'DEFAULT';

    try {
      // Initialize Session Token authentication provider
      // This will automatically use session token files if present in the profile
      this.provider = new common.ConfigFileAuthenticationDetailsProvider(configPath, profile);

      console.error(`✓ OCI MCP Client initialized with Session Token authentication`);
      console.error(`  - Profile: ${profile}`);
      console.error(`  - Config: ${configPath}`);
      console.error(`  - Region: ${this.region}`);
      console.error(`  - Compartment: ${this.compartmentId}`);
    } catch (error) {
      throw new Error(
        `Failed to initialize OCI Session Token authentication: ${error}\n\n` +
          `Ensure you have created a session token using:\n` +
          `  oci session authenticate --profile-name ${profile} --region ${this.region}\n`
      );
    }
  }

  /**
   * Get or create Compute client
   */
  private getComputeClient(): core.ComputeClient {
    if (!this.computeClient) {
      this.computeClient = new core.ComputeClient({
        authenticationDetailsProvider: this.provider,
      });
      this.computeClient.region = common.Region.fromRegionId(this.region);
    }
    return this.computeClient;
  }

  /**
   * Get or create Identity client
   */
  private getIdentityClient(): identity.IdentityClient {
    if (!this.identityClient) {
      this.identityClient = new identity.IdentityClient({
        authenticationDetailsProvider: this.provider,
      });
      this.identityClient.region = common.Region.fromRegionId(this.region);
    }
    return this.identityClient;
  }

  /**
   * Get or create Container Engine client
   */
  private getContainerEngineClient(): containerengine.ContainerEngineClient {
    if (!this.containerEngineClient) {
      this.containerEngineClient = new containerengine.ContainerEngineClient({
        authenticationDetailsProvider: this.provider,
      });
      this.containerEngineClient.region = common.Region.fromRegionId(this.region);
    }
    return this.containerEngineClient;
  }

  /**
   * Get or create Bastion client
   */
  private getBastionClient(): bastion.BastionClient {
    if (!this.bastionClient) {
      this.bastionClient = new bastion.BastionClient({
        authenticationDetailsProvider: this.provider,
      });
      this.bastionClient.region = common.Region.fromRegionId(this.region);
    }
    return this.bastionClient;
  }

  /**
   * Test OCI connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const identityClient = this.getIdentityClient();
      const response = await identityClient.getCompartment({
        compartmentId: this.compartmentId,
      });

      return {
        success: true,
        message: `Successfully connected to OCI. Compartment: ${response.compartment.name}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to OCI: ${error}`,
      };
    }
  }

  /**
   * List all compartments in the tenancy
   */
  async listCompartments(): Promise<any[]> {
    try {
      const identityClient = this.getIdentityClient();
      const response = await identityClient.listCompartments({
        compartmentId: this.tenancyId,
        compartmentIdInSubtree: true,
      });

      return response.items || [];
    } catch (error) {
      throw new Error(`Failed to list compartments: ${error}`);
    }
  }

  /**
   * List compute instances in the compartment
   */
  async listInstances(compartmentId?: string): Promise<any[]> {
    try {
      const computeClient = this.getComputeClient();
      const targetCompartmentId = compartmentId || this.compartmentId;

      const response = await computeClient.listInstances({
        compartmentId: targetCompartmentId,
      });

      return response.items || [];
    } catch (error) {
      throw new Error(`Failed to list instances: ${error}`);
    }
  }

  /**
   * Get instance details
   */
  async getInstance(instanceId: string): Promise<any> {
    try {
      const computeClient = this.getComputeClient();
      const response = await computeClient.getInstance({
        instanceId,
      });

      return response.instance;
    } catch (error) {
      throw new Error(`Failed to get instance: ${error}`);
    }
  }

  /**
   * List OKE clusters in the compartment
   */
  async listOKEClusters(compartmentId?: string): Promise<any[]> {
    try {
      const containerEngineClient = this.getContainerEngineClient();
      const targetCompartmentId = compartmentId || this.compartmentId;

      const response = await containerEngineClient.listClusters({
        compartmentId: targetCompartmentId,
      });

      return response.items || [];
    } catch (error) {
      throw new Error(`Failed to list OKE clusters: ${error}`);
    }
  }

  /**
   * Get OKE cluster details
   */
  async getOKECluster(clusterId: string): Promise<any> {
    try {
      const containerEngineClient = this.getContainerEngineClient();
      const response = await containerEngineClient.getCluster({
        clusterId,
      });

      return response.cluster;
    } catch (error) {
      throw new Error(`Failed to get OKE cluster: ${error}`);
    }
  }

  /**
   * List node pools for an OKE cluster
   */
  async listNodePools(clusterId: string): Promise<any[]> {
    try {
      const containerEngineClient = this.getContainerEngineClient();
      const response = await containerEngineClient.listNodePools({
        compartmentId: this.compartmentId,
        clusterId,
      });

      return response.items || [];
    } catch (error) {
      throw new Error(`Failed to list node pools: ${error}`);
    }
  }

  /**
   * List bastions in the compartment
   */
  async listBastions(compartmentId?: string): Promise<any[]> {
    try {
      const bastionClient = this.getBastionClient();
      const targetCompartmentId = compartmentId || this.compartmentId;

      const response = await bastionClient.listBastions({
        compartmentId: targetCompartmentId,
      });

      return response.items || [];
    } catch (error) {
      throw new Error(`Failed to list bastions: ${error}`);
    }
  }

  /**
   * Get bastion details
   */
  async getBastion(bastionId: string): Promise<any> {
    try {
      const bastionClient = this.getBastionClient();
      const response = await bastionClient.getBastion({
        bastionId,
      });

      return response.bastion;
    } catch (error) {
      throw new Error(`Failed to get bastion: ${error}`);
    }
  }

  /**
   * List bastion sessions
   */
  async listBastionSessions(bastionId: string): Promise<any[]> {
    try {
      const bastionClient = this.getBastionClient();
      const response = await bastionClient.listSessions({
        bastionId,
      });

      return response.items || [];
    } catch (error) {
      throw new Error(`Failed to list bastion sessions: ${error}`);
    }
  }

  /**
   * Format instance information for display
   */
  formatInstance(instance: any): any {
    return {
      id: instance.id,
      displayName: instance.displayName,
      lifecycleState: instance.lifecycleState,
      availabilityDomain: instance.availabilityDomain,
      shape: instance.shape,
      timeCreated: instance.timeCreated,
    };
  }

  /**
   * Format OKE cluster information for display
   */
  formatOKECluster(cluster: any): any {
    return {
      id: cluster.id,
      name: cluster.name,
      lifecycleState: cluster.lifecycleState,
      kubernetesVersion: cluster.kubernetesVersion,
      vcnId: cluster.vcnId,
      timeCreated: cluster.timeCreated,
    };
  }

  /**
   * Format compartment information for display
   */
  formatCompartment(compartment: any): any {
    return {
      id: compartment.id,
      name: compartment.name,
      description: compartment.description,
      lifecycleState: compartment.lifecycleState,
      timeCreated: compartment.timeCreated,
    };
  }

  /**
   * Format bastion information for display
   */
  formatBastion(bastion: any): any {
    return {
      id: bastion.id,
      name: bastion.name,
      lifecycleState: bastion.lifecycleState,
      targetSubnetId: bastion.targetSubnetId,
      timeCreated: bastion.timeCreated,
    };
  }
}
