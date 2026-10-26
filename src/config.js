import 'dotenv/config';

const number = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: number(process.env.PORT, 3000),
  neo4j: {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME,
    password: process.env.NEO4J_PASSWORD,
    database: process.env.NEO4J_DATABASE || 'neo4j'
  },
  maxGraphNodes: Math.min(number(process.env.MAX_GRAPH_NODES, 200), 1000)
};
