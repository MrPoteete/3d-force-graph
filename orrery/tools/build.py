"""Embed data.json into template.html.

usage: build.py <template.html> <data.json> <out.html> [--standalone]

Without --standalone the output is an artifact body (claude.ai adds the doctype/head/body).
With --standalone it is wrapped as a complete page you can open or serve locally.
"""
import sys

args = [a for a in sys.argv[1:] if not a.startswith('--')]
t = open(args[0]).read()
d = open(args[1]).read().replace('</', '<\\/')
assert t.count('__DATA__') == 1, 'template must contain exactly one __DATA__ placeholder'
page = t.replace('__DATA__', d)
if '--standalone' in sys.argv:
    page = ('<!doctype html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>[hidden]{display:none!important}body{margin:0;font:14px system-ui}</style></head><body>'
            + page + '</body></html>')
open(args[2], 'w').write(page)
