import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join } from 'node:path';

const ROOT = new URL('../', import.meta.url);
const CONTENT_DIR = new URL('src/content/', ROOT);
const COVER_DIR = new URL('public/images/covers/', ROOT);
const MEDIA_DIR = new URL('public/images/articles/', ROOT);
const MANIFEST_FILE = new URL('src/content-manifest.json', ROOT);
const INDEX_URL = 'https://everythingblackkk.gitbook.io/everythingblackkk/llms.txt';
const MEDIUM_FEED_URL = 'https://medium.com/feed/@everythingBlackkk';
const MANUAL_DIR = new URL('scripts/manual-articles/', ROOT);
const mediumSources = [
  {
    id: '43a88f9ce12e',
    slug: 'mobile-security-flutter-root-detection-arm64-patch',
    title: 'Bypassing Flutter Root Detection with One ARM64 Patch (Android)',
    tags: ['Mobile Security', 'Flutter', 'Android', 'ARM64'],
  },
  {
    id: '85c5b2e8c6c5',
    slug: 'mobile-security-ios-safe-device-root-detection',
    title: 'iOS Bypass Root Detection in safe_device 1.3.10',
    tags: ['Mobile Security', 'Flutter', 'iOS', 'Reverse Engineering'],
  },
  {
    id: '8ffe557ecf56',
    slug: 'mobile-security-flutter-proxy-settings',
    title: "Why Proxy Settings Don’t Work in Flutter Apps",
    tags: ['Mobile Security', 'Flutter', 'Proxy', 'Networking'],
  },
];
const manualSources = [
  {
    "file": "ctf-mulmusic-lumma-stealer.md",
    "slug": "ctf-mulmusic-lumma-stealer",
    "title": "Mal Music: Reversing a Lumma Stealer-Inspired Challenge",
    "category": "CTF",
    "tags": [
      "CTF",
      "Reverse Engineering",
      "Malware Analysis",
      "PowerShell",
      ".NET"
    ],
    "cover": "./images/manual/mulmusic/cover.png",
    "generatedCover": "./images/manual/mulmusic/cover.png",
    "sourceUrl": "https://app.notion.com/p/3df4a24dd79580c4844ae234b75dbb8d"
  },
  {
    file: 'mobile-security-flipcoin.md',
    slug: 'mobile-security-flipcoin',
    title: 'MobileHackingLab – FlipCoin: Deep-Link SQL Injection on iOS',
    category: 'Mobile Security',
    tags: ['Mobile Security', 'iOS', 'Deep Links', 'SQL Injection'],
    cover: './images/manual/flipcoin-lab/cover.png',
    generatedCover: './images/manual/flipcoin-lab/cover.png',
    sourceUrl: 'https://academy.mobilehackinglab.com/course/lab-flipcoin',
  },
  {
    file: 'mobile-security-no-escape.md',
    slug: 'mobile-security-no-escape',
    title: 'MobileHackingLab – No Escape: Bypassing iOS Jailbreak Detection',
    category: 'Mobile Security',
    tags: ['Mobile Security', 'iOS', 'LLDB', 'Frida'],
    cover: './images/manual/no-escape/01.png',
    generatedCover: './images/manual/no-escape/fallback.svg',
    sourceUrl: 'https://academy.mobilehackinglab.com/course/lab-no-escape',
  },
];

const categoryNames = {
  'web-security': 'Web Security',
  'my-cve': 'My CVE',
  'android-security': 'Mobile Security',
  'php-security': 'PHP Security',
  'web-development-and-technologies': 'Web Security',
  'offensive-security': 'Offensive Security',
  ctf: 'CTF',
  'python-tools': 'Offensive Security',
  'crypto-note': 'Offensive Security',
};

