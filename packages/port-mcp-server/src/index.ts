#!/usr/bin/env node
/**
 * Port Catalog MCP Server
 *
 * Implements the Model Context Protocol (MCP) over stdio, exposing Port catalog
 * lookups as real MCP tools that factory-stage executors can call.
 *
 * Tools exposed (matching tools.lock.json approvedTools for "port-context"):
 *   - get_entity        : Fetch a single Port entity by blueprint + identifier
 *   - search_entities   : Search entities within a blueprint with optional filters
 *   - get_blueprint     : Fetch a Port blueprint definition
 *   - get_related_entities : Fetch entities related to a given entity
 *
 * Transport: stdio (JSON-RPC 2.0)
 *
 * Usage (called by factory-coordinator or factory-cli):
 *   node dist/index.js
 *   PORT_CLIENT_ID=... PORT_CLIENT_SECRET=... tsx src/index.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPortClientFromEnv } from "@factory/port-client";

// Lazy-initialise Port client so the MCP server starts even if credentials are
// not available yet — tool calls will fail gracefully if Port is unreachable.
let _portClient: ReturnType<typeof createPortClientFromEnv> | null = null;
function getPortClient() {
  if (!_portClient) {
    _portClient = createPortClientFromEnv();
  }
  return _portClient;
}

const server = new McpServer({
  name: "port-context-mcp",
  version: "1.0.0",
});

// ─── Tool: get_entity ─────────────────────────────────────────────────────────

server.tool(
  "get_entity",
  "Fetch a single Port catalog entity by blueprint and identifier. Returns all entity properties and relations.",
  {
    blueprint: z.string().describe("Port blueprint identifier (e.g. 'workOrder', 'service', 'factoryRun')"),
    identifier: z.string().describe("Entity identifier within the blueprint"),
  },
  async ({ blueprint, identifier }) => {
    try {
      const entity = await getPortClient().getEntity(blueprint, identifier);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(entity, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching entity ${blueprint}/${identifier}: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: search_entities ────────────────────────────────────────────────────

server.tool(
  "search_entities",
  "Search for Port entities within a blueprint. Optionally filter by property values.",
  {
    blueprint: z.string().describe("Port blueprint to search within"),
    filters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Optional key-value filters to apply (matches entity properties)"),
  },
  async ({ blueprint, filters }) => {
    try {
      const entities = await getPortClient().searchEntities(blueprint, filters ?? {});
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(entities, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error searching ${blueprint}: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: get_blueprint ──────────────────────────────────────────────────────

server.tool(
  "get_blueprint",
  "Fetch a Port blueprint definition (schema, properties, relations).",
  {
    blueprint: z.string().describe("Blueprint identifier"),
  },
  async ({ blueprint }) => {
    try {
      // Port blueprint endpoint
      const res = await getPortClient().getEntity("__blueprints", blueprint).catch(async () => {
        // Fallback: list entities with minimal filter to understand the schema
        const sample = await getPortClient().searchEntities(blueprint, {});
        return sample[0] ?? null;
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching blueprint ${blueprint}: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: get_related_entities ───────────────────────────────────────────────

server.tool(
  "get_related_entities",
  "Fetch entities related to a given Port entity via its relations.",
  {
    blueprint: z.string().describe("Blueprint of the source entity"),
    identifier: z.string().describe("Identifier of the source entity"),
    relation: z.string().describe("Relation name to follow"),
  },
  async ({ blueprint, identifier, relation }) => {
    try {
      const entity = await getPortClient().getEntity(blueprint, identifier);
      const relatedId = entity.relations?.[relation] as string | string[] | undefined;
      if (!relatedId) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No relation '${relation}' found on ${blueprint}/${identifier}`,
            },
          ],
        };
      }

      const ids = Array.isArray(relatedId) ? relatedId : [relatedId];
      const related = await Promise.all(
        ids.map(id => getPortClient().getEntity(relation, id).catch(() => null))
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(related.filter(Boolean), null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching related entities: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Start server ─────────────────────────────────────────────────────────────

async function main() {
  // Verify Port connectivity before accepting MCP connections
  try {
    const ping = await getPortClient().ping();
    if (!ping.ok) {
      process.stderr.write(`[port-mcp-server] WARNING: Port API not reachable — tools will return errors\n`);
    } else {
      process.stderr.write(`[port-mcp-server] Port connected (org: ${ping.org})\n`);
    }
  } catch {
    process.stderr.write(`[port-mcp-server] WARNING: Could not ping Port API (credentials may not be set)\n`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[port-mcp-server] Listening on stdio (MCP JSON-RPC 2.0)\n`);
}

main().catch(e => {
  process.stderr.write(`[port-mcp-server] Fatal: ${e}\n`);
  process.exit(1);
});
