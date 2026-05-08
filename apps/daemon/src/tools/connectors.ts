import type { ToolTokenGrant } from '../tool-tokens.js';

import { classifyConnectorToolSafety, type ConnectorCatalogDefinition, type ConnectorToolDetail, type ConnectorToolSafety } from '../connectors/catalog.js';
import { connectorService, ConnectorService, ConnectorServiceError, type ConnectorExecuteRequest } from '../connectors/service.js';

export interface ConnectorToolContext {
  grant: ToolTokenGrant;
  projectsRoot: string;
  service?: ConnectorService;
}

export interface ConnectorInspectRequest {
  connectorId: string;
  toolName: string;
}

function approvalRank(approval: ConnectorCatalogDefinition['minimumApproval']): number {
  switch (approval) {
    case 'auto':
      return 0;
    case 'confirm':
      return 1;
    case 'disabled':
      return 2;
    default:
      return 2;
  }
}

function stricterApproval(
  left: ConnectorCatalogDefinition['minimumApproval'] | undefined,
  right: ConnectorCatalogDefinition['minimumApproval'] | undefined,
): ConnectorCatalogDefinition['minimumApproval'] | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return approvalRank(left) >= approvalRank(right) ? left : right;
}

function runtimeSafetyForTool(tool: ConnectorCatalogDefinition['tools'][number]): ConnectorToolSafety {
  const classified = classifyConnectorToolSafety(tool);
  if (classified.sideEffect !== 'read' || classified.approval !== 'auto') return classified;
  return tool.safety;
}

function isAgentPreviewListableTool(definition: ConnectorCatalogDefinition, tool: ConnectorToolDetail): boolean {
  if (!definition.allowedToolNames.includes(tool.name)) return false;

  const catalogTool = definition.tools.find((candidate) => candidate.name === tool.name);
  if (!catalogTool) return false;

  const runtimeSafety = runtimeSafetyForTool(catalogTool);
  const effectiveApproval = stricterApproval(stricterApproval(definition.minimumApproval, catalogTool.safety.approval), runtimeSafety.approval);
  return runtimeSafety.sideEffect === 'read' && effectiveApproval === 'auto';
}

function compactListableTool(tool: ConnectorToolDetail): Omit<ConnectorToolDetail, 'inputSchemaJson' | 'outputSchemaJson'> {
  return {
    name: tool.name,
    title: tool.title,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    safety: { ...tool.safety },
    refreshEligible: tool.refreshEligible,
  };
}

export async function listConnectorTools(context: ConnectorToolContext) {
  const service = context.service ?? connectorService;
  const definitions = await service.listDefinitions();
  const entries = await Promise.all(definitions.map(async (definition) => ({ definition, connector: await service.getConnector(definition.id) })));
  return entries
    .filter(({ connector }) => connector.status === 'connected')
    .map(({ definition, connector }) => ({
      ...connector,
      tools: connector.tools
        .filter((tool) => isAgentPreviewListableTool(definition, tool))
        .sort((left, right) => {
          const leftReadOnly = left.safety.sideEffect === 'read' && left.safety.approval === 'auto';
          const rightReadOnly = right.safety.sideEffect === 'read' && right.safety.approval === 'auto';
          if (leftReadOnly === rightReadOnly) return 0;
          return leftReadOnly ? -1 : 1;
        })
        .map(compactListableTool),
    }))
    .filter((connector) => connector.tools.length > 0);
}

export async function inspectConnectorTool(request: ConnectorInspectRequest, context: ConnectorToolContext) {
  const service = context.service ?? connectorService;
  const definition = await service.getDefinition(request.connectorId);
  if (!definition) {
    throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
  }
  const connector = await service.getConnector(request.connectorId);
  if (connector.status !== 'connected') {
    throw new ConnectorServiceError('CONNECTOR_NOT_CONNECTED', 'connector is not connected', 403, {
      connectorId: request.connectorId,
      status: connector.status,
    });
  }
  const tool = connector.tools.find((candidate) => candidate.name === request.toolName);
  if (!tool || !isAgentPreviewListableTool(definition, tool)) {
    throw new ConnectorServiceError('CONNECTOR_TOOL_NOT_FOUND', 'connector tool not found', 404, {
      connectorId: request.connectorId,
      toolName: request.toolName,
    });
  }
  return {
    connector: {
      id: connector.id,
      name: connector.name,
      provider: connector.provider,
      category: connector.category,
      status: connector.status,
      ...(connector.accountLabel === undefined ? {} : { accountLabel: connector.accountLabel }),
    },
    tool,
  };
}

export async function executeConnectorTool(request: ConnectorExecuteRequest, context: ConnectorToolContext) {
  const service = context.service ?? connectorService;
  return await service.execute(request, {
    projectsRoot: context.projectsRoot,
    projectId: context.grant.projectId,
    runId: context.grant.runId,
    purpose: 'agent_preview',
  });
}
