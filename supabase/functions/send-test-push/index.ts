import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' }
  })
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return jsonResponse({ error: 'Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY in Supabase Secrets.' }, 500)
    }

    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.replace('Bearer ', '').trim()

    if (!accessToken) {
      return jsonResponse({ error: 'Missing authorization token. Please logout and login again.' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: userError } = await admin.auth.getUser(accessToken)

    if (userError || !userData.user) {
      return jsonResponse({
        error: 'Unauthorized. Your login token could not be verified. Please logout and login again.',
        detail: userError?.message || null
      }, 401)
    }

    const body = await req.json().catch(() => ({}))

    const { data: subscriptions, error: subError } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userData.user.id)

    if (subError) throw subError

    if (!subscriptions || subscriptions.length === 0) {
      return jsonResponse({ error: 'No push subscription found. Click Enable Push first and allow notifications on this device.' }, 400)
    }

    let sent = 0
    const failed: Array<{ endpoint: string; error: string }> = []

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({
          title: body.title || 'Property CRM Test',
          body: body.body || 'Push notification is working.',
          url: '/?tab=reminders'
        }))
        sent += 1
      } catch (error) {
        failed.push({ endpoint: sub.endpoint, error: String(error) })
      }
    }

    return jsonResponse({ ok: true, sent, failed })
  } catch (error) {
    return jsonResponse({ error: error?.message || String(error) }, 500)
  }
})
