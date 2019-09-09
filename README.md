# iot-monolith

monolithic approach to Node.js-enabled home automation

## Before we start

So, here's the thing: apart from a cobbled together image-slider that proved it could be implemented without any JS, this is the first thing I put on Github.
`iot-monolith` has been in development since 2018-07-15, but because it was (and is) a total work in progress, I've been using a private git-server until now.

## What's up with the name/history

When I moved into my flat about three years ago, I wanted to do home automation stuff but quickly came to the conclusion that many existing solutions were too rigid for the things I wanted to do. There was also "Home Assistant", which has a thriving community and plugins for everything you can imagine. I'd recommend it to everyone who wants to dive into home automation. Because it is written in Python and my Python-skills were (and still are) very limited, I decided to start from scratch in Node.js. Modern JavaScript also has some elegant ways to handle asynchronous tasks.

My day job as a web developer has me mostly working on existing projects with well established ways to do things and very little opportunities to make architectural decisions. So before arriving at "monolith", I thought that I might do heavy number crunching in Node.js and that it might be a good idea to spread out the work over many node-processes (`Worker` didn't exist back then).

So I wrote a bunch of "microservices" (`iot-proxy-roomsensor`, `iot-proxy-prometheus`, `iot-proxy-http-server`, `iot-proxy-hmi`, `iot-proxy-denon-avr`, etc.). I spawned them with `child_process.fork` from `iot-swarm` and used node's own IPC-channel with `iot-rpc` to make them send requests and responses to each other.

It was hell.

`iot-monolith` is just the name I came up with after giving up on microservices (at least for this project).

## Communicating with devices

Another thing that needed some iterations was the way I talk to the actual devices. I mostly use Arduinos with Wiznet W5500-based Ethernet-modules or ESP8266s for wireless applications. I try to use Ethernet as much as I can.

### HTTP

With most devices able to directly speak IP-based protocols, HTTP would be comfortably straight forward, but initiating communication from both sides would require a workaround.
Polling is stupid, long-polling is stupider and running HTTP-servers on both sides just makes the configuration more complex than necessary.

I could have gone with Apple's approach in HomeKit/HAP and extended HTTP to make "reverse requests" possible but I wasn't keen on making heavy modifications to Node.js' own HTTP-implementation and I certainly wasn't going to implement it in C++ for the Arduinos.

### MQTT

MQTT would have been another way. Everyone uses it and it solves the "bidirectional initiation"-problem. But it has no concept of requests and responses which gets messy as soon as you move past sensors. If you want to reliably know that the relay you just told to turn on was actually turned on by that exact request, you would need to come up with some kind of request/response-convention to use in the MQTT-topic. I did – but after realizing that MQTT is made for many-to-many communication and that in my case the devices only talk to a central program that handles logic, I ditched it.

Another thing to keep in mind is that HTTP and MQTT are Text-based protocols which require you to produce at least one long, concatenated string (URL or topic) on a device with very limited memory and storage. I don't say that's impossible – but it's unnecessary.

### Raw TCP

So, at last I moved to raw TCP-sockets. Those are low-level enough to allow me to implement trivial request/response mechanics myself while managing reliable delivery of all bytes in the correct order. Because the TCP-stack often lives on separate hardware (e.g. the W5500-module), I also send separate keep-alive messages that generate a response from the Arduino without side effects.

Most messages are only a few bytes long and fit easily into one UDP-packet (packet order becomes unimportant), so I might implement UDP messaging in the future.

## Basic structure

`src/lib` holds technical and logical abstractions.
There are low level technical abstractions, for example `ReliableSocket` (a `Socket` that auto-reconnects, handles timeouts and sends keep-alives). Those are then extended by high-level technical abstractions including `LedDriver` (implementing the specific messaging for LED-drivers), which are then used by logical abstractions, for example `LedLight`. Those things are mostly implemented as ES6-style classes.

`src/app` then uses those classes to create device- and logical instances according to configuration files in `config` and implements the data-plumbing between those instances.

Lately I found that extending classes based on device-type limits what devices can be. This structure forces devices to only ever be one logical thing. If I wanted to add a movement-sensor to a relay-driver on the ceiling (quite a sensible thing to do), this device would have to listen on two TCP-sockets so both `RelayDriver` and `RoomSensor` classes could connect to it separately.

This problem not only exits on a "service vs. device" level, but also for "device vs. transport". If I decided to make two devices talk over a single transport (e.g. RS485, UDP-multicast, CAN bus), this wouldn't be possible at the moment.

I'm now in the process of restructuring the app and overhauling communication-code so that transports, devices and services can be combined in a more flexible way, following the philosophy of "composition over configuration". There's even a diagram for it (`src/lib/transport/IoT classes.png`).

## User configurability

You'll see that the data-plumbing in `src/app` is far more extensive than you'd think. It turns out that if you don't limit the way your IoT-devices can interact with each other, the logic gets interesting and useful, but also very specific. For example, I have a giant clock built out of mechanical seven-segment displays. It gets a binary message every minute, telling it which segments to activate. This way, if I'd like to display a new symbol in the future, all I have to do is adjust the "server side" code instead of re-flashing the Arduino. The clock also adds a route to a HTTP-server which can be used to display alphanumeric messages. Because it shouldn't make noise when nobody's looking at it, it stops updating the time when there's no movement in the room. Finally, inside `iot-webinterface`, there's a switch to stop and start the clock regardless of movement.

I consciously decided against building an interface to setup and configure such an intricate logic. You just code it once and then it runs. There are still plenty of configuration parameters in `config` and much of the code in `src/app` is reused many times.

## About dependencies

As you'll notice, there are no dependencies listed in the `package.json`. Apart from the fact that many of the things (like binary messaging) are actually quite doable in Node.js alone, this is not your typical project aiming to work inside a variety of Node.js-versions and in browsers. I strongly disagree with the everyday reality of using thousands of throwaway-dependencies. I mostly write my own tooling/utilities, which is surely not the most efficient way, but this project doesn't need to make money and I feel better doing it like that. Also, I learned a lot about how `Date` works while writing the 654 lines of code in `src/lib/utils/time.js`. :D

Nothing this software does can have a life-threatening impact and also I'm not planning on getting a smart-lock. But still, it feels good not to rely on numerous shady sub-dependencies just to shuffle data around and handle timing. That's all this software does, really.

There are a few things I would love to implement using good libraries. At the moment, data is persisted in a simple JSON-file which is absolutely horrible, but good enough for now.
In the future, I'd like to connect to a good old relational database, which is ideal for sensor data, but I haven't found an up to date mySQL/MariaDB-library that just provides bindings for `libmysqlclient`.

## About testing

Testing a home automation solution that implements classes which represent devices only makes sense if you can also test the device itself or at least test correct communication with a mock. I haven't come around to creating a mock-device, so tests are located in `src/lib/**/tests/*` and are meant to be run manually as they often actually connect to the hardware and do stuff. I'm open to suggestions on how to sensibly implement unit-tests or some kind of end-to-end test.

## About TypeScript

At work, I'm using TypeScript on a daily basis and have gotten really comfortable around it. I realize that `iot-monolith` mainly shifts data around and that information moves through many modules. It would probably benefit heavily from a move to TypeScript. I'm still not sure if I want the software that controls my home to adopt a thing that is exclusively beneficial to the developer experience. If there was a true TypeScript-runtime that used typings for runtime-optimizations, I would use TypeScript right away. Also, Microsoft (writing this line in VSCode :'D).

## Usage

Don't use it. There are so many parts to this, especially the Arduino-sketches, that are not yet publicly available. I might create a Github Wiki in the future to document all the things. :)
