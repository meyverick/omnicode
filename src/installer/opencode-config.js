const PLUGIN = "opencode-omniroute-auth";

function stripJsoncComments(text) {
  return text
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
}

function parseJsonc(text) {
  const stripped = stripJsoncComments(text);
  return JSON.parse(stripped);
}

function serializeJsonc(cfg) {
  return JSON.stringify(cfg, null, 2) + "\n";
}

export function mergeOpenCodePlugin(existingText) {
  let cfg;
  if (existingText && existingText.trim()) {
    try {
      cfg = parseJsonc(existingText);
    } catch (err) {
      throw new Error(`Failed to parse existing opencode.jsonc: ${err.message}`);
    }
  } else {
    cfg = { $schema: "https://opencode.ai/config.json" };
  }

  if (!Array.isArray(cfg.plugin)) {
    cfg.plugin = [];
  }

  const normalized = cfg.plugin.map((entry) => (typeof entry === "string" ? entry : Array.isArray(entry) ? entry[0] : entry));

  if (normalized.includes(PLUGIN)) {
    return { content: existingText || serializeJsonc(cfg), changed: false };
  }

  cfg.plugin.push(PLUGIN);
  return { content: serializeJsonc(cfg), changed: true };
}
