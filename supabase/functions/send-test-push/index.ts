import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const body = await req.json().catch(() => ({}))
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: subs, error } = await admin.from('push_subscriptions').select('*').eq('user_id', userData.user.id)
    if (error) throw error
    let sent = 0
    const failed = []
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({ title: body.title || 'Property CRM Test', body: body.body || 'Push notification is working.', url: '/?tab=reminders' }))
        sent++
      } catch (e) { failed.push({ endpoint: sub.endpoint, error: String(e) }) }
    }
    return new Response(JSON.stringify({ ok: true, sent, failed }), { headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
