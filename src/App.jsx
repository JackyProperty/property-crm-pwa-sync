import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Home,
  Users,
  Handshake,
  CalendarClock,
  Plus,
  Trash2,
  MessageCircle,
  Download,
  Upload,
  RefreshCw,
  Smartphone,
  MonitorDown,
  LogOut,
  Cloud,
  CloudOff,
  Search,
  ShieldCheck
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const localKey = 'property_crm_local_fallback_v2'

const tables = {
  ownerProperties: 'owner_properties',
  agentListings: 'agent_listings',
  clientRequests: 'client_requests',
  followUps: 'follow_ups'
}

const emptyData = {
  ownerProperties: [],
  agentListings: [],
  clientRequests: [],
  followUps: []
}

const propertyTypes = ['Condo', 'Apartment', 'Terrace', 'Semi-D', 'Bungalow', 'Shoplot', 'Office', 'Factory', 'Land', 'Other']
const listingTypes = ['Sell', 'Rent']
const requestTypes = ['Buy', 'Rent']
const statusOptions = ['Active', 'Pending', 'Sold', 'Rented', 'Inactive']
const requestStatusOptions = ['New', 'Contacted', 'Viewing', 'Negotiating', 'Closed', 'Lost']
const followUpTypes = ['Call', 'WhatsApp', 'Viewing', 'Offer', 'Negotiation', 'Document', 'Other']

