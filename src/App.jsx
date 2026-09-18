import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { marked } from 'marked';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight,
  Code2, ContactRound, FileUser, House, Menu, Search, Terminal, X,
} from 'lucide-react';
import manifest from './content-manifest.json';

const contentFiles = import.meta.glob('./content/*.md', { eager: true, query: '?raw', import: 'default' });
const articles = manifest.map((article) => ({ ...article, content: contentFiles[`./content/${article.slug}.md`] }));

const CATEGORY_ICONS = {
  'Web Security': 'WEB', 'My CVE': 'CVE', 'Mobile Security': 'MOB',
  'PHP Security': 'PHP', 'Offensive Security': 'OPS', CTF: 'CTF',
};
const CV_URL = 'https://docs.google.com/document/d/1ArRPUgr5nOuyppMEwJ7mimVP1TIVpP6MQ55SO3MCmtU/edit?usp=sharing';
const categoryList = [...new Set(articles.map((article) => article.category))];
const categorySlug = (category) => category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const categoryFromSlug = (slug) => categoryList.find((category) => categorySlug(category) === slug);
const homeArticles = [
  ...articles.filter((article) => article.slug === 'ctf-mulmusic-lumma-stealer'),
  ...articles.filter((article) => article.slug === 'mobile-security-no-escape'),
  ...articles.filter((article) => article.category === 'Mobile Security' && ![
    'mobile-security-no-escape',
    'android-security-mobilehackinglabs-gussme',
  ].includes(article.slug)),
  ...articles.filter((article) => ['offensive-security-use-dns-record-in-red-team', 'offensive-security-c2-server-via-youtube'].includes(article.slug)),
  ...articles.filter((article) => article.category === 'My CVE'),
];

