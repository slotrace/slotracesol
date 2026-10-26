"""Check that every local page, asset and URL fragment resolves in the static site."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import sys

root = Path(__file__).resolve().parents[1] / 'public'
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.ids = set(); self.links = []; self.duplicates = []; self.feed(path.read_text(encoding='utf-8'))
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids: self.duplicates.append(attrs['id'])
            self.ids.add(attrs['id'])
        for key in ['href', 'src']:
            if key in attrs: self.links.append(attrs[key])

pages = {p.resolve(): Page(p) for p in root.rglob('*.html')}
errors = []
checked = 0
for path, page in pages.items():
    errors.extend(f'{path.name}: duplicate id {id}' for id in page.duplicates)
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        local = unquote(url.path)
        target = ((root / local.lstrip('/')) if local.startswith('/') else path.parent / local).resolve() if local else path
        if target.is_dir(): target = target / 'index.html'
        checked += 1
        if not target.exists(): errors.append(f'{path.relative_to(root)}: missing {link}')
        elif url.fragment and target.suffix == '.html' and unquote(url.fragment) not in pages[target].ids: errors.append(f'{path.relative_to(root)}: missing anchor {link}')
print(f'Checked {len(pages)} HTML pages and {checked} local links/assets.')
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('All local links, assets, anchors and IDs are valid.')
