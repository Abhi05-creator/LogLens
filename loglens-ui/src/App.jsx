import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:3000'
const LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG']

const fmt = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour12: false }) : '-'

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('loglens-key') || '')
  const [q, setQ] = useState('')
  const [service, setService] = useState('')
  const [level, setLevel] = useState('')
  const [live, setLive] = useState(false)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    if (!apiKey) {
      setLogs([])
      setError('Paste your API key to start searching.')
      return
    }
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (service) params.set('service', service)
    if (level) params.set('level', level)
    try {
      const res = await fetch(`${API}/search?${params}`, {
        headers: { 'x-api-key': apiKey },
      })
      if (res.status === 401) {
        setLogs([])
        setError('The API key was rejected. Use the key that seed.js printed.')
        return
      }
      if (!res.ok) throw new Error()
      const result = await res.json()
      setLogs(Array.isArray(result) ? result : (result.data || []))
      setError('')
    } catch {
      setError('Cannot reach the API at localhost:3000. Start api.js and check that CORS is enabled.')
    }
  }, [apiKey, q, service, level])

  useEffect(() => {
    localStorage.setItem('loglens-key', apiKey)
  }, [apiKey])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    if (!live) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [live, load])

  const logList = Array.isArray(logs) ? logs : []
  const counts = LEVELS.map((l) => [l, logList.filter((x) => x.level === l).length]).filter(
    ([, n]) => n
  )

  return (
    <div className="app">
      <header>
        <h1>LogLens</h1>
        <input
          className="key"
          type="password"
          aria-label="API key"
          placeholder="API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </header>

      <section className="controls">
        <input
          className="search"
          aria-label="Search messages"
          placeholder="Search messages, for example: declined"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="svc"
          aria-label="Service"
          placeholder="Service"
          value={service}
          onChange={(e) => setService(e.target.value)}
        />
        <div className="seg" role="group" aria-label="Level">
          {['', ...LEVELS].map((l) => (
            <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>
              {l || 'All'}
            </button>
          ))}
        </div>
        <button className={'live' + (live ? ' on' : '')} aria-pressed={live} onClick={() => setLive(!live)}>
          {live ? 'Live: on' : 'Live: off'}
        </button>
      </section>

      {logs.length > 0 && (
        <>
          <div className="strip">
            {counts.map(([l, n]) => (
              <button
                key={l}
                className={`fill-${l}`}
                style={{ flexGrow: n }}
                title={`Show only ${l}`}
                onClick={() => setLevel(l)}
              >
                {l} {n}
              </button>
            ))}
          </div>
          <p className="total">{logs.length} logs, newest first</p>
        </>
      )}

      {error && <p className="note err">{error}</p>}
      {!error && logs.length === 0 && (
        <p className="note">No logs match. Send one to POST /ingest, or clear the filters.</p>
      )}

      <ul className="logs">
        {logs.map((l, i) => (
          <li key={i} className={`lv-${l.level}`}>
            <button className="row" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <time>{fmt(l.timestamp)}</time>
              <b>{l.level}</b>
              <span className="name">{l.service}</span>
              <span className="msg">{l.message}</span>
            </button>
            {open === i && <pre>{JSON.stringify(l, null, 2)}</pre>}
          </li>
        ))}
      </ul>
    </div>
  )
}