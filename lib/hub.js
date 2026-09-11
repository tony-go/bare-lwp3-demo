const EventEmitter = require('bare-events')
const { Central } = require('bare-bluetooth')

const LWP3_SERVICE = '00001623-1212-efde-1623-785feabcd123'

exports.PORT_A = 0x00
exports.PORT_B = 0x01
exports.PORT_C = 0x02
exports.PORT_D = 0x03

class Hub extends EventEmitter {
  constructor(central, peripheral, characteristic) {
    super()

    this._central = central
    this._peripheral = peripheral
    this._characteristic = characteristic

    central.on('disconnect', () => this.emit('disconnect'))
    central.on('error', (err) => this.emit('error', err))
    peripheral.on('error', (err) => this.emit('error', err))
  }

  get name() {
    return this._peripheral.name
  }

  motor(port, speed) {
    if (speed === 0) {
      this._write([0x08, 0x00, 0x81, port, 0x11, 0x51, 0x00, 0x7f])
    } else {
      this._write([0x09, 0x00, 0x81, port, 0x11, 0x07, speed & 0xff, 0x64, 0x00])
    }
  }

  off() {
    this._write([0x04, 0x00, 0x02, 0x01])
  }

  close() {
    this._central.disconnect(this._peripheral)
  }

  _write(bytes) {
    this._peripheral.write(this._characteristic, Uint8Array.from(bytes), false)
  }
}

exports.connect = function connect() {
  return new Promise((resolve, reject) => {
    const central = new Central()
    let connecting = false
    let hub = null

    central.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        central.startScan([LWP3_SERVICE])
      } else if (state === 'poweredOff' || state === 'unauthorized' || state === 'unsupported') {
        reject(new Error('bluetooth ' + state))
      }
    })

    central.on('discover', (found) => {
      if (connecting) return
      connecting = true
      central.stopScan()
      central.connect(found)
    })

    central.on('connect', (peripheral) => {
      peripheral.on('servicesDiscover', (services) => {
        peripheral.discoverCharacteristics(services[0])
      })

      peripheral.on('characteristicsDiscover', (service, characteristics) => {
        const characteristic = characteristics.find((c) => c.uuid.toLowerCase().includes('1624'))
        if (!characteristic) return reject(new Error('lwp3 characteristic not found'))
        peripheral.subscribe(characteristic)

        peripheral.on('notifyState', (c, isNotifying) => {
          if (!isNotifying || hub) return
          hub = new Hub(central, peripheral, characteristic)
          resolve(hub)
        })
      })

      peripheral.on('error', (err) => {
        if (!hub) reject(err)
      })

      peripheral.discoverServices([LWP3_SERVICE])
    })

    central.on('error', (err) => {
      if (!hub) reject(err)
    })
  })
}