const categoryColors = {
  'Web Security': ['#d8d8d8', '#4d4d4d'],
  'My CVE': ['#f0f0f0', '#565656'],
  'Mobile Security': ['#c8c8c8', '#454545'],
  'PHP Security': ['#bcbcbc', '#3f3f3f'],
  'Offensive Security': ['#dedede', '#4a4a4a'],
  CTF: ['#cacaca', '#424242'],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRetry(url, tries = 4) {
  let lastError;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      await sleep(350 * (attempt + 1));
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError?.message}`);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&[^;]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 88);
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|{}\[\]\\]/g, ' ')
    .replace(/&(?:#x?[0-9a-f]+|\w+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagsFor(title, category, text) {
  const haystack = `${title} ${text.slice(0, 2600)}`.toLowerCase();
  const rules = [
    ['PHP', /\bphp\b/], ['GraphQL', /graphql/], ['JWT', /\bjwt\b/],
    ['Android', /android|apk|frida/], ['Web', /web|http|browser/],
    ['CVE', /\bcve-/], ['Cryptography', /crypto|rsa|aes|cipher/],
    ['Active Directory', /active directory|kerberos|ntlm|gpo/],
    ['Python', /python/], ['CTF', /\bctf\b|challenge/],
    ['Injection', /injection|sql\b/], ['Authentication', /auth|session|login/],
    ['Forensics', /forensic/], ['Networking', /dns|network|cors|sop/],
  ];
  const tags = rules.filter(([, matcher]) => matcher.test(haystack)).map(([tag]) => tag);
  if (!tags.includes(category) && !['Web Technologies', 'CVE Research'].includes(category)) tags.unshift(category);
  return [...new Set(tags)].slice(0, 4);
}

function coverSvg(slug, title, category, index) {
  const digest = createHash('sha256').update(slug).digest();
  const [accent, deep] = categoryColors[category] || ['#71f6ad', '#245943'];
  const x1 = 110 + digest[0] * 2.8;
  const y1 = 70 + digest[1] * 1.45;
  const x2 = 730 + digest[2] * 1.7;
  const y2 = 120 + digest[3] * 1.5;
  const label = category.toUpperCase().replace(/&/g, '&amp;');
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="680" viewBox="0 0 1200 680">
  <defs>
    <radialGradient id="a" cx="0" cy="0" r="1" gradientTransform="translate(${x1} ${y1}) rotate(35) scale(620 420)">
      <stop stop-color="${accent}" stop-opacity=".27"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b" cx="0" cy="0" r="1" gradientTransform="translate(${x2} ${y2}) rotate(140) scale(560 400)">
      <stop stop-color="${deep}" stop-opacity=".7"/><stop offset="1" stop-color="${deep}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#fff" stroke-opacity=".045"/></pattern>
    <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .05"/></feComponentTransfer></filter>
  </defs>
  <rect width="1200" height="680" rx="36" fill="#0b100e"/><rect width="1200" height="680" rx="36" fill="url(#a)"/><rect width="1200" height="680" rx="36" fill="url(#b)"/><rect width="1200" height="680" rx="36" fill="url(#g)"/>
  <path d="M${100 + digest[4]} 508C330 290 596 650 1110 ${210 + digest[5]}" fill="none" stroke="${accent}" stroke-opacity=".22" stroke-width="2"/>
  <circle cx="${x1}" cy="${y1}" r="8" fill="${accent}"/><circle cx="${x2}" cy="${y2}" r="5" fill="${accent}" fill-opacity=".7"/>
  <text x="72" y="86" fill="${accent}" font-family="ui-monospace,monospace" font-size="18" letter-spacing="3">${String(index).padStart(2, '0')} / ${label}</text>
  <text x="72" y="588" fill="#eef7f1" font-family="ui-sans-serif,system-ui" font-size="34" font-weight="650">${safeTitle.slice(0, 54)}</text>
  <text x="72" y="626" fill="#a4b2aa" font-family="ui-monospace,monospace" font-size="17">everythingBlackkk / research.notes</text>
  <rect width="1200" height="680" rx="36" filter="url(#noise)" opacity=".65"/>
</svg>`;
}

