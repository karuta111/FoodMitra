// scripts/seed-delivery-fee-tiers.ts
import { db } from '/home/z/my-project/backend/src/lib/db';

const DEFAULT_TIERS = [
  { minKm: 0,  maxKm: 1,  fee: 30 },
  { minKm: 1,  maxKm: 2,  fee: 40 },
  { minKm: 2,  maxKm: 3,  fee: 50 },
  { minKm: 3,  maxKm: 5,  fee: 70 },
  { minKm: 5,  maxKm: 10, fee: 100 },
];

async function main() {
  await db.deliveryFeeTier.deleteMany({});
  for (const t of DEFAULT_TIERS) {
    await db.deliveryFeeTier.create({ data: t });
  }
  const all = await db.deliveryFeeTier.findMany({ orderBy: { minKm: 'asc' } });
  console.log('Seeded delivery fee tiers:');
  for (const t of all) {
    console.log(`  ${t.minKm}-${t.maxKm} km → ₹${t.fee}  (id=${t.id})`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
