#!/usr/bin/env python3
"""app/sw.js 안의 ASSETS 목록(app/assets 폴더의 모든 그림)을 다시 만들어요.
그림을 추가하거나 지웠다면 배포 전에 한 번 돌려 주세요:  python3 tools/update-sw-assets.py
(sw.js가 바뀌면 새 버전으로 인식되니 CACHE 이름도 함께 올려 주세요.)"""
import os, re, json
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app')
files = sorted(os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
               for d, _, fs in os.walk(os.path.join(root, 'assets')) for f in fs if not f.startswith('.'))
p = os.path.join(root, 'sw.js'); s = open(p, encoding='utf-8').read()
line = 'var ASSETS = ' + json.dumps(files, ensure_ascii=False, separators=(',', ':')) + ';'
if re.search(r'^var ASSETS = .*;$', s, re.M): s = re.sub(r'^var ASSETS = .*;$', lambda m: line, s, flags=re.M)
else: s = re.sub(r'(^var CORE = .*;$)', lambda m: m.group(1) + '\n// 모든 그림 목록 (tools/update-sw-assets.py가 만들어요). 화면을 연 뒤 한가할 때 미리 받아 둬서, 전시장 와이파이가 느려도 그림이 바로 떠요.\n' + line, s, count=1, flags=re.M)
open(p, 'w', encoding='utf-8').write(s)
print(len(files), 'files')
