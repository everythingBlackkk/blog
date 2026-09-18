import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile('src/content-manifest.json','utf8'));
const template=await readFile('dist/index.html','utf8');
const origin='https://everythingblackkk.github.io/blog/';
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const tags=(title,description,url,image)=>`<link rel="canonical" href="${escape(url)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="everythingBlackkk" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:url" content="${escape(url)}" />
<meta property="og:image" content="${escape(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escape(title)}" />
<meta name="twitter:description" content="${escape(description)}" />
<meta name="twitter:image" content="${escape(image)}" />`;
for(const a of manifest) {
  let cover=a.cover;
  // Social preview crawlers need raster images; render generated SVG covers.
  if(cover.endsWith('.svg')) {
    const sharp=(await import('sharp')).default;
    const target=`dist/images/social/${a.slug}.png`;
    await mkdir('dist/images/social',{recursive:true});
    await sharp('public/'+cover.replace(/^\.\//,'')).resize(1200,630,{fit:'cover'}).png().toFile(target);
    cover=`./images/social/${a.slug}.png`;
  }
  const url=`${origin}article/${a.slug}/`;
  const html=template.replace(/<title>.*?<\/title>/,`<title>${escape(a.title)} — everythingBlackkk</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(a.excerpt)}" />`).replace('</head>',tags(a.title,a.excerpt,url,new URL(cover,origin).href)+'\n</head>');
  await mkdir(`dist/article/${a.slug}`,{recursive:true});
  await writeFile(`dist/article/${a.slug}/index.html`,html);
}
await copyFile('dist/index.html','dist/404.html');
console.log(`Generated ${manifest.length} shareable article pages.`);
