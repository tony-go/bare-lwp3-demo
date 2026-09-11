const tty = require('bare-tty')
const { connect } = require('./lib/hub')
const { PORT_A } = require('./lib/lwp3')

const SPEED = 50

const BINDINGS = [
  ['k', 'move'],
  ['l', 'stop'],
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
  say('')
  for (const [key, action] of BINDINGS) say('  ' + key + '  ' + action)
  say('')

  const keyboard = new tty.ReadStream(0)
  keyboard.setRawMode(true)

  keyboard.on('data', (data) => {
    const key = data.toString()
    if (key === 'k') {
      hub.motor(PORT_A, SPEED)
      say('move')
    } else if (key === 'l') {
      hub.motor(PORT_A, 0)
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
