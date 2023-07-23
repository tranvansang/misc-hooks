rm -rf index.mjs index.cjs index.d.cts index.d.mts \
&& yarn tsc -p tsconfig.json \
&& mv index.js index.mjs \
&& mv index.d.ts index.d.mts \
&& yarn tsc -p tsconfig.cjs.json \
&& mv index.js index.cjs \
&& mv index.d.ts index.d.cts
