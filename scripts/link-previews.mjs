import { readFile, writeFile } from 'node:fs/promises';
import { globSync } from 'node:fs';
import { marked } from 'marked';
const urls = new Set();
for (const file of globSync('src/content/*.md')) {
  const text = await readFile(file, 'utf8');
  marked.walkTokens(marked.lexer(text), token => {
    if (token.type === 'link' && /^https?:\/\//i.test(token.href)) urls.add(token.href);
  });
  for (const match of text.matchAll(/data-embed="(https?:\/\/[^" ]+)"/g)) urls.add(match[1]);
}
const decode = s => s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const previews = {};
const queue = [...urls];
await Promise.all(Array.from({length:8},async()=> {
  while(queue.length) {
    const url=queue.shift();
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(6000)});
      if(!response.ok || !response.headers.get('content-type')?.includes('text/html')) continue;
      const html=(await response.text()).slice(0,2000000);
      const meta={};
      for(const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attrs={};
        for(const a of tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) attrs[a[1].toLowerCase()]=decode(a[2]);
        meta[attrs.property||attrs.name]=attrs.content;
      }
      const title=meta['og:title']||decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').trim();
      const image=meta['og:image']||meta['twitter:image'];
      previews[url]={title,description:meta['og:description']||meta.description||'',image:image?new URL(image,response.url).href:''};
    } catch {}
  }
}));
await writeFile('src/link-previews.json',JSON.stringify(previews,null,2)+'\n');
console.log(`Saved ${Object.keys(previews).length} previews for ${urls.size} references.`);
