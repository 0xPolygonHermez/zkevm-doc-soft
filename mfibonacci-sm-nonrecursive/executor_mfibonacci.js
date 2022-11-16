// executor\_mfibonacci.js
const { FGL } = require("pil-stark");

module.exports.buildConstants = async function (pols) {
  const N = 1024;
  for ( let i=0; i<N; i++) { pols.ISLAST[i] = (i == N-1) ? 1n : 0n; }
}

module.exports.execute = async function (pols, input) {
  const N = 1024;
  pols.a[0] = BigInt(input[0]);
  pols.b[0] = BigInt(input[1]);
  for (let i=1; i < N; i++) {
      pols.a[i] = pols.b[i-1];
      pols.b[i] = FGL.mul(pols.a[i-1], pols.b[i-1]);
  }
  return pols.a[N-1];
}