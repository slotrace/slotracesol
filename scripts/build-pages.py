"""Build the static site from maintained HTML sources and article data."""
from pathlib import Path
import html
import re
import json
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'public'
DOCS = json.loads((ROOT / 'src/docs.json').read_text(encoding='utf-8'))

def doc_url(slug):
    return '/docs/' if slug == 'overview' else f'/docs/{slug}/'

def header(active):
    def link(href, label, key):
        current = ' aria-current="page"' if active == key else ''
        return f'<a href="{href}"{current}>{label}</a>'
    links = ''.join([link('/', 'Overview', 'home'), link('/explorer/', 'Explorer', 'explorer'), link('/token/', '$SLOT', 'token'), link('/docs/', 'Docs', 'docs')])
    socials = '<a href="https://github.com/slotrace/slotracesol" target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens new tab)">GitHub ↗</a><a href="https://x.com/slotrace_tech" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X (opens new tab)">X ↗</a>'
    return f'''<header class="nav wrap site-nav"><a class="brand" href="/" aria-label="SLOTRACE home"><img src="/mark.svg?v=4" width="37" height="32" alt="">SLOTRACE</a><nav class="desktop-nav" aria-label="Main navigation">{links}</nav><div class="header-tools"><button class="contract-badge" type="button" data-token-copy disabled aria-label="Token contract: coming soon"><span>CA:</span><strong data-token-short>soon</strong><i></i></button><div class="social-nav">{socials}</div></div><button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu">Menu <span>+</span></button></header><nav id="mobile-menu" class="mobile-menu wrap" aria-label="Mobile navigation" hidden>{links}<div>{socials}</div></nav>'''

def footer():
    motion = '<button id="motion-toggle" aria-pressed="false">Motion: on</button>'
    return f'''<footer class="wrap site-footer"><div class="footer-brand"><a class="brand" href="/"><img src="/mark.svg?v=4" alt="" width="30" height="28">SLOTRACE</a><p>The flight recorder for Solana.</p></div><nav aria-label="Footer navigation"><a href="/explorer/">Explorer</a><a href="/docs/">Docs</a><a href="/token/">Token</a><a href="https://github.com/slotrace/slotracesol" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://x.com/slotrace_tech" target="_blank" rel="noopener noreferrer">Twitter / X ↗</a></nav>{motion}<div class="footer-meta mono"><span data-token-footer>SOLANA TRANSACTION INTELLIGENCE / $SLOT CONTRACT SOON</span><span>© 2026 SLOTRACE</span></div></footer>'''