function extensionFrom(contentType, url) {
  const known = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
    'image/gif': '.gif', 'image/svg+xml': '.svg', 'image/avif': '.avif', 'video/mp4': '.mp4',
  };
  return known[contentType?.split(';')[0]] || extname(new URL(url).pathname) || '.bin';
}

async function localizeFiles(markdown, slug, pageUrl) {
  const refs = [...new Set([...markdown.matchAll(/(?:src|href)=["'](\/files\/[^"']+)["']|\]\((\/files\/[^)]+)\)/g)].map((match) => match[1] || match[2]))];
  if (!refs.length) return markdown;
  const html = await (await fetchRetry(pageUrl.replace(/\.md$/, ''))).text();
  const observedSources = [...new Set([...html.matchAll(/~gitbook\/image\?url=([^&"']+)/g)]
    .map((match) => {
      try { return decodeURIComponent(match[1]); } catch { return null; }
    })
    .filter((url) => url?.includes('-files.gitbook.io/')))];
  const folder = new URL(`${slug}/`, MEDIA_DIR);
  await mkdir(folder, { recursive: true });
  let updated = markdown;
  await Promise.all(refs.map(async (ref, index) => {
    try {
      const url = observedSources[index];
      if (!url) throw new Error('No matching rendered asset');
      const response = await fetchRetry(url, 4);
      const extension = extensionFrom(response.headers.get('content-type'), response.url);
      const filename = `${String(index + 1).padStart(2, '0')}${extension}`;
      await writeFile(new URL(filename, folder), Buffer.from(await response.arrayBuffer()));
      updated = updated.split(ref).join(`./images/articles/${slug}/${filename}`);
    } catch (error) {
      console.warn(`  media skipped ${ref}: ${error.message}`);
    }
  }));
  return updated;
}

async function localizeRemoteImages(html, slug) {
  const refs = [...new Set([...html.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((url) => !url.includes('medium.com/_/stat')))];
  if (!refs.length) return html;
  const folder = new URL(`${slug}/`, MEDIA_DIR);
  await mkdir(folder, { recursive: true });
  let updated = html;
  await Promise.all(refs.map(async (url, index) => {
    try {
      const response = await fetchRetry(url, 2);
      const extension = extensionFrom(response.headers.get('content-type'), response.url);
      const filename = `${String(index + 1).padStart(2, '0')}${extension}`;
      await writeFile(new URL(filename, folder), Buffer.from(await response.arrayBuffer()));
      updated = updated.split(url).join(`./images/articles/${slug}/${filename}`);
    } catch (error) {
      console.warn(`  Medium media skipped ${url}: ${error.message}`);
    }
  }));
  return updated;
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, number) => String.fromCodePoint(Number(number)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function normalizeMediumHtml(html) {
  return html
    .replace(/<img[^>]+medium\.com\/_\/stat[^>]*>/gi, '')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_match, inner) => `\n\n## ${decodeHtml(inner.replace(/<[^>]+>/g, '')).trim()}\n\n`)
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_match, inner) => `<pre><code>${inner.replace(/<br\s*\/?\s*>/gi, '\n')}</code></pre>`)
    .trim();
}

function mediumItems(feed) {
  return [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const item = match[1];
    return {
      guid: item.match(/<guid[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/guid>/)?.[1] || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '',
      link: decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').replace(/\?source=.*$/, ''),
      content: item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] || '',
    };
  });
}

