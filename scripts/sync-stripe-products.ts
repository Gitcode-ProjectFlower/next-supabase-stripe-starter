import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const PLANS = [
  {
    name: 'Small',
    description: 'Perfect for small teams and startups',
    metadata: {
      plan_name: 'Small',
      top_k_limit: '100',
    },
    price: 2900, // $29.00
  },
  {
    name: 'Medium',
    description: 'Ideal for growing businesses',
    metadata: {
      plan_name: 'Medium',
      top_k_limit: '500',
    },
    price: 9900, // $99.00
  },
  {
    name: 'Large',
    description: 'For large enterprises',
    metadata: {
      plan_name: 'Large',
      top_k_limit: '5000',
    },
    price: 29900, // $299.00
  },
];

async function syncProducts() {
  console.log('🔄 Starting Stripe product sync...\n');

  for (const plan of PLANS) {
    console.log(`📦 Creating product: ${plan.name}`);

    // 1. Create product in Stripe
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    console.log(`✅ Created Stripe product: ${product.id}`);

    // 2. Create price in Stripe
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    });

    console.log(`✅ Created Stripe price: ${price.id} ($${plan.price / 100}/month)`);

    // 3. Insert product into Supabase
    const { error: productError } = await supabase.from('products').insert({
      id: product.id,
      active: true,
      name: product.name,
      description: product.description,
      image: product.images?.[0] || null,
      metadata: product.metadata,
    });

    if (productError) {
      console.error(`❌ Error inserting product ${plan.name}:`, productError);
      continue;
    }

    console.log(`✅ Inserted product into Supabase`);

    // 4. Insert price into Supabase
    const { error: priceError } = await supabase.from('prices').insert({
      id: price.id,
      product_id: product.id,
      active: true,
      currency: price.currency,
      type: 'recurring',
      unit_amount: price.unit_amount,
      interval: price.recurring?.interval || null,
      interval_count: price.recurring?.interval_count || null,
      trial_period_days: price.recurring?.trial_period_days || null,
    });

    if (priceError) {
      console.error(`❌ Error inserting price for ${plan.name}:`, priceError);
      continue;
    }

    console.log(`✅ Inserted price into Supabase\n`);
  }

  console.log('🎉 Sync complete!');
}

syncProducts().catch(console.error);
