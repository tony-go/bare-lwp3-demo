# bare-lego

Drive a LEGO Technic Hub over Bluetooth Low Energy from Bare.

A proof of concept: [`bare-bluetooth`](https://github.com/holepunchto/bare-bluetooth) connects to the hub of a LEGO Technic set (tested with 42160) and drives its motors using the [LEGO Wireless Protocol 3](https://lego.github.io/lego-ble-wireless-protocol-docs/) directly. No firmware changes, no app, just Bare.

```
npm install
```

## Usage

Turn on the hub with its green button (the LED blinks while it advertises), then:

```
npm start
```

The CLI connects to the hub and stays connected, so the hub never powers itself off during a session. Key bindings:

```
k  move
l  stop
q  quit and switch the hub off
```

On first run macOS will ask for Bluetooth permission for your terminal.

## How it works

The hub exposes a single GATT characteristic (`00001624-1212-efde-1623-785feabcd123`). Every command is a small binary message written to it without response. Spinning a motor is 9 bytes: a Port Output Command (`0x81`) with the StartSpeed subcommand (`0x07`), the port id, and the speed.

## License

Apache-2.0
