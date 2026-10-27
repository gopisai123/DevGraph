import 'dotenv/config';

export const positiveInteger = (value, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
};

export const config = {
  port: positiveInteger(process.env.PORT, 3000, 65535),
  neo4j: {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME,
    password: process.env.NEO4J_PASSWORD,
    database: process.env.NEO4J_DATABASE || 'neo4j'
  },
  // This caps one visualization/API response only. It never limits Neo4j storage or imports.
  graphMaxNodes: positiveInteger(process.env.GRAPH_MAX_NODES, 1000, 10_000)
};
