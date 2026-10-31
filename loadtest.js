const autocannon = require('autocannon');
const { Client } = require('@elastic/elasticsearch');

const es = new Client({ node: 'http://localhost:9200' });
const API_KEY = 'a543d52cdaabcd92eaace60e0268f5d5';

const INDEX = 'logs-data';

async function main() {
    const before = (await es.count({ index: INDEX })).count;
    const start = Date.now();

    const result = await autocannon({
        url: 'http://localhost:3000/ingest',
        method: 'POST',
        connections: 20,
        duration: 10,
        headers: { 'content-type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ service: 'payment', level: 'ERROR', message: 'load test' })
    });

    const sent = result['2xx'];
    console.log('accepted:', sent, '| rejected (non-2xx):', result.non2xx);
    console.log('ingest req/sec (avg):', result.requests.average);
    console.log('ingest latency p99 (ms):', result.latency.p99);

    while (Date.now() - start < 180000) {
        const now = (await es.count({ index: INDEX })).count;
        if (now - before >= sent) break;
        await new Promise(r => setTimeout(r, 500));
    }

    const secs = (Date.now() - start) / 1000;
    const indexed = (await es.count({ index: INDEX })).count - before;
    console.log('indexed in ES:', indexed, 'of', sent, 'after', secs, 's');
    console.log('end-to-end logs/sec:', Math.round(indexed / secs));
}

main().catch(console.error);