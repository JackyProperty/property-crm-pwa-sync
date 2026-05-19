import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
const cronSecret = Deno.env.get('CRON_SECRET') || ''
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req) => {
  try {
    if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: reminders, error } = await admin.from('reminders').select('*').eq('status','Pending').eq('notification_sent', false).lte('remind_at', new Date().toISOString()).limit(100)
    if (error) throw error
    let sent = 0
    const failed = []
    for (const reminder of reminders || []) {
      const { data: subs, error: subError } = await admin.from('push_subscriptions').select('*').eq('user_id', reminder.user_id)
      if (subError) throw subError
      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify({ title: reminder.title || 'Property CRM Reminder', body: `${reminder.client_name || ''} ${reminder.notes || ''}`.trim() || 'Reminder due.', url: '/?tab=reminders' }))
          sent++
        } catch (e) {
          failed.push({ endpoint: sub.endpoint, error: String(e) })
          if (String(e).includes('410') || String(e).includes('404')) await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
      await admin.from('reminders').update({ notification_sent: true }).eq('id', reminder.id)
    }
    return new Response(JSON.stringify({ ok: true, reminders: reminders?.length || 0, sent, failed }), { headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
