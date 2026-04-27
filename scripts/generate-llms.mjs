#!/usr/bin/env node
// Genera llms.txt, llms-full.txt y mirrors .md a partir de sitemap.xml
// y los HTML locales del proyecto. Sin dependencias externas.
//
// Uso:
//   node scripts/generate-llms.mjs
//
// Opciones via env:
//   ROOT=.                       Carpeta raiz del sitio (default: cwd)
//   SITEMAP=sitemap.xml          Ruta al sitemap (default: ./sitemap.xml)
//   SITE_NAME="Marketing Digital Tenerife"
//   SITE_TAGLINE="Diseno web, SEO local y redes sociales en Tenerife..."

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '..'));
const SITEMAP = path.resolve(ROOT, process.env.SITEMAP || 'sitemap.xml');
const SITE_NAME = process.env.SITE_NAME || 'Marketing Digital Tenerife';
const SITE_TAGLINE =
  process.env.SITE_TAGLINE ||
  'Diseno web, SEO local y gestion de redes sociales para negocios en Tenerife. Casos reales documentados (+12.000 seguidores organicos para clientes locales).';

// ---------- Helpers HTML -> texto/markdown ----------

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html) {
  // Reemplazamos los tags por espacio (no por vacio) para evitar
  // que palabras de spans contiguos queden pegadas: <h1><span>A</span><span>B</span></h1>.
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function getMatch(re, html) {
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

function extractTitle(html) {
  return getMatch(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
}

function extractMetaDescription(html) {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i);
  return m ? decodeEntities(m[1]).trim() : '';
}

// Convierte un fragmento HTML en markdown legible.
// No es un converter perfecto pero cubre los tags habituales de las paginas MDT.
function htmlToMarkdown(html) {
  let s = html;

  // Quitar bloques no relevantes
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // Headings
  for (let i = 6; i >= 1; i--) {
    const re = new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, 'gi');
    s = s.replace(re, (_, inner) => `\n\n${'#'.repeat(i)} ${stripTags(inner)}\n\n`);
  }

  // Listas
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `- ${stripTags(inner)}\n`);
  s = s.replace(/<\/?ul[^>]*>/gi, '\n');
  s = s.replace(/<\/?ol[^>]*>/gi, '\n');

  // Enlaces
  s = s.replace(
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const text = stripTags(inner);
      if (!text) return '';
      return `[${text}](${href})`;
    }
  );

  // Negritas / italicas
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => `**${stripTags(inner)}**`);
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => `*${stripTags(inner)}*`);

  // Saltos
  s = s.replace(/<br\s*\/?>(\s*)/gi, '\n');
  s = s.replace(/<\/p>/gi, '\n\n');
  s = s.replace(/<p[^>]*>/gi, '');

  // Bloques div / section / article -> doble salto al cerrar
  s = s.replace(/<\/(section|article|div|main|aside|header|footer)>/gi, '\n\n');
  s = s.replace(/<(section|article|div|main|aside|header|footer)[^>]*>/gi, '');

  // Quitar el resto de tags
  s = s.replace(/<[^>]+>/g, '');

  // Decodificar entidades
  s = decodeEntities(s);

  // Limpiar espacios y saltos sobrantes
  s = s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return s;
}

function extractMain(html) {
  // Preferir <main>, si no, <body> sin <header>/<footer>/<nav>.
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let s = body ? body[1] : html;
  // Quitar nav, header y footer del body (suelen ser globales del sitio).
  s = s.replace(/<header[\s\S]*?<\/header>/gi, '');
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  return s;
}

// ---------- Sitemap ----------

async function readSitemap() {
  const xml = await readFile(SITEMAP, 'utf8');
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((m) => m[1]);
  return urls.map((block) => {
    const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    const priority = parseFloat((block.match(/<priority>([^<]+)<\/priority>/) || [])[1] || '0.5');
    const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || '';
    return { loc: loc.trim(), priority, lastmod };
  });
}

// Convierte una URL del sitemap en una ruta de archivo local
function urlToFilePath(loc) {
  const u = new URL(loc);
  let p = u.pathname;
  if (p === '/' || p === '') return path.join(ROOT, 'index.html');
  // /seo-local-tenerife/ -> seo-local-tenerife/index.html
  if (p.endsWith('/')) return path.join(ROOT, p, 'index.html');
  // /algo.html
  if (p.endsWith('.html')) return path.join(ROOT, p);
  // /algo -> probar /algo.html y /algo/index.html
  const a = path.join(ROOT, `${p}.html`);
  const b = path.join(ROOT, p, 'index.html');
  return existsSync(a) ? a : b;
}

// Donde guardamos el .md mirror para que sea servible junto al HTML
function urlToMdPath(loc) {
  const u = new URL(loc);
  let p = u.pathname;
  if (p === '/' || p === '') return path.join(ROOT, 'index.md');
  if (p.endsWith('/')) return path.join(ROOT, p, 'index.md');
  if (p.endsWith('.html')) return path.join(ROOT, p.replace(/\.html$/, '.md'));
  return path.join(ROOT, `${p}.md`);
}

// ---------- Categorizacion para llms.txt ----------

