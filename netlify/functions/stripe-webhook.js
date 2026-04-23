const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zmkhinakvsemoxglbwrf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let stripeEvent;

  try {
    // Verify webhook signature if secret is set
    if (STRIPE_WEBHOOK_SECRET) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const sig = event.headers['stripe-signature'];
      stripeEvent = stripe.webhooks.constructEvent(
        event.body, sig, STRIPE_WEBHOOK_SECRET
      );
    } else {
      stripeEvent = JSON.parse(event.body);
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    switch (stripeEvent.type) {

      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const email = session.customer_details?.email;
        const amountTotal = session.amount_total;

        // Determine plan from amount
        // Pro = $14 = 1400 cents, Elite = $29 = 2900 cents
        let plan = 'pro';
        if (amountTotal >= 2900) plan = 'elite';

        console.log(`Payment complete: ${email} → ${plan}`);

        if (email) {
          const { error } = await db
            .from('members')
            .update({ plan, active: true, updated_at: new Date().toISOString() })
            .eq('email', email);

          if (error) {
            console.error('Supabase update error:', error);
          } else {
            console.log(`Updated ${email} to ${plan}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object;
        const customerId = subscription.customer;

        // Downgrade to free when subscription cancelled
        const { error } = await db
          .from('members')
          .update({ plan: 'free', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('Supabase downgrade error:', error);
        else console.log(`Downgraded customer ${customerId} to free`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };

  } catch (err) {
    console.error('Handler error:', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
