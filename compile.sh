rm -rf index.{,m,c}mjs index.d.{c,m}ts \
&& yarn tsc -p tsconfig.json \
&& mv index.js index.mjs \
&& mv index.d.ts index.d.mts \
&& yarn tsc -p tsconfig.cjs.json \
&& mv index.js index.cjs \
&& mv index.d.ts index.d.cts
