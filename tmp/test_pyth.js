
async function testEndpoints() {
  const btcId = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
  const endpoints = [
    `v2/updates/price/latest?ids[]=${btcId}`,
    `v2/latest_price_updates?ids[]=${btcId}`,
    `api/v2/updates/price/latest?ids[]=${btcId}`,
    `v1/updates/price/latest?ids[]=${btcId}`,
    `latest_price_updates?ids[]=${btcId}`
  ];
  
  const baseUrl = 'https://hermes.pyth.network';
  
  console.log("Testing Pyth Hermes endpoints...");
  
  for (const ep of endpoints) {
    const url = `${baseUrl}/${ep}`;
    try {
      console.log(`Checking ${url}...`);
      const resp = await fetch(url);
      console.log(`${url} -> ${resp.status} ${resp.statusText}`);
      if (resp.ok) {
        console.log(`SUCCESS! Endpoint working: ${url}`);
        return ep;
      }
    } catch (err) {
      console.log(`${url} -> Error: ${err.message}`);
    }
  }
  return null;
}

testEndpoints().then(successEp => {
  if (successEp) {
    console.log(`Working endpoint found: ${successEp}`);
  } else {
    console.log("No working endpoint found.");
  }
});
