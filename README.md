# everythingBlackkk Blog

A frontend-only technical blog for Yassin's security research, development notes, and CTF writeups. The site uses a restrained dark design, searchable categories, first-article-image thumbnails, and hash-based routes so it works reliably on GitHub Pages without a server.

## Local development

```bash
npm install
npm run dev
```

Create the production build with:

```bash
npm run build
```

## Content migration

The importer reads the GitBook Markdown index, selected Medium writeups, and curated local-note articles, downloads or copies their media, creates article metadata and covers, maps the archive into six browsing categories, and explicitly excludes the `malware-development` and Active Directory sections.

```bash
npm run import:content
```

Generated content lives in `src/content`, the searchable article index in `src/content-manifest.json`, and localized media in `public/images/articles`.

## GitHub Pages

The included workflow deploys the site whenever the `main` branch is pushed. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
