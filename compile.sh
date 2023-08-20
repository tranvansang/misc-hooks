rm -rf index.{,m,c}mjs index.d.ts \
&& yarn tsc -p tsconfig.json \
&& mv index.js index.mjs \
&& yarn tsc -p tsconfig.cjs.json \
&& mv index.js index.cjs
