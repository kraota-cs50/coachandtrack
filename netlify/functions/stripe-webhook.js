const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Handle base64 encoded body (Netlify sometimes does this)
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log('❌ Signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log('✅ Event type:', stripeEvent.type);
  console.log('🔑 Session keys:', Object.keys(stripeEvent.data.object).join(', '));
  console.log('📧 customer_details:', JSON.stringify(stripeEvent.data.object.customer_details));
  console.log('📧 customer_email field:', stripeEvent.data.object.customer_email);
  console.log('💰 amount_total:', stripeEvent.data.object.amount_total);
  console.log('🔑 payment_status:', stripeEvent.data.object.payment_status);

  const db = createClient(
    'https://zmkhinakvsemoxglbwrf.supabase.co',
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const plan = (session.amount_total || 0) >= 2900 ? 'elite' : 'pro';

    console.log('📧 Email:', email);
    console.log('📋 Plan:', plan);
    console.log('💰 Amount:', session.amount_total);

    if (!email) {
      console.log('❌ No email in session');
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const { data, error } = await db
      .from('members')
      .update({ plan, active: true, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select();

    if (error) {
      console.log('❌ Supabase error:', JSON.stringify(error));
    } else {
      console.log('✅ Supabase result:', JSON.stringify(data));
      if (!data || data.length === 0) {
        console.log('⚠️ No member found — creating new member for:', email);
        const { data: newMember, error: insertError } = await db
          .from('members')
          .insert({
            email,
            full_name: stripeEvent.data.object.customer_details?.name || '',
            plan,
            active: true,
            updated_at: new Date().toISOString()
          })
          .select();
        console.log('✅ New member created:', JSON.stringify(newMember));
        console.log('❌ Insert error:', JSON.stringify(insertError));
      }
    }
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const sub = stripeEvent.data.object;
    await db
      .from('members')
      .update({ plan: 'free', updated_at: new Date().toISOString() })
      .eq('stripe_customer_id', sub.customer);
    console.log('🚫 Downgraded customer:', sub.customer);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
