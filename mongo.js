const mongoose = require('mongoose')
mongoose.connect("mongodb://localhost:27017/LogLive")
const tenantschema = new mongoose.Schema({
    name: { type: String, required: true },
    apikey: { type: String, required: true, unique: true },

})

const Tenant = mongoose.model("tenantschema", tenantschema)
module.exports = Tenant