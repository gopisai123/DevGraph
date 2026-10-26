// MERGE makes this seed repeatable without deleting user data.
MERGE (ada:Developer {username: 'ada-lovelace'})
SET ada.bio = 'Graph and backend engineer', ada.public_repos = 3
MERGE (linus:Developer {username: 'linus-dev'})
SET linus.bio = 'Systems developer exploring web tools', linus.public_repos = 2
MERGE (graph:Repository {full_name: 'ada-lovelace/graph-lab'})
SET graph.name = 'graph-lab', graph.stars = 42, graph.language = 'JavaScript'
MERGE (api:Repository {full_name: 'ada-lovelace/api-kit'})
SET api.name = 'api-kit', api.stars = 19, api.language = 'JavaScript'
MERGE (cli:Repository {full_name: 'linus-dev/cli-tools'})
SET cli.name = 'cli-tools', cli.stars = 11, cli.language = 'Python'
MERGE (ada)-[:OWNS]->(graph)
MERGE (ada)-[:OWNS]->(api)
MERGE (linus)-[:OWNS]->(cli)
MERGE (neo:Topic {name: 'neo4j'}) SET neo.category = 'database'
MERGE (backend:Topic {name: 'backend'}) SET backend.category = 'engineering'
MERGE (graphs:Topic {name: 'graphs'}) SET graphs.category = 'computer-science'
MERGE (js:Skill {name: 'JavaScript'}) SET js.level = 'advanced', js.domain = 'programming'
MERGE (cypher:Skill {name: 'Cypher'}) SET cypher.level = 'intermediate', cypher.domain = 'database'
MERGE (python:Skill {name: 'Python'}) SET python.level = 'intermediate', python.domain = 'programming'
MERGE (graph)-[:HAS_TOPIC]->(neo)
MERGE (graph)-[:HAS_TOPIC]->(graphs)
MERGE (api)-[:HAS_TOPIC]->(backend)
MERGE (cli)-[:HAS_TOPIC]->(backend)
MERGE (graph)-[:USES_SKILL]->(js)
MERGE (graph)-[:USES_SKILL]->(cypher)
MERGE (api)-[:USES_SKILL]->(js)
MERGE (cli)-[:USES_SKILL]->(python)
MERGE (neo)-[:RELATED_TO]->(graphs)
MERGE (backend)-[:RELATED_TO]->(graphs);
