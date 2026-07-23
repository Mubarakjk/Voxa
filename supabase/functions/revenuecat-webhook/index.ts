// Supabase Edge Function: RevenueCat webhook receiver
// Deploy: supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secret: supabase secrets set REVENUECAT_WEBHOOK_AUTH=your-shared-secret

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-revenuecat-auth',
};

type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  purchased_at_ms?: number;
  store?: string;
  environment?: string;
  transaction_id?: string;
  period_type?: string;
  is_trial_conversion?: boolean;
};

function unauthorized(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function mapStatus(event: RevenueCatEvent): string {
  const statusMap: Record<string, string> = {
    INITIAL_PURCHASE: 'active',
    RENEWAL: 'active',
    CANCELLATION: 'cancelled',
    UNCANCELLATION: 'active',
    EXPIRATION: 'expired',
    BILLING_ISSUE: 'billing_issue',
    PRODUCT_CHANGE: 'active',
    SUBSCRIPTION_PAUSED: 'paused',
    SUBSCRIPTION_EXTENDED: 'active',
    REFUND: 'revoked',
    REVOKE: 'revoked',
    TRANSFER: 'active',
  };

  const mapped = statusMap[event.type] ?? 'unknown';
  if (event.period_type === 'TRIAL' && ['active', 'trialing'].includes(mapped)) {
    return 'trialing';
  }
  return mapped;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expectedAuth) {
    console.error('[RevenueCat webhook] REVENUECAT_WEBHOOK_AUTH not configured');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const providedAuth = req.headers.get('x-revenuecat-auth') ?? req.headers.get('authorization');
  const normalizedProvided = providedAuth?.startsWith('Bearer ')
    ? providedAuth.slice('Bearer '.length)
    : providedAuth;

  if (!normalizedProvided || normalizedProvided !== expectedAuth) {
    return unauthorized('Unauthorized');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = ((body as { event?: RevenueCatEvent }).event ?? body) as RevenueCatEvent;
  if (!event?.id || !event?.app_user_id || !event?.type) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('last_event_id', event.id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ ok: true, duplicate: true, eventId: event.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const status = mapStatus(event);
  const expiration = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const purchaseDate = event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null;

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: event.app_user_id,
      revenuecat_app_user_id: event.app_user_id,
      entitlement_id: event.entitlement_ids?.[0] ?? 'voxa_pro',
      product_id: event.product_id,
      platform: event.store,
      status,
      purchase_date: purchaseDate,
      expiration_date: expiration,
      trial_end: event.period_type === 'TRIAL' ? expiration : null,
      will_renew: !['cancelled', 'expired', 'revoked', 'paused'].includes(status),
      store_environment: event.environment,
      original_transaction_id: event.transaction_id,
      last_event_id: event.id,
      raw_event: body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('[RevenueCat webhook] persistence failed', error.message);
    return new Response(JSON.stringify({ error: 'Persistence failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, eventId: event.id, status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
