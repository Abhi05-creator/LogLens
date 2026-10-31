const redis = require('redis')
const { Client } = require('@elastic/elasticsearch')
const es = new Client({ node: 'http://localhost:9200' })

const work = async () => {
    const redisclient = redis.createClient()
    redisclient.on('error', (err) => console.error('Redis Client Error', err))
    await redisclient.connect()

    const processmessage = async (message) => {
        if (!message || !message.id || !message.message) return
        try {
            await es.index({
                index: 'logs-data',
                id: message.id,
                document: { ...message.message, timestamp: new Date().toISOString() }
            })
            await redisclient.xAck('logs', 'group', message.id)
        } catch (err) {
            console.error('Error processing message:', err)
        }
    }

    try {
        await redisclient.xGroupCreate('logs', 'group', '0', { mkstream: true })
    } catch (error) {
        if (!error.message || !error.message.includes('BUSYGROUP')) {
            console.error(error)
        }
    }

    setInterval(async () => {
        try {
            const stuck = await redisclient.xPendingRange('logs', 'group', '-', '+', 10, { IDLE: 10000 })
            for (const p of stuck) {
                if (p.deliveriesCounter > 3) {
                    const [entry] = await redisclient.xRange('logs', p.id, p.id)
                    if (entry) {
                        await redisclient.xAdd('logs-failed', '*', { message: JSON.stringify(entry.message), originalId: p.id })
                    }
                    await redisclient.xAck('logs', 'group', p.id)
                    console.log('moved to logs-failed', p.id)
                }
            }
            const r = await redisclient.xAutoClaim('logs', 'group', 'group-1', 1000, '0-0', { COUNT: 10 })
            if (r && r.messages) {
                for (const message of r.messages) {
                    await processmessage(message)
                }
            }
        } catch (err) {
            console.error('Error in Autoclaim:', err)
        }
    }, 60000)

    while (true) {
        const reading = await redisclient.xReadGroup('group', 'group-1', { key: 'logs', id: '>', count: 500, block: 2000 })
        if (!reading || !reading[0] || !reading[0].messages || reading[0].messages.length === 0) {
            continue
        }
        const messages = reading[0].messages
        try {
            const operations = messages.flatMap(m => [
                { index: { _index: 'logs-data', _id: m.id } },
                { ...m.message, timestamp: new Date().toISOString() }
            ])
            await es.bulk({ operations })
            await redisclient.xAck('logs', 'group', messages.map(m => m.id))
        } catch (err) {
            console.error('Error in bulk indexing:', err)
        }
    }
}

work().catch(console.error)