const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/familystore';
const THRESHOLD_MS = Number(process.env.MARKETPLACE_PERF_THRESHOLD_MS || 1500);
const BENCHMARK_MARKETER_EMAIL = String(process.env.BENCHMARK_MARKETER_EMAIL || '').trim().toLowerCase();

function measureMs(start) {
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

async function main() {
  const startConnection = process.hrtime.bigint();
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const connectionMs = measureMs(startConnection);

  const products = mongoose.connection.collection('products');
  const users = mongoose.connection.collection('users');

  let marketplaceQuery = { marketplaceVisible: true };

  if (BENCHMARK_MARKETER_EMAIL) {
    const marketer = await users.findOne(
      { email: BENCHMARK_MARKETER_EMAIL },
      { projection: { _id: 1, mainMerchantId: 1, role: 1, active: 1 } }
    );

    if (!marketer) {
      throw new Error(`No marketer found for ${BENCHMARK_MARKETER_EMAIL}`);
    }

    if (marketer.mainMerchantId) {
      marketplaceQuery = {
        marketplaceVisible: true,
        merchantMainMerchantId: marketer.mainMerchantId,
      };
    }
  }

  const projection = {
    _id: 1,
    merchantId: 1,
    merchantDisplayName: 1,
    name: 1,
    slug: 1,
    description: 1,
    merchantPrice: 1,
    price: 1,
    suggestedCommission: 1,
    images: 1,
    shippingSystemId: 1,
    stock: 1,
    category: 1,
  };

  const checks = [
    {
      name: 'shop_initial',
      query: marketplaceQuery,
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'clothes_initial',
      query: { category: 'Clothes' },
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'shoes_initial',
      query: { category: 'Shoes' },
      sort: { createdAt: -1 },
      limit: 25,
    },
  ];

  const results = [];
  for (const check of checks) {
    const start = process.hrtime.bigint();
    const items = await products.find(check.query, { projection }).sort(check.sort).limit(check.limit).toArray();
    const elapsedMs = measureMs(start);
    results.push({
      ...check,
      count: items.length,
      elapsedMs,
      ok: elapsedMs <= THRESHOLD_MS,
    });
  }

  console.log(JSON.stringify({
    thresholdMs: THRESHOLD_MS,
    connectionMs,
    results: results.map((result) => ({
      name: result.name,
      count: result.count,
      elapsedMs: Number(result.elapsedMs.toFixed(2)),
      ok: result.ok,
    })),
  }, null, 2));

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