function useRoute() {
  const getRoute = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const onChange = () => { setRoute(getRoute()); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

function Header({ openSearch }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#/" aria-label="everythingBlackkk home">
          <span className="brand-mark"><Terminal size={17} /></span>
          <span>everything<span>Blackkk</span></span>
        </a>
        <nav className={open ? 'nav-links is-open' : 'nav-links'} aria-label="Primary navigation">
          <a href="#/" onClick={() => setOpen(false)}>Articles</a>
          <a href="#/categories" onClick={() => setOpen(false)}>Categories</a>
          <a href="#/about" onClick={() => setOpen(false)}>Whoami</a>
          <a href={CV_URL} target="_blank" rel="noreferrer">My CV <FileUser size={13} /></a>
          <a href="https://github.com/everythingBlackkk" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a>
        </nav>
        <div className="header-actions">
          <button className="search-trigger" onClick={openSearch} aria-label="Search articles">
            <Search size={16} /><span>Search</span><kbd>⌘ K</kbd>
          </button>
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function PlatformMark({ type, children }) {
  return (
    <span className="platform-mark">
      {type === 'apple' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 16.88 3.22 9.4 8.94 9.08c1.38.07 2.35.76 3.16.8 1.2-.24 2.35-.93 3.63-.84 1.54.12 2.7.73 3.47 1.84-3.18 1.91-2.42 6.1.49 7.27-.58 1.53-1.33 3.04-2.64 4.13ZM12.03 8.93c-.15-2.27 1.69-4.15 3.8-4.33.29 2.62-2.38 4.58-3.8 4.33Z" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.1 5.1-1.3-2a.55.55 0 0 1 .92-.6l1.37 2.1A7.7 7.7 0 0 1 12 4c1.04 0 2.02.2 2.91.6l1.37-2.1a.55.55 0 1 1 .92.6l-1.3 2A6.25 6.25 0 0 1 19 10H5a6.25 6.25 0 0 1 3.1-4.9ZM9 7.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Zm6 0a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6ZM5 11h14v7.5A1.5 1.5 0 0 1 17.5 20H16v2h-2v-2h-4v2H8v-2H6.5A1.5 1.5 0 0 1 5 18.5V11Z" /></svg>
      )}
      {children}
    </span>
  );
}

function Hero() {
  return (
    <section className="hero" id="whoami">
      <div className="whoami-shell">
        <div className="whoami-command"><span>$</span> whoami</div>
        <div className="profile-identity">
          <img src="./avatar.jpg" alt="Yassin" />
          <div><strong>Yassin</strong><span>Security Researcher &amp; Software Developer</span><small>Web · <PlatformMark type="android">Android</PlatformMark> · <PlatformMark type="apple">iOS</PlatformMark> · Network</small></div>
        </div>
        <div className="whoami-copy">
          <p>Hey, I’m Yassin. I specialize in vulnerability research, actively hunting for critical security bugs across <strong>Web</strong>, <PlatformMark type="android"><strong>Android</strong></PlatformMark>, <PlatformMark type="apple"><strong>iOS</strong></PlatformMark>, and <strong>Network</strong> environments.</p>
          <p>I also work on software development, with hands-on experience building projects and creating CTF challenges. I have a good understanding of CI/CD pipelines and modern development workflows.</p>
          <p>I code in C/C++, Python, and Java. I’m always pushing myself to learn, break, and deeply understand systems.</p>
          <p>My published disclosures include <a href="#/article/my-cve-cve-2026-27593-critical">CVE-2026-27593</a>, <a href="#/article/my-cve-cve-2026-33177-moderate">CVE-2026-33177</a>, and <a href="#/article/my-cve-cve-2026-winter">CVE-2026-35445</a>.</p>
          <p>Find my work on <a href="https://github.com/everythingBlackkk" target="_blank" rel="noreferrer">GitHub</a>. You can also reach me through <a href="https://www.linkedin.com/in/everythingblackkk/" target="_blank" rel="noreferrer">LinkedIn</a> or <a href="https://x.com/iyassinmo" target="_blank" rel="noreferrer">X</a>.</p>
        </div>
        <p className="whoami-signoff">I love programming and I love hacking everything that is programmed.</p>
      </div>
    </section>
  );
}

function YouTubeSection() {
  const stars = [
    [4, -2, 0], [17, 101, .8], [29, -2, 1.7], [43, 101, .3], [58, -2, 2.1],
    [72, 101, 1.2], [87, -2, .5], [97, 24, 1.9], [97, 76, .2], [2, 54, 1.4],
  ];
  return (
    <section className="youtube-panel" aria-label="YouTube channel">
      <div className="youtube-stars" aria-hidden="true">{stars.map(([x, y, delay], index) => <i key={index} style={{ '--star-x': `${x}%`, '--star-y': `${y}%`, '--star-delay': `${delay}s` }} />)}</div>
      <div className="youtube-icon" aria-hidden="true">
        <svg viewBox="0 0 28 20" role="img"><path d="M27.4 3.1A3.5 3.5 0 0 0 25 0.6C22.8 0 18.1 0 14 0S5.2 0 3 .6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 7.8 0 10s0 4.7.6 6.9A3.5 3.5 0 0 0 3 19.4c2.2.6 6.9.6 11 .6s8.8 0 11-.6a3.5 3.5 0 0 0 2.4-2.5c.6-2.2.6-4.7.6-6.9s0-4.7-.6-6.9Z"/><path className="youtube-triangle" d="m11 14.3 7.3-4.3L11 5.7v8.6Z"/></svg>
      </div>
      <div><span>VIDEO NOTES</span><h2>everythingBlackkk on YouTube</h2><p>Security research, technical walkthroughs, and practical explanations in video form.</p></div>
      <a href="https://www.youtube.com/@everythingBlackkk" target="_blank" rel="noreferrer">Visit channel <ArrowUpRight size={15} /></a>
    </section>
  );
}

function CveMarquee() {
  const cves = articles
    .map((article) => ({ article, number: article.title.match(/CVE-\d{4}-\d+/i)?.[0]?.toUpperCase() }))
    .filter(({ article, number }) => article.category === 'My CVE' && number);
  const loopItems = [...cves, ...cves, ...cves];
  return (
    <section className="cve-marquee" aria-label="Published CVE disclosures">
      <div className="cve-marquee-label"><span>DISCLOSURES</span><small>Hover to pause</small></div>
      <div className="cve-marquee-window">
        <div className="cve-marquee-track">
          {[0, 1].map((group) => (
            <div className="cve-marquee-group" aria-hidden={group === 1} key={group}>
              {loopItems.map(({ article, number }, index) => <a href={`#/article/${article.slug}`} key={`${group}-${article.slug}-${index}`}>{number}</a>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArticleCard({ article, featured = false }) {
  return (
    <article className={featured ? 'article-card featured' : 'article-card'}>
      <a className="card-cover" href={`#/article/${article.slug}`} aria-label={`Read ${article.title}`}>
        <img src={article.cover} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = article.generatedCover; }} />
        <span className="cover-code">{CATEGORY_ICONS[article.category] || 'LOG'}</span>
      </a>
      <div className="card-body">
        <div className="card-meta"><a href={`#/category/${categorySlug(article.category)}`}>{article.category}</a></div>
        <h3><a href={`#/article/${article.slug}`}>{article.title}</a></h3>
        <p>{article.excerpt}</p>
        <div className="card-footer">
          <div className="tag-list">{article.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <a className="read-link" href={`#/article/${article.slug}`} aria-label={`Read ${article.title}`}><ArrowRight size={17} /></a>
        </div>
      </div>
    </article>
  );
}

function CategoryDirectory({ compact = false }) {
  return (
    <section className={compact ? 'category-directory compact' : 'category-directory'} aria-label="Article categories">
      <div className="category-title"><span>BROWSE / TOPICS</span><h2>Category</h2><p>Choose a field and explore its technical writeups.</p></div>
      <div className="category-grid">
        {categoryList.map((category) => {
          const count = articles.filter((article) => article.category === category).length;
          return <a className="category-card" href={`#/category/${categorySlug(category)}`} key={category}>
            <span className="category-code">{CATEGORY_ICONS[category]}</span>
            <span className="category-node-copy"><strong>{category}</strong><small>Browse {count} {count === 1 ? 'article' : 'articles'}</small></span>
            <span className="category-count">{String(count).padStart(2, '0')}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </a>;
        })}
      </div>
    </section>
  );
}

function ArticleExplorer({ initialQuery = '', initialCategory = 'All', sourceArticles = articles }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const categories = ['All', ...new Set(sourceArticles.map((article) => article.category))];
  useEffect(() => setCategory(initialCategory), [initialCategory]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sourceArticles.filter((article) => {
      const categoryMatch = category === 'All' || article.category === category;
      const textMatch = !needle || `${article.title} ${article.excerpt} ${article.tags.join(' ')} ${article.category} ${article.content}`.toLowerCase().includes(needle);
      return categoryMatch && textMatch;
    });
  }, [query, category, sourceArticles]);

  return (
    <section className="explorer" id="articles">
      <div className="section-heading">
        <div><h2>Technical writing</h2></div>
      </div>
      <div className="explorer-toolbar">
        <label className="inline-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, tags, or full text…" /></label>
        <span className="result-count">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div className="category-row" aria-label="Filter by category">
        {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      {filtered.length ? <div className="article-grid">{filtered.map((article) => <ArticleCard article={article} key={article.slug} />)}</div> : (
        <div className="empty-state"><Search size={26} /><h3>No matching field notes</h3><p>Try a broader term or switch categories.</p></div>
      )}
    </section>
  );
}

function Home() {
  return <main className="home-page"><div className="page-shell">
    <Hero />
    <YouTubeSection />
    <CveMarquee />
    <CategoryDirectory compact />
    <ArticleExplorer sourceArticles={homeArticles} />
    <div className="home-read-more">
      <a href="#/categories">Read More.... <ArrowRight size={17} /></a>
    </div>
  </div></main>;
}

function CategoriesPage() {
  return <main className="categories-page"><div className="page-shell"><CategoryDirectory /><ArticleExplorer /></div></main>;
}

function CategoryPage({ slug }) {
  const category = categoryFromSlug(slug);
  if (!category) return <NotFound />;
  return <main className="categories-page"><div className="page-shell"><a className="back-link" href="#/categories"><ArrowLeft size={15} /> All categories</a><ArticleExplorer initialCategory={category} /></div></main>;
}

function youtubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1);
    if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2];
    return parsed.searchParams.get('v');
  } catch { return null; }
}

function headingBase(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>|[*_`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'section';
}

function uniqueHeadingId(text, counts) {
  const base = headingBase(text);
  const count = counts.get(base) || 0;
  counts.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function renderMarkdown(source) {
  const withEmbeds = source.replace(/<div data-embed="([^"]+)"><\/div>/g, (_match, url) => {
    const id = youtubeId(url);
    if (id) return `<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube reference" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    return `<a class="reference-card" href="${url}" target="_blank" rel="noreferrer">Open referenced resource ↗</a>`;
  });
  const renderer = new marked.Renderer();
  const headingCounts = new Map();
  renderer.heading = function heading({ tokens, depth }) {
    const label = this.parser.parseInline(tokens, this.parser.textRenderer);
    const id = uniqueHeadingId(label, headingCounts);
    return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>`;
  };
  renderer.link = ({ href, title, text }) => {
    const external = /^https?:/.test(href);
    return `<a href="${href}"${title ? ` title="${title}"` : ''}${external ? ' target="_blank" rel="noreferrer"' : ''}>${text}</a>`;
  };
  return DOMPurify.sanitize(marked.parse(withEmbeds, { gfm: true, breaks: false, renderer }), {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'loading', 'target', 'rel'],
  });
}

function MarkdownContent({ article }) {
  const rootRef = useRef(null);
  const [zoomed, setZoomed] = useState(null);
  const [copied, setCopied] = useState('');
  const html = useMemo(() => renderMarkdown(article.content.replace(/^#\s+.*$/m, '')), [article.content]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.querySelectorAll('pre code').forEach((block, index) => {
      if (!block.dataset.highlighted) {
        block.textContent = block.textContent;
        hljs.highlightElement(block);
      }
      const pre = block.parentElement;
      if (pre.querySelector('.copy-code')) return;
      const button = document.createElement('button');
      button.className = 'copy-code';
      button.type = 'button';
      button.setAttribute('aria-label', 'Copy code');
      button.innerHTML = '<span>copy</span>';
      button.addEventListener('click', async () => {
        await navigator.clipboard.writeText(block.textContent);
        setCopied(String(index));
        button.innerHTML = '<span>copied</span>';
        window.setTimeout(() => { button.innerHTML = '<span>copy</span>'; setCopied(''); }, 1500);
      });
      pre.append(button);
    });
    const onClick = (event) => {
      if (event.target.tagName === 'IMG') setZoomed({ src: event.target.src, alt: event.target.alt });
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [html, copied]);
  return (
    <>
      <div ref={rootRef} className="article-prose" dangerouslySetInnerHTML={{ __html: html }} />
      {zoomed && <button className="image-lightbox" onClick={() => setZoomed(null)} aria-label="Close image preview"><X size={25} /><img src={zoomed.src} alt={zoomed.alt || ''} /></button>}
    </>
  );
}

function getToc(content) {
  const counts = new Map();
  return [...content.matchAll(/^(##|###)\s+(.+)$/gm)].map((match) => {
    const text = match[2].replace(/<[^>]+>|[*_`]/g, '').trim();
    return { level: match[1].length, text, id: uniqueHeadingId(text, counts) };
  }).slice(0, 18);
}

