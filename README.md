# mcp-geoboundaries

geoBoundaries MCP — open database of political administrative boundaries.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/geoboundaries/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Geoboundaries data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
