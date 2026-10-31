const redis = require('redis')
const high = async () => {
    const redisclient = redis.createClient()
    await redisclient.connect()
    const like = await redisclient.xAdd("logs", "*", { service: 'payment', level: "ERROR", message: "payment failed" })
    console.log(JSON.stringify(like, null, 2))
    redisclient.quit()
}
high().catch(console.error)