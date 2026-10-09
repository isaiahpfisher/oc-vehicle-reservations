/**
 * Parse Agility REST XML asset list responses and query assets by parent link.
 */

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractAttributeValue(block, attrName) {
  const name = escapeRegExp(attrName);

  // Empty attributes come back self-closing: <Attribute name="Reference" />
  if (new RegExp(`<Attribute\\s+name=["']${name}["']\\s*/>`, "i").test(block)) {
    return "";
  }

  const attributePattern = new RegExp(
    `<Attribute\\s+name=["']${name}["']\\s*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</Attribute>`,
    "i",
  );
  const attributeMatch = block.match(attributePattern);
  return attributeMatch ? decodeXml(attributeMatch[1].trim()) : "";
}

/** Single-value relation, e.g. <Relation name="Parent"><Asset idref="Story:1" /></Relation> */
function extractRelationOid(block, relationName) {
  const pattern = new RegExp(
    `<Relation\\s+name=["']${escapeRegExp(relationName)}["']\\s*>\\s*<Asset\\b[^>]*\\bidref=["']([^"']+)["']`,
    "i",
  );
  return block.match(pattern)?.[1] ?? null;
}

/**
 * @param {string} xmlText REST XML response body
 * @param {string} assetType e.g. "Story", "Test", "Epic"
 * @returns {{ oid: string, name: string, reference: string, parent: string | null, super: string | null }[]}
 */
export function parseRestAssetList(xmlText, assetType) {
  const assets = [];
  const assetPattern = /<Asset\b([^>]*[^/])>([\s\S]*?)<\/Asset>/gi;
  let match;

  while ((match = assetPattern.exec(xmlText)) !== null) {
    const attrs = match[1];
    const body = match[2];
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    if (!idMatch) {
      continue;
    }

    const oid = idMatch[1];
    if (!oid.startsWith(`${assetType}:`)) {
      continue;
    }

    assets.push({
      oid,
      name: extractAttributeValue(body, "Name"),
      reference: extractAttributeValue(body, "Reference"),
      parent: extractRelationOid(body, "Parent"),
      super: extractRelationOid(body, "Super"),
    });
  }

  return assets;
}

/**
 * @param {{ oid: string, name: string, reference: string }[]} assets
 * @param {{ ref?: string, name?: string }} target
 */
export function findAssetByRefOrName(assets, { ref, name }) {
  if (ref) {
    const byRef = assets.filter((asset) => asset.reference === ref);
    if (byRef.length > 1) {
      console.warn(
        `Warning: ${byRef.length} assets with Reference "${ref}" — using ${byRef[0].oid}. Delete the duplicates in Agility.`,
      );
    }
    if (byRef.length > 0) {
      return byRef[0];
    }
  }

  if (!name) {
    return null;
  }

  const matches = assets.filter((asset) => asset.name === name);
  if (matches.length > 1) {
    console.warn(
      `Warning: ${matches.length} assets named "${name}" — using ${matches[0].oid}. Set Reference on assets for reliable upsert.`,
    );
  }

  return matches[0] ?? null;
}

/**
 * @param {(path: string) => Promise<{ ok: boolean, status: number, text: string }>} restGet
 * @param {string} assetType
 * @param {string} where
 * @param {string[]} [sel] attributes/relations to select
 */
export async function listAssetsWhere(restGet, assetType, where, sel = ["Name", "Reference"]) {
  // No `page` param: Agility reads `page=N,M` as pageSize=N, so `page=1,0` returned a single asset.
  const { ok, status, text } = await restGet(
    `/rest-1.v1/Data/${assetType}?sel=${sel.join(",")}&where=${encodeURIComponent(where)}`,
  );

  if (!ok) {
    throw new Error(`${assetType} query failed (${status}): ${text.slice(0, 400)}`);
  }

  return parseRestAssetList(text, assetType);
}
