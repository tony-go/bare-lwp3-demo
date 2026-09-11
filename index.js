const { Central } = require('bare-bluetooth')

const LWP3_SERVICE = '00001623-1212-efde-1623-785feabcd123'
const PORT_A = 0x00
const SPEED = 50
const RUN_MS = 2000

function startSpeed(port, speed) {
  return Uint8Array.from([0x09, 0x00, 0x81, port, 0x11, 0x07, speed & 0xff, 0x64, 0x00])
}

const central = new Central()
let hub = null
let lwp3 = null
let connecting = false

central.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('scanning... press the green button on the hub')
    central.startScan([LWP3_SERVICE])
  } else if (state === 'poweredOff' || state === 'unauthorized' || state === 'unsupported') {
    console.error('bluetooth ' + state)
    Bare.exit(1)
  }
})

central.on('discover', (found) => {
  if (connecting) return
  connecting = true
  console.log('hub found: ' + found.name)
  central.stopScan()
  central.connect(found)
})

central.on('connect', (peripheral) => {
  console.log('connected')
  hub = peripheral

  hub.on('servicesDiscover', (services) => {
    hub.discoverCharacteristics(services[0])
  })

  hub.on('characteristicsDiscover', (service, characteristics) => {
    lwp3 = characteristics.find((c) => c.uuid.toLowerCase().includes('1624'))
    if (!lwp3) {
      console.error('lwp3 characteristic not found')
      Bare.exit(1)
    }
    hub.subscribe(lwp3)
  })

  hub.on('notifyState', (characteristic, isNotifying) => {
    if (!isNotifying) return
    console.log('motor A: speed ' + SPEED + '% for ' + RUN_MS + 'ms')
    hub.write(lwp3, startSpeed(PORT_A, SPEED), false)
    setTimeout(stop, RUN_MS)
  })

  hub.on('error', (err) => {
    console.error(err.message)
    Bare.exit(1)
  })

  hub.discoverServices([LWP3_SERVICE])
})

central.on('disconnect', () => {
  console.log('done')
  central.destroy()
  Bare.exit(0)
})

central.on('error', (err) => {
  console.error(err.message)
  Bare.exit(1)
})

function stop() {
  console.log('motor A: stop')
  hub.write(lwp3, startSpeed(PORT_A, 0), false)
  setTimeout(() => central.disconnect(hub), 300)
}
