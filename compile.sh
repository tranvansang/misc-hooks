rm -rf {index,atom,disposer}.{,m,c}js {}iindex,atom,disposer.d.ts \
&& npx tsc -p tsconfig.json \
&& mv index.js index.mjs \
&& mv atom.js atom.mjs \
&& mv disposer.js disposer.mjs \
&& npx tsc -p tsconfig.cjs.json \
&& mv index.js index.cjs \
&& mv atom.js atom.cjs \
&& mv disposer.js disposer.cjs