function ArticlePage({ slug }) {
  const article = articles.find((item) => item.slug === slug);
  if (!article) return <NotFound />;
  const currentIndex = articles.indexOf(article);
  const previous = articles[currentIndex - 1];
  const next = articles[currentIndex + 1];
  const toc = getToc(article.content);
  return (
    <main className="article-page">
      <div className="article-hero page-shell">
        <a className="back-link" href="#/"><ArrowLeft size={15} /> All field notes</a>
        <a className="article-category" href={`#/category/${categorySlug(article.category)}`}><span>{CATEGORY_ICONS[article.category]}</span>{article.category}</a>
        <h1>{article.title}</h1>
        <p>{article.excerpt}</p>
        <div className="article-tags">{article.tags.map((tag) => <span key={tag}>#{tag.replace(/\s/g, '-').toLowerCase()}</span>)}</div>
        <img className="article-cover" src={article.cover} alt={`${article.title} cover`} onError={(event) => { event.currentTarget.src = article.generatedCover; }} />
      </div>
      <div className="article-layout page-shell">
        <article><MarkdownContent article={article} /></article>
        {toc.length > 2 && <aside className="toc"><span>ON THIS PAGE</span>{toc.map((item) => <button type="button" className={`toc-${item.level}`} key={item.id} onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{item.text}</button>)}</aside>}
      </div>
      <nav className="article-pagination page-shell" aria-label="Article pagination">
        {previous ? <a href={`#/article/${previous.slug}`}><ArrowLeft size={18} /><span><small>Previous</small>{previous.title}</span></a> : <span />}
        {next ? <a href={`#/article/${next.slug}`}><span><small>Next</small>{next.title}</span><ArrowRight size={18} /></a> : <span />}
      </nav>
    </main>
  );
}

function AboutPage() {
  return <main className="whoami-page"><div className="page-shell"><Hero /></div></main>;
}

function SearchDialog({ open, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (open) { setQuery(''); window.setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  if (!open) return null;
  const results = articles.filter((item) => !query || `${item.title} ${item.category} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  return <div className="dialog-backdrop" onMouseDown={onClose}><div className="search-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search articles">
    <div className="dialog-input"><Search size={20} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the archive…" /><button onClick={onClose}><X size={18} /></button></div>
    <div className="dialog-results">{results.map((article) => <a href={`#/article/${article.slug}`} onClick={onClose} key={article.slug}><span className="result-icon">{CATEGORY_ICONS[article.category]}</span><span><strong>{article.title}</strong><small>{article.category}</small></span><ChevronRight size={17} /></a>)}</div>
    <div className="dialog-hint"><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span><span>{articles.length} indexed articles</span></div>
  </div></div>;
}

function NotFound() {
  return <main className="not-found"><span>404 / SIGNAL LOST</span><h1>That field note doesn’t exist.</h1><a href="#/"><ArrowLeft size={16} /> Return to the archive</a></main>;
}

function Footer() {
  return <footer><div className="page-shell footer-inner"><div><span className="footer-logo">eB.</span><p>Security research and engineering field notes by Yassin.</p></div><div className="footer-links"><a href="#/">Archive</a><a href="#/categories">Categories</a><a href="#/about">Whoami</a><a href="https://github.com/everythingBlackkk">GitHub</a></div><p className="copyright">© {new Date().getFullYear()} everythingBlackkk</p></div></footer>;
}

function FloatingNav() {
  return (
    <nav className="floating-nav" aria-label="Quick links">
      <a href="#/" data-label="Home" aria-label="Home"><House size={20} /></a>
      <a href="https://github.com/everythingBlackkk" data-label="GitHub" aria-label="GitHub" target="_blank" rel="noreferrer"><Code2 size={20} /></a>
      <a href="https://www.linkedin.com/in/everythingblackkk/" data-label="LinkedIn" aria-label="LinkedIn" target="_blank" rel="noreferrer"><ContactRound size={20} /></a>
      <a href={CV_URL} data-label="My CV" aria-label="My CV" target="_blank" rel="noreferrer"><FileUser size={20} /></a>
    </nav>
  );
}

export default function App() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);
  const routeKey = route.join('/');
  useEffect(() => {
    const current = route[0] === 'article' ? articles.find((item) => item.slug === route[1]) : null;
    const currentCategory = route[0] === 'category' ? categoryFromSlug(route[1]) : null;
    document.title = current
      ? `${current.title} — everythingBlackkk`
      : route[0] === 'about'
        ? 'Whoami — everythingBlackkk'
        : route[0] === 'categories'
          ? 'Categories — everythingBlackkk'
          : currentCategory
            ? `${currentCategory} — everythingBlackkk`
        : 'everythingBlackkk — Security Research & Engineering';
  }, [routeKey]);
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  let page = <Home />;
  if (route[0] === 'article') page = <ArticlePage slug={route[1]} />;
  else if (route[0] === 'about') page = <AboutPage />;
  else if (route[0] === 'categories') page = <CategoriesPage />;
  else if (route[0] === 'category') page = <CategoryPage slug={route[1]} />;
  else if (route.length) page = <NotFound />;
  return <><div className="ambient" /><Header openSearch={() => setSearchOpen(true)} />{page}<Footer /><FloatingNav /><SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} /></>;
}
