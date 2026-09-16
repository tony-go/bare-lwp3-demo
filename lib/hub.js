const EventEmitter = require('bare-events')
const { Central } = require('bare-bluetooth')
const lwp3 = require('bare-lwp3')

class Hub extends EventEmitter {
  constructor(central, peripheral, characteristic) {
    super()

    this._central = central
    this._peripheral = peripheral
    this._characteristic = characteristic
    this._attached = new Set()

    central.on('disconnect', () => this.emit('disconnect'))
    central.on('error', (err) => this.emit('error', err))
    peripheral.on('error', (err) => this.emit('error', err))

    peripheral.on('notify', (c, data) => {
      const message = lwp3.decode(data)
      if (message.type === 'attachedIo') {
        if (message.event === 0x00) this._attached.delete(message.port)
        else this._attached.add(message.port)
      }
      this.emit('message', message)
    })
  }

  get attached() {
    return this._attached
  }

  get name() {
    return this._peripheral.name
  }

  motor(port, speed) {
    this._write(speed === 0 ? lwp3.brake(port) : lwp3.startSpeed(port, speed))
  }

  power(port, power) {
    this._write(lwp3.startPower(port, power))
  }

  brake(port) {
    this._write(lwp3.brake(port))
  }

  goto(port, position, speed) {
    this._write(lwp3.gotoAbsolutePosition(port, position, speed))
  }

  watch(port) {
    this._write(lwp3.subscribe(port, lwp3.MODE_POSITION))
  }

  pair(portA, portB) {
    this._write(lwp3.connectVirtualPort(portA, portB))
  }

  speeds(port, speedA, speedB) {
    this._write(lwp3.startSpeeds(port, speedA, speedB))
  }

  subscribeBattery() {
    this._write(lwp3.subscribeBattery())
  }

  led(color) {
    this._write(lwp3.led(lwp3.LED_PORT, color))
  }

  off() {
    this._write(lwp3.switchOff())
  }

  close() {
    this._central.disconnect(this._peripheral)
  }

  _write(message) {
    this._peripheral.write(this._characteristic, message, false)
  }
}

exports.connect = function connect() {
  return new Promise((resolve, reject) => {
    const central = new Central()
    let connecting = false
    let hub = null

    central.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        central.startScan([lwp3.SERVICE_UUID])
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
        const characteristic = characteristics.find(
          (c) => c.uuid.toLowerCase() === lwp3.CHARACTERISTIC_UUID
        )
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

      peripheral.discoverServices([lwp3.SERVICE_UUID])
    })

    central.on('error', (err) => {
      if (!hub) reject(err)
    })
  })
}
