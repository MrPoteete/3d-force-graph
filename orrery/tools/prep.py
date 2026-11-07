# Trim Brain Galaxy's graph.json to what the Orrery prototype needs; redact IPv4 addresses.
import json, re, sys
src, out = sys.argv[1], sys.argv[2]
g = json.load(open(src))
ip = re.compile(r'\b\d{1,3}(?:\.\d{1,3}){3}\b')
red = lambda s: ip.sub('[address]', s or '')
pages = []
for p in g['pages']:
    pages.append({
        'id': p['id'], 't': p['title'], 'c': p['category'], 'd': p['domains'],
        's': red(p['summary']), 'u': p['updated'], 'b': p['bytes'],
        'sys': p['system'], 'r': p['role'], 'f': p['flags'],
        'x': round(p['x'], 1), 'y': round(p['y'], 1), 'z': round(p['z'], 1),
        'src': [[red(s['path']), 0 if s['origin'] == 'raw' else 1] for s in p['sources']],
    })
ids = {p['id'] for p in pages}
links = [[l['source'], l['target']] for l in g['links'] if l['source'] in ids and l['target'] in ids and l['source'] != l['target']]
json.dump({'gen': g['generatedAt'], 'pages': pages, 'links': links}, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(pages), 'pages', len(links), 'links')
