// Safe to execute repeatedly on Neo4j 5.x.
CREATE CONSTRAINT developer_username_unique IF NOT EXISTS FOR (d:Developer) REQUIRE d.username IS UNIQUE;
CREATE CONSTRAINT repository_full_name_unique IF NOT EXISTS FOR (r:Repository) REQUIRE r.full_name IS UNIQUE;
CREATE CONSTRAINT topic_name_unique IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE;
CREATE CONSTRAINT skill_name_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE;
CREATE INDEX repository_language IF NOT EXISTS FOR (r:Repository) ON (r.language);
CREATE INDEX topic_category IF NOT EXISTS FOR (t:Topic) ON (t.category);
CREATE INDEX skill_domain IF NOT EXISTS FOR (s:Skill) ON (s.domain);
