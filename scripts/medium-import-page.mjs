import fs from 'node:fs/promises'
import { marked } from 'marked'

const source = new URL('../src/content/ctf-mulmusic-lumma-stealer.md', import.meta.url)
const destination = new URL('../public/medium-import-mal-music.html', import.meta.url)
const canonical = 'https://everythingblackkk.github.io/blog/article/ctf-mulmusic-lumma-stealer/'

const markdown = await fs.readFile(source, 'utf8')
const body = marked.parse(markdown).replaceAll(
  'src="./images/manual/mulmusic/',
  'src="https://everythingblackkk.github.io/blog/images/manual/mulmusic/',
)

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mal Music: Reversing a Lumma Stealer-Inspired Challenge</title>
  <meta name="author" content="everythingBlackkk">
  <meta name="description" content="Tracing a Lumma Stealer-inspired challenge through five decoding stages to recover its C2 server.">
  <link rel="canonical" href="${canonical}">
</head>
<body>
  <article>${body}</article>
</body>
</html>
`

await fs.writeFile(destination, html)
console.log(destination.pathname)
