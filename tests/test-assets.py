from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
getslug=lambda n:re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',re.sub("[.'’]",'',n.lower())))
src=json.loads((root/'asset-sources.json').read_text())
assert len(src['hero_images'])==133
assert len(src['item_images'])==16
for name,urls in src['hero_images'].items():
 assert (root/'assets/heroes'/f'{getslug(name)}.svg').is_file(),name
 assert all(u.startswith('https://') for u in urls),name
for k,urls in src['item_images'].items():
 assert (root/'assets/items'/f'{k}.svg').is_file(),k
 assert all(u.startswith('https://') for u in urls),k
for filename in ['index.html','app.js','logic.js','data.js','sw.js','manifest.webmanifest','icon.svg','favicon.png','icon-180.png','icon-192.png','icon-512.png']:
 assert (root/filename).is_file(),filename
manifest=json.loads((root/'manifest.webmanifest').read_text());assert manifest['name']=='Miya Lab M1'
for icon in manifest['icons']:assert (root/icon['src']).is_file()
html=(root/'index.html').read_text()
for js in re.findall(r'<script src="\.\/([^"]+)"',html):assert (root/js).is_file()
sw=(root/'sw.js').read_text()
assert 'const HERO_SLUGS' in sw and 'const ITEM_IDS' in sw
assert len(re.findall(r'\.\/assets/heroes',sw))==1
print('PASS: 133 hero fallbacks + 16 item fallbacks, icon sizes, manifest, JS and SW resources.')