function uid(prefix) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`
}

function money(value) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function num(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function cleanPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('60')) return digits
  if (digits.startsWith('0')) return `6${digits}`
  return digits
}

function whatsappUrl(phone, message) {
  const cleaned = cleanPhone(phone)
  if (!cleaned) return '#'
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}

function areaMatch(propertyArea, requestArea) {
  const property = String(propertyArea || '').toLowerCase()
  const areas = String(requestArea || '')
    .toLowerCase()
    .split(/[,.\/|]/)
    .map((x) => x.trim())
    .filter(Boolean)
  return areas.some((area) => property.includes(area) || area.includes(property))
}

function scoreMatch(listing, request) {
  let score = 0
  const reasons = []

  const typeOk =
    (listing.listing_type === 'Sell' && request.request_type === 'Buy') ||
    (listing.listing_type === 'Rent' && request.request_type === 'Rent')
  if (typeOk) {
    score += 20
    reasons.push('交易类型符合')
  }

  if (listing.property_type === request.property_type) {
    score += 18
    reasons.push('产业类型符合')
  }

  if (areaMatch(listing.area, request.preferred_area)) {
    score += 20
    reasons.push('地区符合')
  }

  const price = num(listing.price)
  const minBudget = num(request.min_budget)
  const maxBudget = num(request.max_budget)
  if (maxBudget && price <= maxBudget && (!minBudget || price >= minBudget * 0.75)) {
    score += 22
    reasons.push('预算符合')
  } else if (maxBudget && price <= maxBudget * 1.1) {
    score += 10
    reasons.push('价格接近预算')
  }

  if (num(listing.bedrooms) >= num(request.min_bedrooms)) {
    score += 8
    reasons.push('房间数符合')
  }

  if (num(listing.bathrooms) >= num(request.min_bathrooms)) {
    score += 6
    reasons.push('厕所数符合')
  }

  if (num(listing.built_up) >= num(request.min_built_up)) {
    score += 6
    reasons.push('面积符合')
  }

  return {
    score: Math.min(score, 100),
    reasons: reasons.length ? reasons : ['资料不足，建议手动检查']
  }
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>
}

function Badge({ children, tone = 'slate' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Input(props) {
  return <input className="input" {...props} />
}

function Select({ children, ...props }) {
  return (
    <select className="input" {...props}>
      {children}
    </select>
  )
}

function Textarea(props) {
  return <textarea className="textarea" {...props} />
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })

      if (error) {
        setMessage(error.message)
      } else if (mode === 'signup') {
        setMessage('Account created. If email confirmation is enabled, please confirm your email first. You can now try logging in.')
        setMode('login')
      }
    } catch (error) {
      setMessage(error?.message || 'Something went wrong. Please check your Supabase settings and internet connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="brand center">
          <div className="brand-icon">
            <Building2 size={28} />
          </div>
          <div>
            <h1>Property Wanted CRM</h1>
            <p>Cloud sync version</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create Account</button>
        </div>

        <form onSubmit={submit} className="stack">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </Field>
          <Field label="Password">
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" />
          </Field>
          <Button disabled={busy} className="full">
            {busy ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
          {message && <p className="notice">{message}</p>}
        </form>
      </Card>
    </div>
  )
}

function Header({ active, setActive, session, syncMode, onRefresh }) {
  const tabs = [
    ['dashboard', 'Dashboard', Home],
    ['owners', 'Owner Listings', Building2],
    ['agents', 'Other Agent Listings', Users],
    ['requests', 'Buyer Requests', Search],
    ['matches', 'Buyer Matching', Handshake],
    ['followups', 'Follow Up', CalendarClock],
    ['install', 'Install', Smartphone]
  ]

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-icon">
            <Building2 size={26} />
          </div>
          <div>
            <h1>Property Wanted CRM</h1>
            <p>Owner + Other Agent Listing + Buyer Matching</p>
          </div>
        </div>

        <div className="top-actions">
          <Badge tone={syncMode === 'cloud' ? 'green' : 'amber'}>
            {syncMode === 'cloud' ? <Cloud size={13} /> : <CloudOff size={13} />}
            {syncMode === 'cloud' ? 'Cloud Sync On' : 'Local Demo Mode'}
          </Badge>
          <Button variant="secondary" onClick={onRefresh}>
            <RefreshCw size={16} /> Refresh
          </Button>
          {session && (
            <Button variant="danger" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} /> Logout
            </Button>
          )}
        </div>
      </div>

      <nav className="tabs">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}

function useCrmData(session) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(localKey)
    return saved ? JSON.parse(saved) : emptyData
  })
  const [loading, setLoading] = useState(false)
  const syncMode = isSupabaseConfigured && session ? 'cloud' : 'local'

  useEffect(() => {
    if (syncMode === 'local') {
      localStorage.setItem(localKey, JSON.stringify(data))
    }
  }, [data, syncMode])

  async function fetchAll() {
    if (syncMode !== 'cloud') return
    setLoading(true)
    const results = await Promise.all(
      Object.entries(tables).map(async ([key, table]) => {
        const { data: rows, error } = await supabase.from(table).select('*').order('created_at', { ascending: false })
        if (error) throw error
        return [key, rows || []]
      })
    )
    setData(Object.fromEntries(results))
    setLoading(false)
  }

  useEffect(() => {
    fetchAll().catch((error) => {
      setLoading(false)
      alert(error.message)
    })
  }, [syncMode])

  useEffect(() => {
    if (syncMode !== 'cloud') return
    const channel = supabase
      .channel('property-crm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_properties' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_listings' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_requests' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [syncMode])

  async function add(kind, row) {
    if (syncMode === 'cloud') {
      const { error } = await supabase.from(tables[kind]).insert({ ...row, user_id: session.user.id })
      if (error) throw error
      await fetchAll()
    } else {
      setData((prev) => ({ ...prev, [kind]: [{ ...row, id: uid('LOCAL'), created_at: new Date().toISOString() }, ...prev[kind]] }))
    }
  }

  async function remove(kind, id) {
    if (syncMode === 'cloud') {
      const { error } = await supabase.from(tables[kind]).delete().eq('id', id)
      if (error) throw error
      await fetchAll()
    } else {
      setData((prev) => ({ ...prev, [kind]: prev[kind].filter((x) => x.id !== id) }))
    }
  }

  function exportLocal() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'property-crm-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importLocal(file) {
    const text = await file.text()
    const parsed = JSON.parse(text)
    setData({ ...emptyData, ...parsed })
  }

  return { data, loading, syncMode, fetchAll, add, remove, exportLocal, importLocal }
}

function Dashboard({ data, matches, loading }) {
  const stats = [
    ['Owner Listings', data.ownerProperties.filter((x) => x.status === 'Active').length, Building2],
    ['Other Agent Listings', data.agentListings.filter((x) => x.status === 'Active').length, Users],
    ['Buyer Requests', data.clientRequests.filter((x) => !['Closed', 'Lost'].includes(x.status)).length, Search],
    ['Strong Matches', matches.filter((x) => x.score >= 75).length, Handshake],
    ['Follow Ups', data.followUps.filter((x) => x.status !== 'Done').length, CalendarClock]
  ]

  return (
    <div className="stack">
      {loading && <Card><p>Syncing cloud database...</p></Card>}
      <div className="stats">
        {stats.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="stat-row">
              <div>
                <p>{label}</p>
                <h2>{value}</h2>
              </div>
              <div className="stat-icon"><Icon size={24} /></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid two">
        <Card>
          <h2>Top Matches</h2>
          <div className="list">
            {matches.slice(0, 6).map((m) => (
              <div className="item" key={`${m.listing.source}-${m.listing.id}-${m.request.id}`}>
                <div>
                  <strong>{m.request.client_name}</strong>
                  <p>{m.listing.title}</p>
                  <small>{m.listing.source_label} · {m.reasons.join(' · ')}</small>
                </div>
                <Badge tone={m.score >= 80 ? 'green' : m.score >= 60 ? 'amber' : 'slate'}>{m.score}%</Badge>
              </div>
            ))}
            {!matches.length && <p className="muted">No matches yet.</p>}
          </div>
        </Card>

        <Card>
          <h2>Pending Follow Ups</h2>
          <div className="list">
            {data.followUps.slice(0, 6).map((f) => (
              <div className="item" key={f.id}>
                <div>
                  <strong>{f.client_name}</strong>
                  <p>{f.type} · {f.property_title || 'No property selected'}</p>
                  <small>{f.follow_up_date}</small>
                </div>
                <Badge tone={f.status === 'Done' ? 'green' : 'amber'}>{f.status}</Badge>
              </div>
            ))}
            {!data.followUps.length && <p className="muted">No follow up records yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

function OwnerForm({ onAdd }) {
  const [form, setForm] = useState({
    owner_name: '',
    owner_phone: '',
    owner_whatsapp: '',
    title: '',
    listing_type: 'Sell',
    property_type: 'Terrace',
    area: '',
    city: 'Ipoh',
    state: 'Perak',
    price: '',
    min_price: '',
    bedrooms: 3,
    bathrooms: 2,
    built_up: '',
    land_size: '',
    furnishing: '',
    tenure: 'Freehold',
    status: 'Active',
    notes: ''
  })
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    await onAdd({
      ...form,
      price: num(form.price),
      min_price: num(form.min_price),
      bedrooms: num(form.bedrooms),
      bathrooms: num(form.bathrooms),
      built_up: num(form.built_up),
      land_size: num(form.land_size)
    })
    setForm((p) => ({ ...p, owner_name: '', owner_phone: '', owner_whatsapp: '', title: '', area: '', price: '', min_price: '', built_up: '', land_size: '', notes: '' }))
  }

  return (
    <Card>
      <h2>新增 Owner Listing</h2>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Owner Name"><Input required value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} /></Field>
        <Field label="Owner Phone"><Input value={form.owner_phone} onChange={(e) => update('owner_phone', e.target.value)} /></Field>
        <Field label="Owner WhatsApp"><Input value={form.owner_whatsapp} onChange={(e) => update('owner_whatsapp', e.target.value)} /></Field>
        <Field label="Title"><Input required value={form.title} onChange={(e) => update('title', e.target.value)} /></Field>
        <Field label="Listing Type"><Select value={form.listing_type} onChange={(e) => update('listing_type', e.target.value)}>{listingTypes.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Property Type"><Select value={form.property_type} onChange={(e) => update('property_type', e.target.value)}>{propertyTypes.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Area"><Input required value={form.area} onChange={(e) => update('area', e.target.value)} /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => update('city', e.target.value)} /></Field>
        <Field label="State"><Input value={form.state} onChange={(e) => update('state', e.target.value)} /></Field>
        <Field label="Price / Rental"><Input required type="number" value={form.price} onChange={(e) => update('price', e.target.value)} /></Field>
        <Field label="Lowest Price"><Input type="number" value={form.min_price} onChange={(e) => update('min_price', e.target.value)} /></Field>
        <Field label="Bedrooms"><Input type="number" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} /></Field>
        <Field label="Bathrooms"><Input type="number" value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} /></Field>
        <Field label="Built Up"><Input type="number" value={form.built_up} onChange={(e) => update('built_up', e.target.value)} /></Field>
        <Field label="Land Size"><Input type="number" value={form.land_size} onChange={(e) => update('land_size', e.target.value)} /></Field>
        <Field label="Furnishing"><Input value={form.furnishing} onChange={(e) => update('furnishing', e.target.value)} /></Field>
        <Field label="Tenure"><Input value={form.tenure} onChange={(e) => update('tenure', e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => update('status', e.target.value)}>{statusOptions.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <div className="wide"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field></div>
        <Button><Plus size={16} /> Save Owner Listing</Button>
      </form>
    </Card>
  )
}

function AgentForm({ onAdd }) {
  const [form, setForm] = useState({
    agent_name: '',
    agent_phone: '',
    agent_whatsapp: '',
    agency: '',
    title: '',
    listing_type: 'Sell',
    property_type: 'Terrace',
    area: '',
    city: 'Ipoh',
    state: 'Perak',
    price: '',
    min_price: '',
    bedrooms: 3,
    bathrooms: 2,
    built_up: '',
    land_size: '',
    furnishing: '',
    tenure: 'Freehold',
    commission_sharing: '50/50',
    status: 'Active',
    notes: ''
  })
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    await onAdd({
      ...form,
      price: num(form.price),
      min_price: num(form.min_price),
      bedrooms: num(form.bedrooms),
      bathrooms: num(form.bathrooms),
      built_up: num(form.built_up),
      land_size: num(form.land_size)
    })
    setForm((p) => ({ ...p, agent_name: '', agent_phone: '', agent_whatsapp: '', agency: '', title: '', area: '', price: '', min_price: '', built_up: '', land_size: '', notes: '' }))
  }

  return (
    <Card>
      <h2>新增 Other Agent Listing</h2>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Agent Name"><Input required value={form.agent_name} onChange={(e) => update('agent_name', e.target.value)} /></Field>
        <Field label="Agent Phone"><Input value={form.agent_phone} onChange={(e) => update('agent_phone', e.target.value)} /></Field>
        <Field label="Agent WhatsApp"><Input value={form.agent_whatsapp} onChange={(e) => update('agent_whatsapp', e.target.value)} /></Field>
        <Field label="Agency"><Input value={form.agency} onChange={(e) => update('agency', e.target.value)} /></Field>
        <Field label="Title"><Input required value={form.title} onChange={(e) => update('title', e.target.value)} /></Field>
        <Field label="Listing Type"><Select value={form.listing_type} onChange={(e) => update('listing_type', e.target.value)}>{listingTypes.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Property Type"><Select value={form.property_type} onChange={(e) => update('property_type', e.target.value)}>{propertyTypes.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Area"><Input required value={form.area} onChange={(e) => update('area', e.target.value)} /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => update('city', e.target.value)} /></Field>
        <Field label="State"><Input value={form.state} onChange={(e) => update('state', e.target.value)} /></Field>
        <Field label="Price / Rental"><Input required type="number" value={form.price} onChange={(e) => update('price', e.target.value)} /></Field>
        <Field label="Lowest / Nett Price"><Input type="number" value={form.min_price} onChange={(e) => update('min_price', e.target.value)} /></Field>
        <Field label="Bedrooms"><Input type="number" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} /></Field>
        <Field label="Bathrooms"><Input type="number" value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} /></Field>
        <Field label="Built Up"><Input type="number" value={form.built_up} onChange={(e) => update('built_up', e.target.value)} /></Field>
        <Field label="Land Size"><Input type="number" value={form.land_size} onChange={(e) => update('land_size', e.target.value)} /></Field>
        <Field label="Commission Sharing"><Input value={form.commission_sharing} onChange={(e) => update('commission_sharing', e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => update('status', e.target.value)}>{statusOptions.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <div className="wide"><Field label="Co-Agent Notes"><Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field></div>
        <Button><Plus size={16} /> Save Agent Listing</Button>
      </form>
    </Card>
  )
}

function RequestForm({ onAdd }) {
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    client_whatsapp: '',
    request_type: 'Buy',
    property_type: 'Terrace',
    preferred_area: '',
    city: 'Ipoh',
    state: 'Perak',
    min_budget: '',
    max_budget: '',
    min_bedrooms: 3,
    min_bathrooms: 2,
    min_built_up: '',
    purpose: 'Own Stay',
    financing: 'Loan Needed',
    urgency: 'Within 1 Month',
    status: 'New',
    notes: ''
  })
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    await onAdd({
      ...form,
      min_budget: num(form.min_budget),
      max_budget: num(form.max_budget),
      min_bedrooms: num(form.min_bedrooms),
      min_bathrooms: num(form.min_bathrooms),
      min_built_up: num(form.min_built_up)
    })
    setForm((p) => ({ ...p, client_name: '', client_phone: '', client_whatsapp: '', preferred_area: '', min_budget: '', max_budget: '', min_built_up: '', notes: '' }))
  }

  return (
    <Card>
      <h2>新增 Buyer / Client Request</h2>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Client Name"><Input required value={form.client_name} onChange={(e) => update('client_name', e.target.value)} /></Field>
        <Field label="Client Phone"><Input value={form.client_phone} onChange={(e) => update('client_phone', e.target.value)} /></Field>
        <Field label="Client WhatsApp"><Input value={form.client_whatsapp} onChange={(e) => update('client_whatsapp', e.target.value)} /></Field>
        <Field label="Request Type"><Select value={form.request_type} onChange={(e) => update('request_type', e.target.value)}>{requestTypes.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Property Type"><Select value={form.property_type} onChange={(e) => update('property_type', e.target.value)}>{propertyTypes.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Preferred Area"><Input required value={form.preferred_area} onChange={(e) => update('preferred_area', e.target.value)} placeholder="Ipoh Garden, Tambun" /></Field>
        <Field label="Min Budget"><Input type="number" value={form.min_budget} onChange={(e) => update('min_budget', e.target.value)} /></Field>
        <Field label="Max Budget"><Input required type="number" value={form.max_budget} onChange={(e) => update('max_budget', e.target.value)} /></Field>
        <Field label="Min Bedrooms"><Input type="number" value={form.min_bedrooms} onChange={(e) => update('min_bedrooms', e.target.value)} /></Field>
        <Field label="Min Bathrooms"><Input type="number" value={form.min_bathrooms} onChange={(e) => update('min_bathrooms', e.target.value)} /></Field>
        <Field label="Min Built Up"><Input type="number" value={form.min_built_up} onChange={(e) => update('min_built_up', e.target.value)} /></Field>
        <Field label="Purpose"><Input value={form.purpose} onChange={(e) => update('purpose', e.target.value)} /></Field>
        <Field label="Financing"><Input value={form.financing} onChange={(e) => update('financing', e.target.value)} /></Field>
        <Field label="Urgency"><Input value={form.urgency} onChange={(e) => update('urgency', e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => update('status', e.target.value)}>{requestStatusOptions.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <div className="wide"><Field label="Special Requirements"><Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field></div>
        <Button><Plus size={16} /> Save Request</Button>
      </form>
    </Card>
  )
}

function FollowForm({ data, onAdd }) {
  const [form, setForm] = useState({
    client_name: '',
    property_title: '',
    type: 'Call',
    follow_up_date: new Date().toISOString().slice(0, 10),
    status: 'Pending',
    notes: ''
  })
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    await onAdd(form)
    setForm((p) => ({ ...p, notes: '', status: 'Pending' }))
  }

  const listingTitles = [
    ...data.ownerProperties.map((x) => x.title),
    ...data.agentListings.map((x) => x.title)
  ]

  return (
    <Card>
      <h2>新增 Follow Up</h2>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Client"><Select required value={form.client_name} onChange={(e) => update('client_name', e.target.value)}><option value="">Select Client</option>{data.clientRequests.map((x) => <option key={x.id}>{x.client_name}</option>)}</Select></Field>
        <Field label="Property"><Select value={form.property_title} onChange={(e) => update('property_title', e.target.value)}><option value="">No property</option>{listingTitles.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Type"><Select value={form.type} onChange={(e) => update('type', e.target.value)}>{followUpTypes.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" value={form.follow_up_date} onChange={(e) => update('follow_up_date', e.target.value)} /></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => update('status', e.target.value)}><option>Pending</option><option>Done</option><option>Cancelled</option></Select></Field>
        <div className="wide"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field></div>
        <Button><Plus size={16} /> Save Follow Up</Button>
      </form>
    </Card>
  )
}

function ListingCards({ rows, type, onDelete }) {
  const [query, setQuery] = useState('')
  const filtered = rows.filter((x) => JSON.stringify(x).toLowerCase().includes(query.toLowerCase()))

  return (
    <Card>
      <div className="section-head">
        <h2>{type === 'owner' ? 'Owner Listing Database' : 'Other Agent Listing Details'}</h2>
        <div className="searchbox"><Search size={16} /><Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>
      <div className="cards">
        {filtered.map((x) => {
          const contactName = type === 'owner' ? x.owner_name : x.agent_name
          const contactPhone = type === 'owner' ? x.owner_phone : x.agent_phone
          const whatsapp = type === 'owner' ? x.owner_whatsapp || x.owner_phone : x.agent_whatsapp || x.agent_phone
          return (
            <div className="record" key={x.id}>
              <div className="record-head">
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.property_type} · {x.area}, {x.city || 'Ipoh'}</p>
                </div>
                <div className="badges">
                  <Badge tone={type === 'owner' ? 'blue' : 'purple'}>{type === 'owner' ? 'Owner' : 'Other Agent'}</Badge>
                  <Badge tone="green">{x.status}</Badge>
                </div>
              </div>
              <div className="mini-grid">
                <span><b>{money(x.price)}</b><small>Price</small></span>
                <span><b>{x.bedrooms}R/{x.bathrooms}B</b><small>Rooms</small></span>
                <span><b>{x.built_up || '-'} sqft</b><small>Built up</small></span>
              </div>
              <p className="muted">{contactName} · {contactPhone}</p>
              {type === 'agent' && <p className="muted">Agency: {x.agency || '-'} · Co-broke: {x.commission_sharing || '-'}</p>}
              <p className="notes">{x.notes || '-'}</p>
              <div className="row">
                <a href={whatsappUrl(whatsapp, type === 'owner' ? `Hi ${contactName}, I am following up about ${x.title}.` : `Hi ${contactName}, is your co-agent listing ${x.title} still available?`)} target="_blank" rel="noreferrer">
                  <Button variant="success"><MessageCircle size={16} /> WhatsApp</Button>
                </a>
                <Button variant="danger" onClick={() => onDelete(x.id)}><Trash2 size={16} /> Delete</Button>
              </div>
            </div>
          )
        })}
      </div>
      {!filtered.length && <p className="muted">No records found.</p>}
    </Card>
  )
}

function RequestCards({ rows, onDelete }) {
  const [query, setQuery] = useState('')
  const filtered = rows.filter((x) => JSON.stringify(x).toLowerCase().includes(query.toLowerCase()))

  return (
    <Card>
      <div className="section-head">
        <h2>Buyer / Client Request Database</h2>
        <div className="searchbox"><Search size={16} /><Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>
      <div className="cards">
        {filtered.map((x) => (
          <div className="record" key={x.id}>
            <div className="record-head">
              <div>
                <h3>{x.client_name}</h3>
                <p>{x.request_type} {x.property_type} · {x.preferred_area}</p>
              </div>
              <Badge tone={x.status === 'New' ? 'amber' : 'slate'}>{x.status}</Badge>
            </div>
            <div className="mini-grid">
              <span><b>{money(x.min_budget)} - {money(x.max_budget)}</b><small>Budget</small></span>
              <span><b>{x.min_bedrooms}R/{x.min_bathrooms}B</b><small>Minimum</small></span>
              <span><b>{x.urgency}</b><small>Urgency</small></span>
            </div>
            <p className="muted">Financing: {x.financing}</p>
            <p className="notes">{x.notes || '-'}</p>
            <div className="row">
              <a href={whatsappUrl(x.client_whatsapp || x.client_phone, `Hi ${x.client_name}, I have some property options that may match your request.`)} target="_blank" rel="noreferrer">
                <Button variant="success"><MessageCircle size={16} /> WhatsApp Client</Button>
              </a>
              <Button variant="danger" onClick={() => onDelete(x.id)}><Trash2 size={16} /> Delete</Button>
            </div>
          </div>
        ))}
      </div>
      {!filtered.length && <p className="muted">No client requests found.</p>}
    </Card>
  )
}

function Matches({ matches, addFollowUp }) {
  const [minScore, setMinScore] = useState(50)
  const visible = matches.filter((x) => x.score >= minScore)

  return (
    <div className="stack">
      <Card>
        <div className="section-head">
          <div>
            <h2>Buyer Matching</h2>
            <p className="muted">Owner listings 和 Other Agent listings 都会自动匹配 buyer request。</p>
          </div>
          <Field label="Minimum Score">
            <Input type="number" value={minScore} onChange={(e) => setMinScore(num(e.target.value))} />
          </Field>
        </div>
      </Card>
      <div className="cards">
        {visible.map((m) => (
          <Card key={`${m.listing.source}-${m.listing.id}-${m.request.id}`}>
            <div className="record-head">
              <div>
                <h3>{m.score}% Match</h3>
                <p>{m.reasons.join(' · ')}</p>
              </div>
              <Badge tone={m.listing.source === 'agent' ? 'purple' : 'blue'}>{m.listing.source_label}</Badge>
            </div>
            <div className="grid two compact">
              <div className="panel">
                <strong>Client</strong>
                <p>{m.request.client_name}</p>
                <small>{m.request.request_type} {m.request.property_type} · {m.request.preferred_area}</small>
                <small>Budget: {money(m.request.min_budget)} - {money(m.request.max_budget)}</small>
              </div>
              <div className="panel">
                <strong>Listing</strong>
                <p>{m.listing.title}</p>
                <small>{m.listing.property_type} · {m.listing.area}</small>
                <small>Price: {money(m.listing.price)}</small>
              </div>
            </div>
            <div className="row">
              <a href={whatsappUrl(m.request.client_whatsapp || m.request.client_phone, `Hi ${m.request.client_name}, I found a property that may match your request: ${m.listing.title}, ${m.listing.area}, asking ${money(m.listing.price)}.`)} target="_blank" rel="noreferrer">
                <Button variant="success"><MessageCircle size={16} /> WhatsApp Client</Button>
              </a>
              <Button variant="secondary" onClick={() => addFollowUp(m)}><CalendarClock size={16} /> Add Follow Up</Button>
            </div>
          </Card>
        ))}
      </div>
      {!visible.length && <Card><p className="muted">No matching results. Try lowering the score or adding more listings/requests.</p></Card>}
    </div>
  )
}

function FollowUps({ rows, onDelete }) {
  return (
    <Card>
      <h2>Follow Up List</h2>
      <div className="list">
        {rows.map((x) => (
          <div className="item" key={x.id}>
            <div>
              <strong>{x.client_name}</strong>
              <p>{x.type} · {x.property_title || 'No property selected'}</p>
              <small>{x.follow_up_date} · {x.notes || '-'}</small>
            </div>
            <div className="row">
              <Badge tone={x.status === 'Done' ? 'green' : 'amber'}>{x.status}</Badge>
              <Button variant="danger" onClick={() => onDelete(x.id)}><Trash2 size={16} /></Button>
            </div>
          </div>
        ))}
      </div>
      {!rows.length && <p className="muted">No follow ups yet.</p>}
    </Card>
  )
}

function InstallPage({ syncMode, exportLocal, importLocal }) {
  return (
    <div className="stack">
      <Card>
        <div className="brand">
          <Smartphone size={28} />
          <div>
            <h2>安装到手机和电脑</h2>
            <p className="muted">部署到 HTTPS 网址后，这个 App 可以像普通 App 一样安装。</p>
          </div>
        </div>
      </Card>

      <div className="grid two">
        <Card>
          <h2><Smartphone size={20} /> 手机安装</h2>
          <ol>
            <li>用 Chrome / Safari 打开你的 App 网址。</li>
            <li>Android：按浏览器菜单，然后选择 Install App / Add to Home Screen。</li>
            <li>iPhone：按 Share，然后选择 Add to Home Screen。</li>
          </ol>
        </Card>
        <Card>
          <h2><MonitorDown size={20} /> 电脑安装</h2>
          <ol>
            <li>用 Chrome 或 Microsoft Edge 打开你的 App 网址。</li>
            <li>地址栏右边会出现 Install 图标。</li>
            <li>点击 Install，就会像电脑软件一样打开。</li>
          </ol>
        </Card>
      </div>

      <Card>
        <h2><ShieldCheck size={20} /> 同步状态</h2>
        <p>
          当前状态：
          <Badge tone={syncMode === 'cloud' ? 'green' : 'amber'}>
            {syncMode === 'cloud' ? 'Cloud Sync On' : 'Local Demo Mode'}
          </Badge>
        </p>
        <p className="muted">
          要手机和电脑同步，必须设置 Supabase URL 和 anon key，并执行项目里的 supabase/schema.sql。
        </p>
      </Card>

      <Card>
        <h2>Backup / Import</h2>
        <div className="row">
          <Button variant="secondary" onClick={exportLocal}><Download size={16} /> Export Data</Button>
          <label className="btn btn-secondary">
            <Upload size={16} /> Import Data
            <input hidden type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && importLocal(e.target.files[0])} />
          </label>
        </div>
      </Card>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [active, setActive] = useState('dashboard')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!authReady) {
    return <div className="loading">Loading...</div>
  }

  if (isSupabaseConfigured && !session) {
    return <AuthScreen />
  }

  return <CrmShell session={session} active={active} setActive={setActive} />
}

function CrmShell({ session, active, setActive }) {
  const crm = useCrmData(session)
  const { data, add, remove } = crm

  const matches = useMemo(() => {
    const ownerListings = data.ownerProperties
      .filter((x) => x.status === 'Active')
      .map((x) => ({ ...x, source: 'owner', source_label: 'Owner Listing' }))

    const agentListings = data.agentListings
      .filter((x) => x.status === 'Active')
      .map((x) => ({ ...x, source: 'agent', source_label: 'Other Agent Listing' }))

    const allListings = [...ownerListings, ...agentListings]
    const activeRequests = data.clientRequests.filter((x) => !['Closed', 'Lost'].includes(x.status))
    const result = []

    for (const listing of allListings) {
      for (const request of activeRequests) {
        const scored = scoreMatch(listing, request)
        if (scored.score > 0) {
          result.push({ listing, request, score: scored.score, reasons: scored.reasons })
        }
      }
    }

    return result.sort((a, b) => b.score - a.score)
  }, [data])

  async function addFollowUpFromMatch(match) {
    await add('followUps', {
      client_name: match.request.client_name,
      property_title: match.listing.title,
      type: 'WhatsApp',
      follow_up_date: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      notes: `Match ${match.score}%. ${match.reasons.join(', ')}`
    })
  }

  return (
    <div>
      <Header active={active} setActive={setActive} session={session} syncMode={crm.syncMode} onRefresh={crm.fetchAll} />
      <main className="container">
        {active === 'dashboard' && <Dashboard data={data} matches={matches} loading={crm.loading} />}
        {active === 'owners' && (
          <div className="stack">
            <OwnerForm onAdd={(row) => add('ownerProperties', row)} />
            <ListingCards rows={data.ownerProperties} type="owner" onDelete={(id) => remove('ownerProperties', id)} />
          </div>
        )}
        {active === 'agents' && (
          <div className="stack">
            <AgentForm onAdd={(row) => add('agentListings', row)} />
            <ListingCards rows={data.agentListings} type="agent" onDelete={(id) => remove('agentListings', id)} />
          </div>
        )}
        {active === 'requests' && (
          <div className="stack">
            <RequestForm onAdd={(row) => add('clientRequests', row)} />
            <RequestCards rows={data.clientRequests} onDelete={(id) => remove('clientRequests', id)} />
          </div>
        )}
        {active === 'matches' && <Matches matches={matches} addFollowUp={addFollowUpFromMatch} />}
        {active === 'followups' && (
          <div className="stack">
            <FollowForm data={data} onAdd={(row) => add('followUps', row)} />
            <FollowUps rows={data.followUps} onDelete={(id) => remove('followUps', id)} />
          </div>
        )}
        {active === 'install' && <InstallPage syncMode={crm.syncMode} exportLocal={crm.exportLocal} importLocal={crm.importLocal} />}
      </main>
    </div>
  )
}
