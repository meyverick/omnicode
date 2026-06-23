import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import os from "os";
import Parser from "web-tree-sitter";

// Configure paths for grammar cache
const CONFIG_DIR = path.join(os.homedir(), ".config", "omnicode");
const GRAMMARS_CACHE_DIR = path.join(CONFIG_DIR, "grammars");

// Ensure cache directory exists
if (!fs.existsSync(GRAMMARS_CACHE_DIR)) {
  fs.mkdirSync(GRAMMARS_CACHE_DIR, { recursive: true });
}

const EXTENSION_MAP = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  go: "go",
  rs: "rust",
  cpp: "cpp",
  c: "c",
  cs: "c_sharp",
  java: "java",
  rb: "ruby",
  php: "php"
};

// Tree-sitter must be initialized before use
let parserInitialized = false;
const LOADED_LANGUAGES_CACHE = new Map();
const parserPool = [];
async function ensureParserInitialized() {
  if (!parserInitialized) {
    await Parser.init();
    parserInitialized = true;
  }
}

/**
 * Downloads a tree-sitter language parser from CDN if not cached
 * @param {string} extension The file extension (e.g. 'js', 'go')
 * @returns {Promise<Parser.Language|null>}
 */
export async function getOrDownloadLanguage(extension) {
  await ensureParserInitialized();
  
  // Clean extension (remove leading dot)
  const ext = extension.startsWith(".") ? extension.substring(1) : extension;
  const grammarName = EXTENSION_MAP[ext];
  
  if (!grammarName) {
    return null; // Unsupported language
  }

  // Check memory cache first
  if (LOADED_LANGUAGES_CACHE.has(grammarName)) {
    return LOADED_LANGUAGES_CACHE.get(grammarName);
  }

  const localWasmPath = path.join(GRAMMARS_CACHE_DIR, `tree-sitter-${grammarName}.wasm`);

  // 1. Check local cache
  if (fs.existsSync(localWasmPath)) {
    try {
      const lang = await Parser.Language.load(localWasmPath);
      LOADED_LANGUAGES_CACHE.set(grammarName, lang);
      return lang;
    } catch (err) {
      console.warn(`[omnicode] Error loading cached parser ${grammarName}: ${err.message}. Removing cache and retrying.`);
      fs.unlinkSync(localWasmPath);
    }
  }

  // 2. Download from CDN
  try {
    // Pin to latest 0.26 to match web-tree-sitter ABI (adjust if needed)
    const cdnUrl = `https://unpkg.com/tree-sitter-wasms@0.1.11/out/tree-sitter-${grammarName}.wasm`;
    console.log(`[omnicode] Downloading Tree-sitter parser for ${grammarName}...`);
    
    const response = await fetch(cdnUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fsPromises.writeFile(localWasmPath, buffer);
    const lang = await Parser.Language.load(localWasmPath);
    LOADED_LANGUAGES_CACHE.set(grammarName, lang);
    return lang;
  } catch (error) {
    console.warn(`[omnicode] Failed to download parser for ${grammarName}: ${error.message}. Falling back to linear chunking.`);
    return null;
  }
}

/**
 * Manually download a grammar via CLI
 */
export async function downloadLanguageCmd(language) {
  // Allow user to pass "js" or "javascript"
  const grammarName = Object.values(EXTENSION_MAP).includes(language) 
    ? language 
    : EXTENSION_MAP[language];
    
  if (!grammarName) {
    console.error(`[omnicode] Error: Unsupported language '${language}'. Supported: ${Object.keys(EXTENSION_MAP).join(", ")}`);
    return false;
  }

  // Force extension representation to reuse download logic
  const mockExtension = Object.keys(EXTENSION_MAP).find(key => EXTENSION_MAP[key] === grammarName);
  
  const localWasmPath = path.join(GRAMMARS_CACHE_DIR, `tree-sitter-${grammarName}.wasm`);
  if (fs.existsSync(localWasmPath)) {
    fs.unlinkSync(localWasmPath); // Force re-download
  }

  const lang = await getOrDownloadLanguage(mockExtension);
  if (lang) {
    console.log(`[omnicode] Successfully downloaded and cached parser for ${grammarName} at ${localWasmPath}`);
    return true;
  }
  return false;
}

const MAX_CHUNK_SIZE = 4000;

function getLines(sourceCode, startLine, endLine) {
  const lines = sourceCode.split("\n");
  // tree-sitter lines are 0-indexed
  return lines.slice(startLine, endLine + 1).join("\n").trim();
}

/**
 * Recursively splits large AST nodes
 */
function extractChunksFromNode(node, sourceCode, chunks, coveredLines) {
  const nodeText = sourceCode.substring(node.startIndex, node.endIndex);
  
  if (nodeText.length <= MAX_CHUNK_SIZE) {
    // Fits perfectly!
    chunks.push({
      text: nodeText,
      type: node.type,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row
    });
    
    // Mark lines as covered
    for (let i = node.startPosition.row; i <= node.endPosition.row; i++) {
      coveredLines[i] = true;
    }
    return;
  }

  // Node too large, attempt to split by structural children
  let hasStructuralChildren = false;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    // Common block definitions across languages
    if (["method_definition", "function_declaration", "class_declaration", "declaration", "function_definition", "statement_block", "block"].includes(child.type)) {
      hasStructuralChildren = true;
      extractChunksFromNode(child, sourceCode, chunks, coveredLines);
    }
  }

  if (!hasStructuralChildren) {
    // No structural children to split by, slice linearly
    let index = 0;
    while (index < nodeText.length) {
      chunks.push({
        text: nodeText.substring(index, index + MAX_CHUNK_SIZE),
        type: `${node.type}_slice`,
        startLine: node.startPosition.row,
        endLine: node.endPosition.row
      });
      index += MAX_CHUNK_SIZE;
    }
    // Mark lines as covered
    for (let i = node.startPosition.row; i <= node.endPosition.row; i++) {
      coveredLines[i] = true;
    }
  } else {
    // If we extracted children, we don't mark the whole parent as covered yet.
    // The "orphaned lines" logic will catch the unextracted boilerplate (like class signatures)
  }
}

