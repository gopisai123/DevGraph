// Developer with repositories
MATCH (d:Developer {username: $username}) OPTIONAL MATCH (d)-[:OWNS]->(r:Repository)
RETURN d, collect(r) AS repositories;

// Bounded graph suitable for visualization
MATCH p=(n)-[r]->(m) RETURN n, r, m LIMIT $limit;

// Shortest relationship path between node element ids
MATCH (from) WHERE elementId(from) = $fromId
MATCH (to) WHERE elementId(to) = $toId
MATCH p = shortestPath((from)-[*..$maxDepth]-(to)) RETURN p;

// Skills absent from a developer's repositories, ranked by topic proximity
MATCH (d:Developer {username: $username})-[:OWNS]->(:Repository)-[:HAS_TOPIC]->(t:Topic)
MATCH (candidate:Skill)<-[:USES_SKILL]-(:Repository)-[:HAS_TOPIC]->(t)
WHERE NOT EXISTS { MATCH (d)-[:OWNS]->(:Repository)-[:USES_SKILL]->(candidate) }
RETURN candidate.name AS skill, candidate.domain AS domain, count(*) AS relevance
ORDER BY relevance DESC, skill LIMIT $limit;
