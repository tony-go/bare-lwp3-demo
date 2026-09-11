const tty = require('bare-tty')
const { connect } = require('./lib/hub')
const { Car } = require('./lib/car')

const SPEED = 50

const KEY_UP = '\x1b[A'
const KEY_DOWN = '\x1b[B'
const KEY_RIGHT = '\x1b[C'
const KEY_LEFT = '\x1b[D'

const BINDINGS = [
  ['up', 'drive forward'],
  ['down', 'drive backward'],
  ['left', 'steer left'],
  ['right', 'steer right'],
  ['space', 'stop and center'],
  ['q', 'quit and switch the hub off']
]

const out = new tty.WriteStream(1)

function say(line) {
  out.write(line + '\r\n')
}

async function main() {
  say('bare-lego')
  say('press the green button on the hub...')

  const hub = await connect()
  say('connected to ' + hub.name)

  const car = new Car(hub)
  say('calibrating steering...')
  await car.calibrate()

  say('ready')
  say('')
  for (const [key, action] of BINDINGS) say('  ' + key.padEnd(7) + action)
  say('')

  const keyboard = new tty.ReadStream(0)
  keyboard.setRawMode(true)

  keyboard.on('data', (data) => {
    const key = data.toString()
    if (key === KEY_UP) {
      car.drive(SPEED)
      say('forward')
    } else if (key === KEY_DOWN) {
      car.drive(-SPEED)
      say('backward')
    } else if (key === KEY_LEFT) {
      car.steer(-1)
      say('left')
    } else if (key === KEY_RIGHT) {
      car.steer(1)
      say('right')
    } else if (key === ' ') {
      car.stop()
      say('stop')
    } else if (key === 'q' || key === '\x03') {
      say('switching the hub off')
      hub.off()
      setTimeout(() => exit(0), 1500)
    }
  })

  hub.on('disconnect', () => {
    say('hub disconnected')
    exit(0)
  })

  hub.on('error', (err) => {
    say('error: ' + err.message)
    exit(1)
  })

  function exit(code) {
    keyboard.setRawMode(false)
    keyboard.destroy()
    Bare.exit(code)
  }
}

main().catch((err) => {
  console.error(err.message)
  Bare.exit(1)
})
