// tools/bench_vector_search.ts
// Node でもブラウザでも走るように書けるが、まず Node で概算 → 次に offscreen/worker で実測が推奨。

function makeVec(dim: number): Float32Array {
  const v = new Float32Array(dim);
  let sum = 0;
  for (let i = 0; i < dim; i++) {
    const x = Math.random() - 0.5;
    v[i] = x;
    sum += x * x;
  }
  const inv = 1 / Math.sqrt(sum || 1);
  for (let i = 0; i < dim; i++) v[i] *= inv;
  return v;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function topK(query: Float32Array, items: Float32Array[], k: number) {
  const best: { s: number; i: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const s = dot(query, items[i]);
    if (best.length < k) {
      best.push({ s, i });
      if (best.length === k) best.sort((x, y) => x.s - y.s);
    } else if (s > best[0].s) {
      best[0] = { s, i };
      // insertion sort is fine for small k
      best.sort((x, y) => x.s - y.s);
    }
  }
  best.sort((x, y) => y.s - x.s);
  return best;
}

function bench(count: number, dim: number, iters = 20) {
  const items = Array.from({ length: count }, () => makeVec(dim));
  const q = makeVec(dim);

  // warm-up
  topK(q, items, 8);

  const t0 = performance.now();
  for (let i = 0; i < iters; i++) topK(q, items, 8);
  const t1 = performance.now();

  const per = (t1 - t0) / iters;
  return { count, dim, iters, msPerQuery: per };
}

const cases = [
  { count: 500, dim: 384 },
  { count: 2000, dim: 384 },
  { count: 2000, dim: 768 },
  { count: 2000, dim: 1536 },
  { count: 10000, dim: 384 },
];

for (const c of cases) {
  const r = bench(c.count, c.dim);
  console.log(r);
}
