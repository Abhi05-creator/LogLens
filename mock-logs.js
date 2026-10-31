const Tenant = require('./mongo')

const SAMPLE_LOGS = [
  { service: 'auth', level: 'INFO', message: 'User user_882 authenticated successfully via OAuth2' },
  { service: 'auth', level: 'WARN', message: 'Failed password attempt for user admin@example.com (3/5)' },
  { service: 'auth', level: 'ERROR', message: 'JWT token validation failed: signature expired' },
  { service: 'payment', level: 'INFO', message: 'Captured charge ch_3M5q12 for $89.00 USD' },
  { service: 'payment', level: 'WARN', message: 'Stripe webhook retry: processing delay > 2500ms' },
  { service: 'payment', level: 'ERROR', message: 'Card declined: insufficient_funds on customer cus_9918' },
  { service: 'order', level: 'INFO', message: 'Order #ORD-7819 created with 3 line items' },
  { service: 'order', level: 'INFO', message: 'Fulfillment dispatched via FedEx tracking #98234710' },
  { service: 'order', level: 'WARN', message: 'Inventory reserve timeout for SKU-8841; releasing lock' },
  { service: 'inventory', level: 'DEBUG', message: 'Stock sync completed for warehouse us-east-2 (4,120 items)' },
  { service: 'inventory', level: 'WARN', message: 'Low stock warning for SKU-7712: 3 units remaining' },
  { service: 'notification', level: 'INFO', message: 'SMS notification delivered to +1-555-0199 in 142ms' },
  { service: 'notification', level: 'ERROR', message: 'Email delivery bounced for receiver invalid-addr@null.org' },
  { service: 'gateway', level: 'INFO', message: 'GET /api/v1/products - 200 OK (18ms)' },
  { service: 'gateway', level: 'DEBUG', message: 'Rate limit bucket refreshed for ip: 198.51.100.42' },
  { service: 'gateway', level: 'WARN', message: 'Slow endpoint detected: POST /checkout took 1820ms' }
]

async function run() {
  const tenant = await Tenant.findOne()
  if (!tenant) {
    console.error('No tenant found in MongoDB. Run "npm run seed" first!')
    process.exit(1)
  }

  const apiKey = tenant.apikey
  console.log(`Using Tenant: "${tenant.name}" (API Key: ${apiKey})`)
  console.log('Ingesting 40 varied logs into http://localhost:3000/ingest...')

  for (let i = 0; i < 40; i++) {
    const item = SAMPLE_LOGS[Math.floor(Math.random() * SAMPLE_LOGS.length)]
    try {
      const res = await fetch('http://localhost:3000/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(item)
      })
      if (!res.ok) {
        console.error(`Failed to ingest log ${i + 1}: HTTP ${res.status}`)
      }
    } catch (err) {
      console.error(`Error sending log ${i + 1}:`, err.message)
    }
    // slight delay so timestamps have slight variation
    await new Promise(r => setTimeout(r, 60))
  }

  console.log('Done! Check your LogLens UI at http://localhost:5173 to see the diverse logs and colored stats!')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
