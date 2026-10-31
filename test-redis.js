
const redis = require('redis');
const newredis = async () => {
    const redisclient = redis.createClient();
    await redisclient.connect()
    const id = await redisclient.xAdd("logs", "*", { message: 'hello bro' })
    const range = await redisclient.xRead({ key: 'logs', id: '0-0' }, { count: 10 })
    console.log(JSON.stringify(range, null, 2))
    redisclient.quit()
}
newredis().catch(console.error)
