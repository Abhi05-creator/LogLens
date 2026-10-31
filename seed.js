const Tenant = require("./mongo")
const crypto = require('crypto')

const createTenant = async () => {
    const tenant = await Tenant.create({
        name: "acme",
        apikey: crypto.randomBytes(16).toString("hex")
    })
    console.log(tenant.apikey)
    process.exit(0)
}

createTenant().catch(console.error); 