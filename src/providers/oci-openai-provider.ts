import * as generativeAiInference from 'oci-generativeaiinference';
import * as common from 'oci-common';
import { BaseProvider } from './base.js';
import type { Config } from '../config/index.js';
import type { Message, ChatOptions } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * OCI OpenAI provider using OCI Generative AI Inference SDK
 * Implements integration with Oracle Cloud Infrastructure Generative AI Service
 */
export class OCIOpenAIProvider extends BaseProvider {
  private client: generativeAiInference.GenerativeAiInferenceClient;
  private model: string;
  private compartmentId: string;
  private endpoint: string;

  constructor(config: Config, systemPrompt?: string) {
    super(config, systemPrompt);

    if (!config.ociCompartmentId) {
      throw new Error('OCI Compartment ID is required for OCI OpenAI provider');
    }

    if (!config.ociEndpoint) {
      throw new Error('OCI Endpoint is required for OCI OpenAI provider');
    }

    this.compartmentId = config.ociCompartmentId;
    this.endpoint = config.ociEndpoint;

    // Use custom model name if provided, otherwise use default
    this.model = config.modelName || 'cohere.command-r-plus';

    // Set up OCI authentication
    const authProvider = this.createAuthProvider(config);

    // Create the client with the endpoint
    this.client = new generativeAiInference.GenerativeAiInferenceClient({
      authenticationDetailsProvider: authProvider,
    });
    this.client.endpoint = this.endpoint;

    console.error(
      `OCI OpenAI provider initialized with model: ${this.model}, endpoint: ${this.endpoint}`
    );
  }

  /**
   * Create OCI authentication provider based on configuration
   */
  private createAuthProvider(config: Config): common.ConfigFileAuthenticationDetailsProvider {
    // Use config file path if provided, otherwise use default ~/.oci/config
    const configFilePath =
      config.ociConfigPath || path.join(os.homedir(), '.oci', 'config');
    const profile = config.ociProfile || 'DEFAULT';

    if (!fs.existsSync(configFilePath)) {
      throw new Error(
        `OCI config file not found at ${configFilePath}. Please set up OCI CLI configuration.`
      );
    }

    try {
      const provider = new common.ConfigFileAuthenticationDetailsProvider(
        configFilePath,
        profile
      );
      return provider;
    } catch (error) {
      throw new Error(`Failed to create OCI authentication provider: ${error}`);
    }
  }

  /**
   * Send a message to OCI Generative AI and get a response
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    try {
      // Build chat history from messages
      const chatHistory: generativeAiInference.models.CohereMessage[] = [];

      // Add system message if present in messages
      const systemMessage = messages.find((msg) => msg.role === 'system');
      const userMessages = messages.filter((msg) => msg.role !== 'system');

      // Convert messages to Cohere chat format
      for (const msg of userMessages) {
        chatHistory.push({
          role: msg.role === 'user' ? 'USER' : 'CHATBOT',
          message: msg.content,
        });
      }

      // Prepare the chat request
      const chatRequest: generativeAiInference.models.CohereChatRequest = {
        message: userMessages[userMessages.length - 1]?.content || '',
        apiFormat: generativeAiInference.models.BaseChatRequest.ApiFormat.Cohere,
        maxTokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
        topP: 0.75,
        topK: 0,
        // Include chat history (excluding the last message which is sent as 'message')
        chatHistory: chatHistory.slice(0, -1),
        // Use system prompt from config
        preambleOverride: systemMessage?.content || this.systemPrompt,
      };

      const chatDetails: generativeAiInference.models.ChatDetails = {
        servingMode: {
          modelId: this.model,
          servingType: 'ON_DEMAND',
        },
        chatRequest: chatRequest,
        compartmentId: this.compartmentId,
      };

      const chatRequest_ = {
        chatDetails: chatDetails,
      };

      // Call the API
      const chatResponse = await this.client.chat(chatRequest_);

      // Extract the response text
      const chatResult = chatResponse.chatResult;
      if (
        chatResult.chatResponse &&
        'text' in chatResult.chatResponse &&
        chatResult.chatResponse.text
      ) {
        return chatResult.chatResponse.text;
      }

      throw new Error('No response text from OCI Generative AI');
    } catch (error) {
      console.error('Error calling OCI Generative AI API:', error);
      throw new Error(`OCI Generative AI API error: ${error}`);
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'oci-openai';
  }

  /**
   * Get the model name being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the endpoint being used
   */
  getEndpoint(): string {
    return this.endpoint;
  }
}
