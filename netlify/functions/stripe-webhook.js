const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zmkhinakvsemoxglbwrf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let stripeEvent;

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const sig = event.headers['stripe-signature'];
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, sig, STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log('Event received:', stripeEvent.type);
  console.log('Event data:', JSON.stringify(stripeEvent.data.object, null, 2));

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;

      console.log('Full session:', JSON.stringify(session, null, 2));

      // Try multiple ways to get email
      const email = session.customer_details?.email
        || session.customer_email
        || null;

      const amountTotal = session.amount_total;
      let plan = amountTotal >= 2900 ? 'elite' : 'pro';

      console.log(`Email: ${email}, Amount: ${amountTotal}, Plan: ${plan}`);

      if (!email) {
        console.error('No email found in session');
        return { statusCode: 200, body: JSON.stringify({ received: true, warning: 'no email found' }) };
      }

      // Update member plan
      const { data, error } = await db
        .from('members')
        .update({
          plan,
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();

      if (error) {
        console.error('Supabase error:', JSON.stringify(error));
      } else {
        console.log('Updated member:', JSON.stringify(data));
      }

      // If member not found — create one
      if (!data || data.length === 0) {
        console.log('Member not found — may need to create account first');
      }
    }

    if (stripeEvent.type === 'customer.subscription.deleted') {
      const subscription = stripeEvent.data.object;
      const customerId = subscription.customer;
      console.log('Subscription cancelled for customer:', customerId);

      const { error } = await db
        .from('members')
        .update({ plan: 'free', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId);

      if (error) console.error('Downgrade error:', JSON.stringify(error));
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };

  } catch (err) {
    console.error('Handler error:', err.message, err.stack);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