function categorize(loc) {
  const p = new URL(loc).pathname;
  if (p === '/' || p === '') return 'Home';
  if (p.startsWith('/casos') || p.startsWith('/caso/')) return 'Casos reales';
  if (p.startsWith('/motor-de-reservas')) return 'Producto';
  if (p.includes('cuanto-cuesta') || p.includes('como-conseguir')) return 'Guias y recursos';
  if (
    p.includes('seo-local') ||
    p.includes('diseno-web') ||
    p.includes('redes-sociales') ||
    p.includes('marketing-digital') ||
    p.includes('branding') ||
    p.includes('creacion-de-contenido')
  )
    return 'Servicios';
  if (p.includes('turistico') || p.includes('inmobiliaria')) return 'Sectores';
  return 'Otras paginas';
}

const CATEGORY_ORDER = [
  'Home',
  'Servicios',
  'Producto',
  'Sectores',
  'Casos reales',
  'Guias y recursos',
  'Otras paginas',
];

// ---------- Pipeline principal ----------

async function processUrl(entry) {
  const filePath = urlToFilePath(entry.loc);
  if (!existsSync(filePath)) {
    console.warn(`[skip] No existe HTML local para ${entry.loc} -> ${filePath}`);
    return null;
  }
  const html = await readFile(filePath, 'utf8');
  const title = extractTitle(html) || entry.loc;
  const description = extractMetaDescription(html);
  const main = extractMain(html);
  const markdown = htmlToMarkdown(main);

  return {
    ...entry,
    filePath,
    title,
    description,
    markdown,
  };
}

async function writeMdMirror(page) {
  const out = urlToMdPath(page.loc);
  await mkdir(path.dirname(out), { recursive: true });
  const front = `# ${page.title}\n\n${page.description ? `> ${page.description}\n\n` : ''}URL canonica: ${page.loc}\n\n---\n\n`;
  await writeFile(out, front + page.markdown + '\n', 'utf8');
  return out;
}

function buildLlmsTxt(pages) {
  const lines = [];
  lines.push(`# ${SITE_NAME}`);
  lines.push('');
  lines.push(`> ${SITE_TAGLINE}`);
  lines.push('');
  lines.push(
    'Este archivo sigue el estandar llms.txt (https://llmstxt.org). Lista las paginas relevantes del sitio para que los modelos de lenguaje puedan localizarlas y entender el contenido. Cada enlace tiene un mirror en markdown disponible en la misma URL anadiendo .md al final (cuando aplica).'
  );
  lines.push('');

  // Agrupar por categoria
  const groups = {};
  for (const p of pages) {
    const cat = categorize(p.loc);
    (groups[cat] ||= []).push(p);
  }

  // Ordenar dentro de cada grupo por prioridad descendente
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => b.priority - a.priority);
  }

  for (const cat of CATEGORY_ORDER) {
    if (!groups[cat] || groups[cat].length === 0) continue;
    lines.push(`## ${cat}`);
    lines.push('');
    for (const p of groups[cat]) {
      const desc = p.description ? `: ${p.description}` : '';
      lines.push(`- [${p.title}](${p.loc})${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

function buildLlmsFullTxt(pages) {
  const lines = [];
  lines.push(`# ${SITE_NAME} - contenido completo`);
  lines.push('');
  lines.push(`> ${SITE_TAGLINE}`);
  lines.push('');
  lines.push(
    'Version extendida del llms.txt: incluye el contenido completo (en markdown) de cada pagina del sitio. Pensado para que un LLM pueda responder con todo el contexto sin necesidad de recuperar mas paginas.'
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // Mismo orden que el llms.txt
  const groups = {};
  for (const p of pages) {
    const cat = categorize(p.loc);
    (groups[cat] ||= []).push(p);
  }
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => b.priority - a.priority);
  }

  for (const cat of CATEGORY_ORDER) {
    if (!groups[cat] || groups[cat].length === 0) continue;
    for (const p of groups[cat]) {
      lines.push(`# ${p.title}`);
      lines.push('');
      if (p.description) {
        lines.push(`> ${p.description}`);
        lines.push('');
      }
      lines.push(`URL: ${p.loc}`);
      if (p.lastmod) lines.push(`Ultima modificacion: ${p.lastmod}`);
      lines.push('');
      lines.push(p.markdown);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n').trim() + '\n';
}

// ---------- Main ----------

async function main() {
  console.log(`Root: ${ROOT}`);
  console.log(`Sitemap: ${SITEMAP}`);

  const entries = await readSitemap();
  console.log(`URLs en sitemap: ${entries.length}`);

  const pages = [];
  for (const e of entries) {
    const page = await processUrl(e);
    if (page) pages.push(page);
  }
  console.log(`Paginas procesadas: ${pages.length}`);

  // Mirrors .md
  for (const p of pages) {
    const out = await writeMdMirror(p);
    console.log(`  md  -> ${path.relative(ROOT, out)}`);
  }

  // llms.txt
  const llmsTxt = buildLlmsTxt(pages);
  await writeFile(path.join(ROOT, 'llms.txt'), llmsTxt, 'utf8');
  console.log('  out -> llms.txt');

  // llms-full.txt
  const llmsFull = buildLlmsFullTxt(pages);
  await writeFile(path.join(ROOT, 'llms-full.txt'), llmsFull, 'utf8');
  console.log('  out -> llms-full.txt');

  console.log('Listo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
