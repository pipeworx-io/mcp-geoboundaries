# mcp-geoboundaries

geoBoundaries MCP — open database of political administrative boundaries.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_boundaries` | Get administrative boundary metadata for a country from geoBoundaries: unit count, year represented, source, license, and download URLs for full GeoJSON (gjDownloadURL), simplified GeoJSON (simplifiedGeometryGeoJSON), TopoJSON (tjDownloadURL) and a static zip. ISO3 is the 3-letter country code (USA, FRA, KEN, IND). ADM level: ADM0=country, ADM1=state/province, ADM2=county/district, ADM3/ADM4=finer, ALL=every level. Default product gbOpen is CC-BY. |
| `get_geometry` | Fetch the actual simplified GeoJSON FeatureCollection geometry for a country/ADM level from geoBoundaries. WARNING: geometry payloads are large (a simplified national ADM1 set can be several MB); this only returns the simplified geometry and refuses payloads over ~4 MB — for those use get_boundaries and download the URL directly. Prefer get_boundaries unless you explicitly need the coordinates. Not valid for adm="ALL". |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "geoboundaries": {
      "url": "https://gateway.pipeworx.io/geoboundaries/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Geoboundaries data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
