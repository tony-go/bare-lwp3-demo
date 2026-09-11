const http = require('bare-http1')
const os = require('bare-os')
const { connect } = require('./lib/hub')
const { Car } = require('./lib/car')
const { LED_GREEN, LED_BLUE, LED_RED } = require('bare-lwp3')

const PORT = 8080
const SPEED = 50

const PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>bare-lego</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: #14171f;
    font-family: monospace;
  }
  h1 { color: #6ee7b7; font-size: 20px; margin: 0 0 8px; }
  .pad {
    display: grid;
    grid-template-columns: repeat(3, 96px);
    grid-template-rows: repeat(3, 96px);
    gap: 12px;
  }
  button {
    border: 0;
    border-radius: 16px;
    background: #232936;
    color: #e5e7eb;
    font-family: monospace;
    font-size: 18px;
    -webkit-tap-highlight-color: transparent;
  }
  button:active { background: #6ee7b7; color: #14171f; }
  .fwd { grid-area: 1 / 2; }
  .left { grid-area: 2 / 1; }
  .stop { grid-area: 2 / 2; background: #3b2430; }
  .right { grid-area: 2 / 3; }
  .rev { grid-area: 3 / 2; }
  .off { width: 100%; height: 48px; background: transparent; color: #4b5563; }
</style>
</head>
<body>
<h1>bare-lego</h1>
<div class="pad">
  <button class="fwd" onclick="send('/forward')">FWD</button>
  <button class="left" onclick="send('/left')">LEFT</button>
  <button class="stop" onclick="send('/stop')">STOP</button>
  <button class="right" onclick="send('/right')">RIGHT</button>
  <button class="rev" onclick="send('/backward')">REV</button>
</div>
<button class="off" onclick="send('/off')">power off hub</button>
<script>
  function send(path) {
    fetch(path, { method: 'POST' })
  }
</script>
</body>
</html>
`

function address() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries) {
      if (!entry.internal && entry.family === 'IPv4') return entry.address
    }
  }
  return 'localhost'
}

async function main() {
  console.log('bare-lego remote')
  console.log('press the green button on the hub...')

  const hub = await connect()
  console.log('connected to ' + hub.name)

  const car = new Car(hub)
  console.log('calibrating steering...')
  await car.calibrate()
  hub.led(LED_GREEN)

  const routes = {
    '/forward': () => {
      car.drive(SPEED)
      hub.led(LED_BLUE)
    },
    '/backward': () => {
      car.drive(-SPEED)
      hub.led(LED_BLUE)
    },
    '/left': () => car.steer(-1),
    '/right': () => car.steer(1),
    '/stop': () => {
      car.stop()
      hub.led(LED_RED)
    },
    '/off': () => hub.off()
  }

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.setHeader('content-type', 'text/html')
      res.end(PAGE)
      return
    }

    const action = req.method === 'POST' ? routes[req.url] : undefined
    if (!action) {
      res.statusCode = 404
      res.end()
      return
    }

    action()
    res.statusCode = 204
    res.end()
  })

  server.listen(PORT, '0.0.0.0')
  server.on('listening', () => {
    console.log('remote ready: http://' + address() + ':' + PORT + ' (phone on the same wifi)')
  })

  hub.on('disconnect', () => {
    console.log('hub disconnected')
    Bare.exit(0)
  })

  hub.on('error', (err) => {
    console.error(err.message)
    Bare.exit(1)
  })
}

main().catch((err) => {
  console.error(err.message)
  Bare.exit(1)
})
