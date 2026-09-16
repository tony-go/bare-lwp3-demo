const lwp3 = require('bare-lwp3')

const STEER_POWER = 30
const STEER_SPEED = 40
const STEER_MARGIN = 0.6

class Car {
  constructor(hub) {
    this._hub = hub
    this._center = 0
    this._range = 0
    this._position = 0
    this._drive = null

    hub.on('message', (message) => {
      if (message.type === 'portValue' && message.port === lwp3.PORT_D) {
        this._position = message.value
      }
      if (message.type === 'attachedIo' && message.ports) {
        this._drive = message.port
      }
    })
  }

  async calibrate() {
    await sleep(800)
    for (const port of [lwp3.PORT_A, lwp3.PORT_B, lwp3.PORT_D]) {
      if (!this._hub.attached.has(port)) {
        throw new Error('no motor on port ' + 'ABCD'[port])
      }
    }

    this._hub.pair(lwp3.PORT_A, lwp3.PORT_B)
    this._hub.watch(lwp3.PORT_D)
    await sleep(200)

    if (this._drive === null) {
      throw new Error('drive motors did not pair')
    }

    this._hub.power(lwp3.PORT_D, -STEER_POWER)
    await sleep(1000)
    this._hub.power(lwp3.PORT_D, 0)
    await sleep(300)
    const left = this._position

    this._hub.power(lwp3.PORT_D, STEER_POWER)
    await sleep(1000)
    this._hub.power(lwp3.PORT_D, 0)
    await sleep(300)
    const right = this._position

    this._center = Math.round((left + right) / 2)
    this._range = Math.round(((right - left) / 2) * STEER_MARGIN)

    this.steer(0)
  }

  drive(speed) {
    if (speed === 0) {
      this._hub.brake(lwp3.PORT_A)
      this._hub.brake(lwp3.PORT_B)
    } else {
      this._hub.speeds(this._drive, speed, speed)
    }
  }

  steer(direction) {
    this._hub.power(lwp3.PORT_D, 0)
    this._hub.goto(lwp3.PORT_D, this._center + direction * this._range, STEER_SPEED)
  }

  stop() {
    this.drive(0)
    this.steer(0)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

exports.Car = Car