function normalizeMarkdown(markdown) {
  return markdown
    .replace(/^> For the complete documentation index,[^\n]*\n\n?/m, '')
    .replace(/<a href="#[^"]*" id="[^"]*"><\/a>/g, '')
    .replace(/\{% embed url="<?([^">]+)>?" %\}/g, (_all, url) => `\n<div data-embed="${url}"></div>\n`)
    .replace(/\{% hint style="([^"]+)" %\}/g, '<blockquote class="callout $1">')
    .replace(/\{% endhint %\}/g, '</blockquote>')
    .replace(/\{% tabs %\}|\{% endtabs %\}/g, '')
    .replace(/\{% tab title="([^"]+)" %\}/g, '<section class="tab-panel"><h4>$1</h4>')
    .replace(/\{% endtab %\}/g, '</section>')
    .replace(/\{% code[^%]*%\}|\{% endcode %\}/g, '')
    .replace(/\{% file src="([^"]+)" %\}[^\n]*\{% endfile %\}/g, '[$1]($1)')
    .replace(/<mark style="color:([^;"]+);?">/g, '<mark class="mark-$1">')
    .trim();
}

function firstArticleImage(markdown) {
  const htmlImage = markdown.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  const markdownImage = markdown.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/)?.[1];
  return htmlImage || markdownImage || null;
}

