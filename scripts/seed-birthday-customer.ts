// scripts/seed-birthday-customer.ts
// Seed a test customer whose birthday is TODAY — so the admin can verify the feature works.
import { db } from '/home/z/my-project/backend/src/lib/db';
import { scrypt, randomBytes } from 'crypto';

const hashPassword = (password: string): Promise<string> => new Promise((resolve, reject) => {
  const salt = randomBytes(16);
  scrypt(password, salt, 64, (err, derived) => {
    if (err) reject(err);
    else resolve(`scrypt$${salt.toString('hex')}$${derived.toString('hex')}`);
  });
});

async function main() {
  const today = new Date();
  const dob = new Date(Date.UTC(1990, today.getUTCMonth(), today.getUTCDate()));
  const anniv = new Date(Date.UTC(2015, today.getUTCMonth(), today.getUTCDate()));
  const phone = '+919876543210';

  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    console.log('Test birthday customer already exists, updating DOB...');
    await db.customerProfile.update({
      where: { userId: existing.id },
      data: { dateOfBirth: dob, anniversaryDate: anniv },
    });
    console.log('Updated. DOB:', dob.toISOString(), 'Anniversary:', anniv.toISOString());
    return;
  }

  const pass = await hashPassword('test1234');
  const user = await db.user.create({
    data: { phone, passwordHash: pass, role: 'CUSTOMER', isActive: true },
  });
  await db.customerProfile.create({
    data: {
      userId: user.id,
      fullName: 'Birthday Tester',
      dateOfBirth: dob,
      anniversaryDate: anniv,
    },
  });
  console.log(`Created customer: ${phone} / test1234`);
  console.log(`DOB: ${dob.toISOString()} (today!)`);
  console.log(`Anniversary: ${anniv.toISOString()} (today!)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
