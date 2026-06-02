interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * geoBoundaries MCP — open database of political administrative boundaries.
 *
 * Source: https://www.geoboundaries.org (keyless, CC-BY for the gbOpen product).
 * Returns boundary metadata (unit counts, year, source, license) plus download
 * URLs for full + simplified GeoJSON and TopoJSON, and can optionally fetch the
 * simplified GeoJSON geometry itself (can be large — see size caveat below).
 *
 * Concepts:
 *  - ISO3: 3-letter ISO-3166-1 alpha-3 country code (e.g. USA, FRA, KEN, IND).
 *  - ADM level: ADM0 = country, ADM1 = state/province/region,
 *    ADM2 = county/district, ADM3/ADM4 = finer subdivisions, ALL = every level.
 *  - product: gbOpen (default, openly CC-BY licensed) | gbHumanitarian | gbAuthoritative.
 *    Not every ISO3/ADM/product combination exists; missing combos return 404.
 */


const BASE = 'https://www.geoboundaries.org/api/current';
const UA = 'pipeworx-mcp-geoboundaries/1.0 (+https://pipeworx.io)';
const VALID_ADM = ['ADM0', 'ADM1', 'ADM2', 'ADM3', 'ADM4', 'ALL'];
const VALID_PRODUCT = ['gbOpen', 'gbHumanitarian', 'gbAuthoritative'];

// Hard cap on geometry we'll pull into a tool response. "Simplified" GeoJSON
// for a large country (e.g. USA ADM1) is ~5 MB; full geometry is much bigger.
const MAX_GEOMETRY_BYTES = 4_000_000;

const tools: McpToolExport['tools'] = [
  {
    name: 'get_boundaries',
    description:
      'Get administrative boundary metadata for a country from geoBoundaries: ' +
      'unit count, year represented, source, license, and download URLs for full ' +
      'GeoJSON (gjDownloadURL), simplified GeoJSON (simplifiedGeometryGeoJSON), ' +
      'TopoJSON (tjDownloadURL) and a static zip. ISO3 is the 3-letter country code ' +
      '(USA, FRA, KEN, IND). ADM level: ADM0=country, ADM1=state/province, ' +
      'ADM2=county/district, ADM3/ADM4=finer, ALL=every level. Default product gbOpen is CC-BY.',
    inputSchema: {
      type: 'object',
      properties: {
        iso3: { type: 'string', description: 'ISO-3166-1 alpha-3 country code, e.g. "USA", "FRA", "KEN".' },
        adm: {
          type: 'string',
          enum: VALID_ADM,
          description: 'Admin level: ADM0=country, ADM1=state/province, ADM2=county/district, ADM3, ADM4, or ALL.',
        },
        product: {
          type: 'string',
          enum: VALID_PRODUCT,
          description: 'Boundary product. gbOpen (default, CC-BY) | gbHumanitarian | gbAuthoritative.',
        },
      },
      required: ['iso3', 'adm'],
    },
  },
  {
    name: 'get_geometry',
    description:
      'Fetch the actual simplified GeoJSON FeatureCollection geometry for a country/ADM level ' +
      'from geoBoundaries. WARNING: geometry payloads are large (a simplified national ' +
      'ADM1 set can be several MB); this only returns the simplified geometry and refuses ' +
      'payloads over ~4 MB — for those use get_boundaries and download the URL directly. ' +
      'Prefer get_boundaries unless you explicitly need the coordinates. Not valid for adm="ALL".',
    inputSchema: {
      type: 'object',
      properties: {
        iso3: { type: 'string', description: 'ISO-3166-1 alpha-3 country code, e.g. "FRA".' },
        adm: {
          type: 'string',
          enum: ['ADM0', 'ADM1', 'ADM2', 'ADM3', 'ADM4'],
          description: 'Admin level (single level only; "ALL" is not supported here).',
        },
        product: {
          type: 'string',
          enum: VALID_PRODUCT,
          description: 'Boundary product. gbOpen (default, CC-BY) | gbHumanitarian | gbAuthoritative.',
        },
      },
      required: ['iso3', 'adm'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_boundaries': {
      const { iso3, adm, product } = parseArgs(args, VALID_ADM);
      return gbGet(`/${product}/${iso3}/${adm}/`);
    }
    case 'get_geometry': {
      const { iso3, adm, product } = parseArgs(args, ['ADM0', 'ADM1', 'ADM2', 'ADM3', 'ADM4']);
      const meta = (await gbGet(`/${product}/${iso3}/${adm}/`)) as Record<string, unknown>;
      const url = meta.simplifiedGeometryGeoJSON;
      if (typeof url !== 'string' || !url) {
        throw new Error('geoBoundaries: no simplifiedGeometryGeoJSON available for this combination.');
      }
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
      if (!res.ok) {
        const body = await res.text().then((t) => t.slice(0, 200));
        throw new Error(`geoBoundaries: ${res.status} ${body}`);
      }
      const text = await res.text();
      if (text.length > MAX_GEOMETRY_BYTES) {
        throw new Error(
          `geoBoundaries: simplified geometry is ${text.length} bytes (> ${MAX_GEOMETRY_BYTES} cap). ` +
            `Download it directly instead: ${url}`,
        );
      }
      return {
        iso3,
        adm,
        product,
        source: url,
        license: meta.boundaryLicense,
        admUnitCount: meta.admUnitCount,
        geojson: JSON.parse(text),
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function parseArgs(
  args: Record<string, unknown>,
  allowedAdm: string[],
): { iso3: string; adm: string; product: string } {
  const iso3raw = args.iso3;
  if (typeof iso3raw !== 'string' || !/^[A-Za-z]{3}$/.test(iso3raw.trim())) {
    throw new Error('Required argument "iso3" must be a 3-letter ISO-3166-1 alpha-3 code, e.g. "USA".');
  }
  const iso3 = iso3raw.trim().toUpperCase();

  const admRaw = args.adm;
  const adm = typeof admRaw === 'string' ? admRaw.trim().toUpperCase() : '';
  if (!allowedAdm.includes(adm)) {
    throw new Error(`Required argument "adm" must be one of: ${allowedAdm.join(', ')}.`);
  }

  const productRaw = args.product;
  const product = typeof productRaw === 'string' && productRaw.trim() ? productRaw.trim() : 'gbOpen';
  if (!VALID_PRODUCT.includes(product)) {
    throw new Error(`Argument "product" must be one of: ${VALID_PRODUCT.join(', ')}.`);
  }

  return { iso3, adm, product };
}

async function gbGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) {
    const body = await res.text().then((t) => t.slice(0, 200));
    throw new Error(`geoBoundaries: ${res.status} ${body}`);
  }
  return res.json();
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
