exports.SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123'
exports.CHARACTERISTIC_UUID = '00001624-1212-efde-1623-785feabcd123'

exports.PORT_A = 0x00
exports.PORT_B = 0x01
exports.PORT_C = 0x02
exports.PORT_D = 0x03

exports.startSpeed = function startSpeed(port, speed) {
  return Uint8Array.from([0x09, 0x00, 0x81, port, 0x11, 0x07, speed & 0xff, 0x64, 0x00])
}

exports.startPower = function startPower(port, power) {
  return Uint8Array.from([0x08, 0x00, 0x81, port, 0x11, 0x51, 0x00, power & 0xff])
}

exports.brake = function brake(port) {
  return exports.startPower(port, 0x7f)
}

exports.gotoAbsolutePosition = function gotoAbsolutePosition(port, position, speed) {
  const message = Uint8Array.from([
    0x0e,
    0x00,
    0x81,
    port,
    0x11,
    0x0d,
    0x00,
    0x00,
    0x00,
    0x00,
    speed,
    0x64,
    0x7e,
    0x00
  ])
  new DataView(message.buffer).setInt32(6, position, true)
  return message
}

exports.subscribePosition = function subscribePosition(port) {
  return Uint8Array.from([0x0a, 0x00, 0x41, port, 0x02, 0x01, 0x00, 0x00, 0x00, 0x01])
}

exports.switchOff = function switchOff() {
  return Uint8Array.from([0x04, 0x00, 0x02, 0x01])
}

exports.decode = function decode(message) {
  const view = new DataView(message.buffer, message.byteOffset, message.byteLength)
  switch (message[2]) {
    case 0x04:
      return { type: 'attachedIo', port: message[3], event: message[4] }
    case 0x45:
      return {
        type: 'portValue',
        port: message[3],
        value: message.byteLength >= 8 ? view.getInt32(4, true) : message[4]
      }
    case 0x82:
      return { type: 'feedback', port: message[3], status: message[4] }
    default:
      return { type: 'unknown', id: message[2] }
  }
}
