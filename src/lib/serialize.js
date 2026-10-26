export function scalar(value) { return value && typeof value.toNumber === 'function' ? value.toNumber() : value; }
export function node(recordNode) { return recordNode ? { id: recordNode.elementId, labels: recordNode.labels, ...Object.fromEntries(Object.entries(recordNode.properties).map(([k, v]) => [k, scalar(v)])) } : null; }
export function relationship(rel) { return { id: rel.elementId, type: rel.type, source: rel.startNodeElementId, target: rel.endNodeElementId, ...Object.fromEntries(Object.entries(rel.properties).map(([k, v]) => [k, scalar(v)])) }; }
