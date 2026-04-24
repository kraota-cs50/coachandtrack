const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify Stripe signature
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log('Signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log('✅ Event verified:', stripeEvent.type);

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const amount = session.amount_total;
    const plan = amount >= 2900 ? 'elite' : 'pro';

    console.log('📧 Email:', email);
    console.log('💰 Amount:', amount);
    console.log('📋 Plan:', plan);

    if (!email) {
      console.log('❌ No email found');
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Initialize Supabase with service key
    const db = createClient(
      'https://zmkhinakvsemoxglbwrf.supabase.co',
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First check if member exists
    const { data: existing, error: findError } = await db
      .from('members')
      .select('id, email, plan')
      .eq('email', email)
      .single();

    console.log('🔍 Found member:', JSON.stringify(existing));
    console.log('🔍 Find error:', JSON.stringify(findError));

    if (!existing) {
      console.log('❌ Member not found for email:', email);
      return { statusCode: 200, body: JSON.stringify({ received: true, warning: 'member not found' }) };
    }

    // Update plan
    const { data: updated, error: updateError } = await db
      .from('members')
      .update({ plan, active: true, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select();

    console.log('✅ Updated:', JSON.stringify(updated));
    console.log('❌ Update error:', JSON.stringify(updateError));
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const sub = stripeEvent.data.object;
    console.log('🚫 Subscription cancelled:', sub.customer);

    const db = createClient(
      'https://zmkhinakvsemoxglbwrf.supabase.co',
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await db
      .from('members')
      .update({ plan: 'free', updated_at: new Date().toISOString() })
      .eq('stripe_customer_id', sub.customer);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
