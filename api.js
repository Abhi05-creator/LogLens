const express = require('express')
const app = express()
const redis = require('redis')
const { Client } = require('@elastic/elasticsearch')
const cors = require('cors')
const es = new Client({ node: 'http://localhost:9200' })
const Tenant = require('./mongo')
const redisclient = redis.createClient()

redisclient.on('error', (err) => console.error('Redis Client Error', err))
redisclient.connect().catch(console.error)

app.use(cors())
app.use(express.json())

const keyverify = async (req, res, next) => {
    try {
        const key = req.headers['x-api-key']
        if (!key) {
            return res.status(401).json({ success: false, msg: 'missing key' })
        }
        const tenant = await Tenant.findOne({ apikey: key })
        if (!tenant) {
            return res.status(401).json({ success: false, msg: 'invalid key' })
        }
        req.tenant = tenant
        next()
    } catch (err) {
        console.error(err)
        return res.status(500).json({ success: false, msg: 'internal error' })
    }
}

app.post('/ingest', keyverify, async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, msg: 'empty request' })
        }
        const key = `rate:${req.tenant.name}`
        const count = await redisclient.incr(key)
        if (count === 1) {
            await redisclient.expire(key, 60)
        }
        if (count > 1000000) {
            return res.status(429).json({ success: false, msg: 'limit exceeded' })
        }

        await redisclient.xAdd('logs', '*', { ...req.body, tenant: req.tenant.name })

        return res.status(202).json({ success: true })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ success: false })
    }
})

app.get('/search', keyverify, async (req, res) => {
    try {
        const { service, level, q } = req.query
        const bool = { must: [], filter: [] }
        if (service) {
            bool.must.push({ match: { 'service.keyword': service } })
        }
        if (q) {
            bool.must.push({ match: { message: q } })
        }
        if (level) {
            bool.filter.push({ term: { 'level.keyword': level } })
        }
        bool.filter.push({ term: { 'tenant.keyword': req.tenant.name } })
        const result = await es.search({
            index: 'logs-data',
            size: 100,
            sort: [{ timestamp: { order: 'desc', unmapped_type: 'date' } }],
            query: {
                bool: {
                    must: bool.must,
                    filter: bool.filter,
                }
            }
        })
        return res.status(200).json({ success: true, data: result.hits.hits.map(h => h._source) })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ success: false })
    }
})

app.listen(3000, () => {
    console.log('port listening on', 3000)
})