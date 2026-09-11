exports.SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123'
exports.CHARACTERISTIC_UUID = '00001624-1212-efde-1623-785feabcd123'

exports.PORT_A = 0x00
exports.PORT_B = 0x01
exports.PORT_C = 0x02
exports.PORT_D = 0x03

exports.startSpeed = function startSpeed(port, speed) {
  return Uint8Array.from([0x09, 0x00, 0x81, port, 0x11, 0x07, speed & 0xff, 0x64, 0x00])
}

exports.brake = function brake(port) {
  return Uint8Array.from([0x08, 0x00, 0x81, port, 0x11, 0x51, 0x00, 0x7f])
}

exports.switchOff = function switchOff() {
  return Uint8Array.from([0x04, 0x00, 0x02, 0x01])
}