def shell(title, desc, body, active, extra_script='', bodyclass=''):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b0d0b"><meta name="description" content="{html.escape(desc, quote=True)}"><title>{html.escape(title)} | SLOTRACE</title><link rel="icon" href="/mark.svg?v=4" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/pages.css"><link rel="stylesheet" href="/token-scene.css"><link rel="stylesheet" href="/explorer.css"><link rel="stylesheet" href="/token-contract.css"><script defer src="/vendor/gsap.min.js"></script><script defer src="/vendor/ScrollTrigger.min.js"></script>{extra_script}<script defer src="/token.js"></script><script defer src="/site.js"></script></head><body class="{bodyclass}"><a class="skip" href="#main">Skip to content</a><div class="read-progress" aria-hidden="true"></div>{header(active)}{body}{footer()}</body></html>'''

def write(path, text):
    target = DIST / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')

# Render maintained sources. No migration-time string replacements.
explorer = (ROOT / 'src/explorer.html').read_text(encoding='utf-8')
home = (ROOT / 'src/home.html').read_text(encoding='utf-8')
home = home.replace('{{HEADER}}',header('home')).replace('{{FOOTER}}',footer()).replace('{{EXPLORER}}',explorer)
write('index.html',home)
explorer_body = '<main id="main"><div class="page-intro wrap"><div class="section-label mono"><span>PRODUCT / EXPLORER</span><span>READ-ONLY SOLANA DATA</span></div><h1 class="page-title">Follow a transaction.<br><span class="yellow">Find its story.</span></h1><p>Inspect confirmed transaction data from Solana by signature.</p><a class="text-link" href="/docs/quickstart/">Read the guide <span>↗</span></a></div>' + explorer + '</main>'
write('explorer/index.html',shell('Explorer','Inspect Solana transaction status, instructions, program logs and accounts.',explorer_body,'explorer','<script defer src="/transaction.js"></script><script defer src="/explorer.js"></script>'))

# Docs: separate URLs, persistent article navigation, full-text search and per-page TOC.
search_index = []
for index, (slug, label, group, title, desc, content) in enumerate(DOCS):
    sidebar = '<span class="sidebar-label mono">FIELD MANUAL / V0.2</span><a class="docs-home-link" href="/docs/">Documentation<span>↗</span></a><label class="search-box"><span aria-hidden="true">⌕</span><input id="docs-search" type="search" placeholder="Search documentation…" aria-label="Search documentation" autocomplete="off"><kbd>/</kbd></label><div id="search-results" class="search-results" aria-live="polite" hidden></div><nav class="doc-nav" aria-label="Documentation">'
    last_group = None
    for s, l, g, *_ in DOCS:
        if g != last_group:
            sidebar += f'<span class="doc-nav-group mono">{g}</span>'
            last_group = g
        current = ' aria-current="page"' if s == slug else ''
        sidebar += f'<a href="{doc_url(s)}"{current}>{l}<span>↗</span></a>'
    sidebar += '</nav><a class="sidebar-cta" href="/explorer/"><span class="mono">LEARN BY DOING</span><strong>Inspect a transaction ↗</strong></a>'
    if slug == 'token':
        content = '<section class="token-contract" data-token-panel hidden aria-label="Official SLOT mint"><span class="eyebrow">$SLOT / OFFICIAL SOLANA MINT</span><code class="token-contract-address" data-token-mint></code><div class="token-contract-links"><button type="button" data-token-copy>Copy mint address</button><a class="text-link" data-token-explorer href="/token/" target="_blank" rel="noopener noreferrer">View on Solana Explorer ↗</a><a class="text-link" data-token-launch href="/token/" target="_blank" rel="noopener noreferrer">View on pump.fun ↗</a></div><p class="token-contract-note">The token mint is published here as the project identifier. Explorer access remains free of token or wallet requirements.</p></section>' + content
    headings = re.findall(r'<section id="([^"]+)"><h2>(.*?)</h2>', content)
    toc = '<span class="mono">ON THIS PAGE</span><nav aria-label="On this page">' + ''.join(f'<a href="#{i}">{t}</a>' for i, t in headings) + '</nav><div class="toc-status"><i></i><span>Project documentation<br>Updated October 26, 2026</span></div>'
    pager = '<nav class="doc-pager" aria-label="Adjacent documentation pages">'
    if index:
        previous = DOCS[index-1]
        pager += f'<a href="{doc_url(previous[0])}"><span class="mono">← PREVIOUS</span><strong>{previous[1]}</strong></a>'
    else:
        pager += '<a href="/"><span class="mono">← PROJECT</span><strong>Back to SLOTRACE</strong></a>'
    if index < len(DOCS)-1:
        following = DOCS[index+1]
        pager += f'<a href="{doc_url(following[0])}"><span class="mono">NEXT →</span><strong>{following[1]}</strong></a>'
    pager += '</nav>'
    body = f'''<main id="main" class="docs-layout wrap"><aside class="docs-sidebar"><button class="docs-menu-toggle" aria-expanded="false" aria-controls="docs-sidebar-content">Documentation menu <span>+</span></button><div id="docs-sidebar-content">{sidebar}</div></aside><article class="doc-article"><div class="doc-breadcrumb mono"><a href="/docs/">DOCS</a><span>/</span><span>{label.upper()}</span></div><div class="doc-hero"><span class="eyebrow yellow">{group} / {index+1:02d}</span><h1>{title}</h1><p>{desc}</p><div class="doc-meta mono"><span>DOCUMENTATION</span><span>~{max(2, len(re.sub('<[^>]+>', '', content).split())//180)} MIN READ</span></div></div><div class="doc-content">{content}</div>{pager}</article><aside class="doc-toc">{toc}</aside></main>'''
    path = 'docs/index.html' if slug == 'overview' else f'docs/{slug}/index.html'
    write(path, shell(f'{label} — Docs', desc, body, 'docs', bodyclass='docs-page'))
    search_index.append({'title':label, 'description':desc, 'url':doc_url(slug), 'text':re.sub(r'<[^>]+>', ' ', content)})

write('docs/search-index.json', json.dumps(search_index, ensure_ascii=False))

token_body = (ROOT / 'src/token.html').read_text(encoding='utf-8')
write('token/index.html', shell('$SLOT — Token utility', 'Read about SLOT utility and development.', token_body, 'token', bodyclass='token-page'))
print(f'Built {len(DOCS)+3} pages.')
