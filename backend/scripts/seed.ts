// scripts/seed.ts
// Seeds: 1 admin (email + password), 6 restaurants (admin-managed, no owner login),
// 20+ menu items per restaurant, 10 customers (phone + password), 30 orders, reviews, notifications.

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const db = new PrismaClient();

async function hashPassword(plaintext: string): Promise<string> {
  const { scrypt } = await import('crypto');
  const scryptAsync = (password: string | Buffer, salt: Buffer, keylen: number) =>
    new Promise<Buffer>((resolve, reject) =>
      scrypt(password, salt, keylen, (err: Error | null, derived: Buffer) => err ? reject(err) : resolve(derived)),
    );
  const salt = randomBytes(16);
  const hash = await scryptAsync(plaintext, salt, 64);
  return `scrypt$N=16384$r=8$p=1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

const PUNE_LOCATIONS = [
  { name: 'Koregaon Park', lat: 18.5362, lng: 73.8939 },
  { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
  { name: 'Baner', lat: 18.5592, lng: 73.7769 },
  { name: 'Kothrud', lat: 18.5074, lng: 73.8087 },
  { name: 'Hadapsar', lat: 18.5089, lng: 73.9259 },
  { name: 'Aundh', lat: 18.5588, lng: 73.8082 },
  { name: 'Camp', lat: 18.5313, lng: 73.8736 },
];

const CUISINES = [
  { name: 'Italian', items: [
    { cat: 'Pizzas', items: [
      { name: 'Margherita Pizza', price: 199, isVeg: true, prep: 18 },
      { name: 'Farmhouse Pizza', price: 299, isVeg: true, prep: 20 },
      { name: 'Paneer Tikka Pizza', price: 329, isVeg: true, prep: 22 },
      { name: 'Chicken Tikka Pizza', price: 379, isVeg: false, prep: 22 },
      { name: 'Pepperoni Pizza', price: 399, isVeg: false, prep: 22 },
    ]},
    { cat: 'Pasta', items: [
      { name: 'Alfredo Pasta', price: 249, isVeg: true, prep: 15 },
      { name: 'Arrabbiata Pasta', price: 239, isVeg: true, prep: 15 },
      { name: 'Chicken Pasta', price: 289, isVeg: false, prep: 18 },
    ]},
    { cat: 'Garlic Bread', items: [
      { name: 'Garlic Bread', price: 99, isVeg: true, prep: 10 },
      { name: 'Cheesy Garlic Bread', price: 149, isVeg: true, prep: 12 },
    ]},
  ]},
  { name: 'North Indian', items: [
    { cat: 'Mains', items: [
      { name: 'Paneer Butter Masala', price: 249, isVeg: true, prep: 20 },
      { name: 'Dal Makhani', price: 199, isVeg: true, prep: 18 },
      { name: 'Butter Chicken', price: 329, isVeg: false, prep: 25 },
      { name: 'Kadai Paneer', price: 259, isVeg: true, prep: 20 },
      { name: 'Chicken Tikka Masala', price: 349, isVeg: false, prep: 25 },
    ]},
    { cat: 'Breads', items: [
      { name: 'Butter Naan', price: 49, isVeg: true, prep: 8 },
      { name: 'Garlic Naan', price: 69, isVeg: true, prep: 8 },
      { name: 'Tandoori Roti', price: 35, isVeg: true, prep: 6 },
    ]},
    { cat: 'Rice', items: [
      { name: 'Jeera Rice', price: 129, isVeg: true, prep: 10 },
      { name: 'Veg Biryani', price: 199, isVeg: true, prep: 20 },
      { name: 'Chicken Biryani', price: 269, isVeg: false, prep: 25 },
    ]},
  ]},
  { name: 'Chinese', items: [
    { cat: 'Noodles', items: [
      { name: 'Hakka Noodles', price: 179, isVeg: true, prep: 12 },
      { name: 'Schezwan Noodles', price: 199, isVeg: true, prep: 12 },
      { name: 'Chicken Hakka Noodles', price: 229, isVeg: false, prep: 15 },
    ]},
    { cat: 'Mains', items: [
      { name: 'Veg Manchurian', price: 189, isVeg: true, prep: 15 },
      { name: 'Chicken Manchurian', price: 249, isVeg: false, prep: 18 },
      { name: 'Chilli Paneer', price: 219, isVeg: true, prep: 15 },
      { name: 'Chicken Chilli', price: 259, isVeg: false, prep: 18 },
    ]},
    { cat: 'Rice', items: [
      { name: 'Schezwan Fried Rice', price: 199, isVeg: true, prep: 12 },
      { name: 'Chicken Fried Rice', price: 239, isVeg: false, prep: 15 },
    ]},
  ]},
  { name: 'South Indian', items: [
    { cat: 'Dosa', items: [
      { name: 'Masala Dosa', price: 129, isVeg: true, prep: 12 },
      { name: 'Plain Dosa', price: 89, isVeg: true, prep: 8 },
      { name: 'Mysore Masala Dosa', price: 149, isVeg: true, prep: 12 },
      { name: 'Paper Dosa', price: 169, isVeg: true, prep: 15 },
    ]},
    { cat: 'Idli & Vada', items: [
      { name: 'Idli Sambar (3 pc)', price: 79, isVeg: true, prep: 8 },
      { name: 'Medu Vada (2 pc)', price: 69, isVeg: true, prep: 8 },
      { name: 'Sambar Vada', price: 79, isVeg: true, prep: 8 },
    ]},
    { cat: 'Combos', items: [
      { name: 'Mini Tiffin', price: 199, isVeg: true, prep: 15 },
      { name: 'Filter Coffee', price: 39, isVeg: true, prep: 3 },
    ]},
  ]},
  { name: 'Burgers', items: [
    { cat: 'Veg Burgers', items: [
      { name: 'Veg Burger', price: 99, isVeg: true, prep: 8 },
      { name: 'Cheese Veg Burger', price: 129, isVeg: true, prep: 8 },
      { name: 'Paneer Burger', price: 149, isVeg: true, prep: 10 },
    ]},
    { cat: 'Non-Veg Burgers', items: [
      { name: 'Chicken Burger', price: 149, isVeg: false, prep: 10 },
      { name: 'Chicken Cheese Burger', price: 179, isVeg: false, prep: 10 },
    ]},
    { cat: 'Sides', items: [
      { name: 'French Fries', price: 89, isVeg: true, prep: 6 },
      { name: 'Chicken Nuggets (6 pc)', price: 119, isVeg: false, prep: 8 },
    ]},
  ]},
];

async function main() {
  console.log('🌱 Seeding database…');

  // Clean slate
  await db.webhookEvent.deleteMany();
  await db.notification.deleteMany();
  await db.review.deleteMany();
  await db.payment.deleteMany();
  await db.orderStatusHistory.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.menuItem.deleteMany();
  await db.menuCategory.deleteMany();
  await db.restaurantAddress.deleteMany();
  await db.restaurant.deleteMany();
  await db.deliveryAddress.deleteMany();
  await db.customerProfile.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.refreshToken.deleteMany();
  await db.rider.deleteMany();
  await db.user.deleteMany();
  await db.category.deleteMany();
  await db.platformSettings.deleteMany();

  // 1. Platform settings
  await db.platformSettings.create({ data: { key: 'taxRate', value: '0.05' } });
  await db.platformSettings.create({ data: { key: 'defaultDeliveryFee', value: '30' } });
  await db.platformSettings.create({ data: { key: 'minOrderAmount', value: '99' } });
  await db.platformSettings.create({ data: { key: 'defaultDeliveryRadiusKm', value: '5' } });

  // 2. Cuisine categories
  for (const c of CUISINES) {
    const slug = c.name.toLowerCase().replace(/\s+/g, '-');
    await db.category.create({ data: { name: c.name, slug } });
  }

  // 3. Admin (email + password — admin doesn't use phone)
  const adminPass = await hashPassword('admin123');
  const admin = await db.user.create({
    data: { email: 'admin@demo.com', phone: '+919999999999', passwordHash: adminPass, role: 'ADMIN', isActive: true },
  });

  // 4. Restaurants (admin-managed, no owner)
  const RESTAURANT_NAMES = [
    { name: 'Pizza Palace', cuisineIdx: 0 },
    { name: 'Spice Garden', cuisineIdx: 1 },
    { name: 'Dragon Wok', cuisineIdx: 2 },
    { name: 'Dosa Junction', cuisineIdx: 3 },
    { name: 'Burger Bay', cuisineIdx: 4 },
    { name: 'Udupi Krishna', cuisineIdx: 3 },
  ];

  const restaurants = [];
  for (let i = 0; i < RESTAURANT_NAMES.length; i++) {
    const r = RESTAURANT_NAMES[i];
    const cuisine = CUISINES[r.cuisineIdx];
    const loc = PUNE_LOCATIONS[i % PUNE_LOCATIONS.length];
    const status = i < 4 ? 'ACTIVE' : i === 4 ? 'PENDING_APPROVAL' : 'SUSPENDED';
    const availability = status === 'ACTIVE' ? 'OPEN' : 'CLOSED';
    const restaurant = await db.restaurant.create({
      data: {
        name: r.name,
        description: `Authentic ${cuisine.name} cuisine in ${loc.name}.`,
        cuisine: cuisine.name,
        phone: `+9198000000${10 + i}`,
        email: `restaurant${i + 1}@foodmitra.com`,
        openingTime: '09:00',
        closingTime: '23:00',
        minOrderAmount: 99,
        deliveryFee: 30,
        deliveryRadiusKm: 5,
        avgRating: 4 + (i % 2) * 0.3,
        ratingCount: 10 + i * 5,
        status,
        availability,
        latitude: loc.lat + (Math.random() - 0.5) * 0.02,
        longitude: loc.lng + (Math.random() - 0.5) * 0.02,
      },
    });
    await db.restaurantAddress.create({
      data: {
        restaurantId: restaurant.id,
        line1: `${100 + i} ${loc.name} Main Road`,
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      },
    });

    // Menu
    for (let ci = 0; ci < cuisine.items.length; ci++) {
      const catGroup = cuisine.items[ci];
      const cat = await db.menuCategory.create({
        data: { restaurantId: restaurant.id, name: catGroup.cat, displayOrder: ci },
      });
      for (const item of catGroup.items) {
        await db.menuItem.create({
          data: {
            categoryId: cat.id,
            restaurantId: restaurant.id,
            name: item.name,
            description: `Delicious ${item.name.toLowerCase()} from ${r.name}.`,
            price: item.price,
            isVeg: item.isVeg,
            availability: 'AVAILABLE',
            prepTimeMinutes: item.prep,
            displayOrder: 0,
          },
        });
      }
    }

    restaurants.push(restaurant);
  }

  // 5. Customers (phone + password)
  const customers = [];
  for (let i = 0; i < 10; i++) {
    const phone = `+91980000${1000 + i}`;
    const pass = await hashPassword('customer123');
    const user = await db.user.create({
      data: { phone, passwordHash: pass, role: 'CUSTOMER', isActive: true },
    });
    await db.customerProfile.create({
      data: { userId: user.id, fullName: `Customer ${i + 1}`, phone },
    });
    const loc = PUNE_LOCATIONS[i % PUNE_LOCATIONS.length];
    const addr = await db.deliveryAddress.create({
      data: {
        customerId: user.id,
        label: 'HOME',
        line1: `${200 + i} ${loc.name} Street`,
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        latitude: loc.lat + (Math.random() - 0.5) * 0.02,
        longitude: loc.lng + (Math.random() - 0.5) * 0.02,
      },
    });
    await db.customerProfile.update({ where: { userId: user.id }, data: { defaultAddressId: addr.id } });
    customers.push(user);
  }

  // 6. Orders (30 across all states)
  console.log('Creating 30 orders across all states…');
  const STATUSES = ['PENDING_PAYMENT', 'PAID', 'RESTAURANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED'];

  for (let i = 0; i < 30; i++) {
    const restaurant = restaurants[i % restaurants.length];
    if (restaurant.status !== 'ACTIVE') continue;
    const customer = customers[i % customers.length];
    const address = await db.deliveryAddress.findFirst({ where: { customerId: customer.id } });
    if (!address) continue;

    const allItems = await db.menuItem.findMany({ where: { restaurantId: restaurant.id, availability: 'AVAILABLE' } });
    if (allItems.length === 0) continue;
    const numItems = 1 + (i % 3);
    const orderItems = [];
    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const item = allItems[(i + j) % allItems.length];
      const qty = 1 + (j % 2);
      orderItems.push({ item, qty });
      subtotal += item.price * qty;
    }
    subtotal = round2(subtotal);
    const deliveryFee = round2(restaurant.deliveryFee ?? 30);
    const tax = round2(subtotal * 0.05);
    const totalAmount = round2(subtotal + deliveryFee + tax);

    const status = STATUSES[i % STATUSES.length];
    const isPaid = !['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(status);
    const paymentStatus = status === 'PENDING_PAYMENT' ? 'PENDING' : status === 'PAYMENT_FAILED' ? 'FAILED' : status === 'CANCELLED' ? 'REFUNDED' : 'CAPTURED';

    const shortCode = `SEED${(i + 1).toString().padStart(3, '0')}`;
    const order = await db.order.create({
      data: {
        shortCode,
        customerId: customer.id,
        restaurantId: restaurant.id,
        deliveryAddressLine1: address.line1,
        deliveryAddressLine2: address.line2,
        deliveryCity: address.city,
        deliveryLatitude: address.latitude,
        deliveryLongitude: address.longitude,
        deliveryPhone: customer.phone || '',
        subtotal,
        deliveryFee,
        tax,
        discount: 0,
        totalAmount,
        paymentStatus: paymentStatus as any,
        orderStatus: status as any,
        createdAt: new Date(Date.now() - (30 - i) * 3600 * 1000),
        items: {
          create: orderItems.map((oi) => ({
            menuItemId: oi.item.id,
            itemNameSnapshot: oi.item.name,
            itemPriceSnapshot: oi.item.price,
            isVeg: oi.item.isVeg,
            quantity: oi.qty,
            subtotal: round2(oi.item.price * oi.qty),
          })),
        },
      },
    });

    // Status history
    const historyStatuses = ['PENDING_PAYMENT'];
    if (isPaid) historyStatuses.push('PAID');
    if (['RESTAURANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) historyStatuses.push('RESTAURANT_ACCEPTED');
    if (['PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) historyStatuses.push('PREPARING');
    if (['READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) historyStatuses.push('READY_FOR_PICKUP');
    if (['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) historyStatuses.push('PICKED_UP');
    if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) historyStatuses.push('OUT_FOR_DELIVERY');
    if (status === 'DELIVERED') historyStatuses.push('DELIVERED');
    if (status === 'CANCELLED') historyStatuses.push('CANCELLED');
    if (status === 'PAYMENT_FAILED') historyStatuses.push('PAYMENT_FAILED');

    for (let h = 0; h < historyStatuses.length; h++) {
      await db.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: h === 0 ? null : (historyStatuses[h - 1] as any),
          toStatus: historyStatuses[h] as any,
          changedByUserId: h === 0 ? customer.id : admin.id,
          note: h === 0 ? 'Order placed' : h === 1 ? 'Payment captured' : 'Status update',
        },
      });
    }

    // Payment record
    if (isPaid) {
      await db.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: `order_seed_${order.shortCode}_${i}`,
          razorpayPaymentId: `pay_seed_${order.shortCode}_${i}`,
          amount: totalAmount,
          currency: 'INR',
          method: 'RAZORPAY',
          status: paymentStatus as any,
        },
      });
    } else if (status === 'PENDING_PAYMENT') {
      await db.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: `order_seed_pending_${i}`,
          amount: totalAmount,
          currency: 'INR',
          method: 'RAZORPAY',
          status: 'PENDING',
        },
      });
    }

    // Reviews
    if (status === 'DELIVERED' && i % 2 === 0) {
      const existingReview = await db.review.findUnique({ where: { orderId: order.id } }).catch(() => null);
      if (!existingReview) {
        const rating = 3 + (i % 3);
        await db.review.create({
          data: {
            orderId: order.id,
            customerId: customer.id,
            restaurantId: restaurant.id,
            rating,
            comment: rating >= 4 ? `Great food, fast delivery! Would order again.` : `Food was decent but took a while.`,
          },
        });
      }
    }

    // Notifications
    await db.notification.create({
      data: {
        recipientId: customer.id,
        type: 'ORDER_PLACED',
        title: 'Order placed',
        body: `Your order ${order.shortCode} has been placed.`,
        data: JSON.stringify({ orderId: order.id }),
        isRead: i % 3 !== 0,
      },
    });
    if (isPaid) {
      await db.notification.create({
        data: {
          recipientId: admin.id,
          type: 'NEW_ORDER',
          title: 'New order received',
          body: `Order ${order.shortCode} • ₹${totalAmount}`,
          data: JSON.stringify({ orderId: order.id }),
          isRead: false,
        },
      });
    }
  }

  // Notifications for admin (pending restaurant approval)
  for (const r of restaurants.filter((r) => r.status === 'PENDING_APPROVAL')) {
    await db.notification.create({
      data: {
        recipientId: admin.id,
        type: 'NEW_RESTAURANT_REGISTRATION',
        title: 'New restaurant registration',
        body: `${r.name} is awaiting approval.`,
        data: JSON.stringify({ restaurantId: r.id }),
        isRead: false,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('   Demo credentials:');
  console.log('   Admin:     admin@demo.com / admin123 (email-based admin login)');
  console.log('   Customers: +919800001000 through +919800001009 / customer123 (phone-based)');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
