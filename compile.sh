rm -rf index.{,m,c}mjs index.d.ts \
&& npx tsc -p tsconfig.json \
&& mv index.js index.mjs \
&& npx tsc -p tsconfig.cjs.json \
&& mv index.js index.cjs
