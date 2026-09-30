import { hashPassword } from '../src/lib/auth/password';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('admin123');
  console.log('Password hash format:', passwordHash.split('$').length, 'parts ✓');

  // Delete existing admin with this phone if any
  await db.user.deleteMany({ where: { phone: '+918888888888' } }).catch(() => {});

  // Create new admin
  const admin = await db.user.create({
    data: {
      phone: '+918888888888',
      email: 'admin2@demo.com',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('New admin: phone=' + admin.phone + ' password=admin123 ✓');

  // Fix existing admin password
  const existing = await db.user.findUnique({ where: { phone: '+919999999999' } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword('admin123') } });
    console.log('Fixed existing admin (+919999999999) ✓');
  }

  // Fix all customer passwords
  const customers = await db.user.findMany({ where: { role: 'CUSTOMER' } });
  for (const c of customers) {
    await db.user.update({ where: { id: c.id }, data: { passwordHash: await hashPassword('customer123') } });
  }
  console.log('Fixed ' + customers.length + ' customer passwords ✓');

  await db.$disconnect();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