async function main() {
  console.log('Reading GitBook index…');
  const indexText = await (await fetchRetry(INDEX_URL)).text();
  const entries = [...indexText.matchAll(/^- \[([^\]]+)\]\((https:\/\/[^)]+\.md)\)(?::[^\n]*)?$/gm)]
    .map(([, title, url]) => ({ title: title.replace(/\\_/g, '_'), url }))
    .filter(({ url }) => !url.includes('/malware-development/')
      && !url.includes('/my-active-directory-note-balarby/')
      && !url.endsWith('/python-tools/integrations-1.md'));

  await rm(CONTENT_DIR, { recursive: true, force: true });
  await rm(COVER_DIR, { recursive: true, force: true });
  await rm(MEDIA_DIR, { recursive: true, force: true });
  await Promise.all([mkdir(CONTENT_DIR, { recursive: true }), mkdir(COVER_DIR, { recursive: true }), mkdir(MEDIA_DIR, { recursive: true })]);

  const seen = new Set();
  const specs = entries.map((entry, index) => {
    const path = new URL(entry.url).pathname.replace('/everythingblackkk/', '').replace(/\.md$/, '');
    const isAbout = path === 'readme';
    const categoryKey = isAbout ? 'about' : path.split('/')[0];
    const category = isAbout ? 'About' : (categoryNames[categoryKey] || categoryKey.replace(/-/g, ' '));
    let slug = isAbout ? 'whoami' : slugify(`${categoryKey}-${path.split('/').at(-1)}`);
    if (seen.has(slug)) slug = `${slug}-${index + 1}`;
    seen.add(slug);
    return { ...entry, index, path, isAbout, category, slug };
  });

  const results = new Array(specs.length);
  let cursor = 0;
  async function worker() {
    while (cursor < specs.length) {
      const position = cursor++;
      const entry = specs[position];
      const { index, isAbout, category, slug } = entry;
      console.log(`[${index + 1}/${entries.length}] ${entry.title}`);
    const raw = await (await fetchRetry(entry.url)).text();
    let originalTitle = raw.match(/^#\s+(.+)$/m)?.[1]?.replace(/<[^>]+>/g, '').trim() || entry.title;
    let markdown = normalizeMarkdown(raw);
      if (entry.path === 'my-cve/cve-2026-winter') {
        originalTitle = 'CVE-2026-35445 (Heigh)';
        markdown = markdown.replace(/^#\s+.*$/m, '# CVE-2026-35445 (Heigh)');
      } else if (entry.path === 'my-cve/cve-2026-twig') {
        originalTitle = 'OS Injection in Twig';
        markdown = markdown.replace(/^#\s+.*$/m, '# OS Injection in Twig');
      }
      markdown = await localizeFiles(markdown, slug, entry.url);
    const bodyText = plainText(markdown.replace(/^#\s+.*$/m, ''));
    const words = bodyText.split(/\s+/).filter(Boolean).length;
    if (!isAbout) {
      await writeFile(new URL(`${slug}.md`, CONTENT_DIR), `${markdown}\n`);
      await writeFile(new URL(`${slug}.svg`, COVER_DIR), coverSvg(slug, originalTitle, category, index));
      const articleImage = firstArticleImage(markdown);
        results[position] = {
        slug,
        title: originalTitle,
        category,
        tags: tagsFor(originalTitle, category, bodyText),
        excerpt: bodyText.slice(0, 190).replace(/\s+\S*$/, '') + (bodyText.length > 190 ? '…' : ''),
        readingTime: Math.max(2, Math.ceil(words / 210)),
        wordCount: words,
        cover: articleImage || `./images/covers/${slug}.svg`,
        generatedCover: `./images/covers/${slug}.svg`,
        sourceUrl: entry.url.replace(/\.md$/, ''),
        };
    } else {
      await writeFile(new URL('whoami.md', CONTENT_DIR), `${markdown}\n`);
    }
  }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));

  console.log('Reading Medium feed…');
  const feed = await (await fetchRetry(MEDIUM_FEED_URL)).text();
  const feedItems = mediumItems(feed);
  const mediumResults = await Promise.all(mediumSources.map(async (source, index) => {
    const item = feedItems.find((candidate) => candidate.guid.includes(source.id) || candidate.link.includes(source.id));
    if (!item?.content) throw new Error(`Medium article ${source.id} was not found in the author feed.`);
    console.log(`[Medium ${index + 1}/${mediumSources.length}] ${source.title}`);
    let markdown = normalizeMediumHtml(item.content);
    markdown = await localizeRemoteImages(markdown, source.slug);
    markdown = `# ${source.title}\n\n${markdown}\n`;
    const bodyText = plainText(markdown.replace(/^#\s+.*$/m, ''));
    const words = bodyText.split(/\s+/).filter(Boolean).length;
    const generatedCover = `./images/covers/${source.slug}.svg`;
    await writeFile(new URL(`${source.slug}.md`, CONTENT_DIR), markdown);
    await writeFile(new URL(`${source.slug}.svg`, COVER_DIR), coverSvg(source.slug, source.title, 'Mobile Security', entries.length + index));
    return {
      slug: source.slug,
      title: source.title,
      category: 'Mobile Security',
      tags: source.tags,
      excerpt: bodyText.slice(0, 190).replace(/\s+\S*$/, '') + (bodyText.length > 190 ? '…' : ''),
      readingTime: Math.max(2, Math.ceil(words / 210)),
      wordCount: words,
      cover: firstArticleImage(markdown) || generatedCover,
      generatedCover,
      sourceUrl: item.link,
    };
  }));

  const manualResults = await Promise.all(manualSources.map(async (source) => {
    console.log(`[Local note] ${source.title}`);
    const markdown = await readFile(new URL(source.file, MANUAL_DIR), 'utf8');
    await writeFile(new URL(`${source.slug}.md`, CONTENT_DIR), markdown);
    const bodyText = plainText(markdown.replace(/^#\s+.*$/m, ''));
    const words = bodyText.split(/\s+/).filter(Boolean).length;
    return {
      slug: source.slug,
      title: source.title,
      category: source.category,
      tags: source.tags,
      excerpt: bodyText.slice(0, 190).replace(/\s+\S*$/, '') + (bodyText.length > 190 ? '…' : ''),
      readingTime: Math.max(2, Math.ceil(words / 210)),
      wordCount: words,
      cover: source.cover,
      generatedCover: source.generatedCover,
      sourceUrl: source.sourceUrl,
    };
  }));

  const manifest = results.filter(Boolean);
  const phpStart = manifest.findIndex((article) => article.category === 'PHP Security');
  manifest.splice(phpStart < 0 ? manifest.length : phpStart, 0, ...mediumResults, ...manualResults);
  await writeFile(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Imported ${manifest.length} articles from GitBook, Medium, and local notes. Malware Development and Active Directory excluded.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
