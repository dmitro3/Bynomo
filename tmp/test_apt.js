
async function testApt() {
  const correctId = '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5';
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${correctId}`;
  const resp = await fetch(url);
  console.log(`APT TEST: ${url} -> ${resp.status} ${resp.statusText}`);
  if (resp.ok) {
    const data = await resp.json();
    console.log("Success!");
  }
}
testApt();
