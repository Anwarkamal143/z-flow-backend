import { IEdge } from "@/schema/edges";
import { INode } from "@/schema/node";
import {
  BadRequestException,
  InternalServerException,
} from "@/utils/catch-errors";
import toposort from "toposort";

export const topologicalSort = (
  nodes: INode[],
  connections: IEdge[]
): INode[] => {
  if (!connections.length) {
    return nodes;
  }
  // unique ids of the nodes that are connected
  const connectedNodeIds = new Set<string>();
  // Create Edges array for toposort
  const edges: [string, string][] = connections.map((conn) => {
    connectedNodeIds.add(conn.fromNodeId);
    connectedNodeIds.add(conn.toNodeId);
    return [conn.fromNodeId, conn.toNodeId];
  });

  // for (const conn of connections) {
  // }

  // Add nodes with no connections as self-edges to ensure they're included
  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      edges.push([node.id, node.id]);
    }
  }

  // Perform topological sort
  let sortedNodeIds: string[];

  try {
    sortedNodeIds = toposort(edges);
    // Remove duplicate (from self-edges)

    sortedNodeIds = [...new Set(sortedNodeIds)];
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cyclic")) {
      throw new BadRequestException("Workflow contains a cycle");
    }
    throw new InternalServerException(
      "Something went wrong while executing workflow"
    );
  }
  //   Map sorted IDs back to node objects
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sortedNodeIds.map((id) => nodeMap.get(id)!).filter(Boolean);
};