/**
 * Chunks a file structurally using Tree-sitter
 * @returns {Promise<string[]|null>} Array of text chunks, or null if parser fails/unsupported
 */
export async function chunkWithTreeSitter(content, filePath) {
  const ext = path.extname(filePath);
  if (!ext) return null;

  const language = await getOrDownloadLanguage(ext);
  if (!language) return null; // Fall back to linear chunker

  await ensureParserInitialized();
  const parser = parserPool.pop() || new Parser();
  parser.setLanguage(language);

  try {
    const tree = parser.parse(content);
    const chunks = [];
    
    // Track covered lines for orphaned lines capture
    const totalLines = content.split("\n").length;
    const coveredLines = new Array(totalLines).fill(false);

    // Walk the AST
    const cursor = tree.walk();
    
    function traverse(node) {
      if (["function_declaration", "class_declaration", "method_definition", "function_definition", "type_declaration", "interface_declaration"].includes(node.type)) {
        extractChunksFromNode(node, content, chunks, coveredLines);
        // Don't traverse inside, extractChunksFromNode handles it if needed
        return;
      }
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    }
    
    traverse(tree.rootNode);

    // Collect Orphaned Lines
    const sourceLines = content.split("\n");
    let currentOrphanBlock = [];
    
    for (let i = 0; i < totalLines; i++) {
      if (!coveredLines[i]) {
        currentOrphanBlock.push(sourceLines[i]);
      } else {
        if (currentOrphanBlock.length > 0) {
          const orphanText = currentOrphanBlock.join("\n").trim();
          if (orphanText.length > 0) {
            chunks.push({
              text: `// Global/Module Scope Fragment from: ${filePath}\n${orphanText}`,
              type: "module_scope"
            });
          }
          currentOrphanBlock = [];
        }
      }
    }
    if (currentOrphanBlock.length > 0) {
      const orphanText = currentOrphanBlock.join("\n").trim();
      if (orphanText.length > 0) {
        chunks.push({
          text: `// Global/Module Scope Fragment from: ${filePath}\n${orphanText}`,
          type: "module_scope"
        });
      }
    }

    // Filter and return plain text array matching `chunkFile` signature
    return chunks.map(c => c.text).filter(t => t.length > 0);
  } catch (err) {
    console.warn(`[omnicode] Tree-sitter parsing failed for ${filePath}: ${err.message}. Falling back to linear chunker.`);
    return null;
  } finally {
    parserPool.push(parser);
  }
}
