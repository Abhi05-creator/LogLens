const redis = require('redis')
const love = async () => {
    const redisclient = redis.createClient()
    await redisclient.connect()
    const old = await redisclient.xRead({ key: "logs", id: "0-0" })
    console.log(JSON.stringify(old, null, 2))
    redisclient.quit()
}
love().catch(console.error)