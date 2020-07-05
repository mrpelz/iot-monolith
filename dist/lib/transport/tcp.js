import { humanPayload, readNumber, writeNumber } from '../utils/data.js';
import { Socket } from 'net';
import { Timer } from '../utils/time.js';
import { Transport } from './index.js';
import { rebind } from '../utils/oop.js';
// PACKET FORMAT
//
// request (to device):
// |                                |                      |                                    |                      |
// | length (1–n octets, default 1) | request id (1 octet) | service id (1–n octets, default 1) | payload (0–n octets) |
// |  packet length (incl. headers) |            0x01–0xFF |                          0x00–0xFF |                      |
// |                                |                      |                                    |                      |
//
// response (from device):
// |                                |                      |                      |
// | length (1–n octets, default 1) | request id (1 octet) | payload (0–n octets) |
// |  packet length (incl. headers) |            0x01–0xFF |                      |
// |                                |                      |                      |
//
// event (from device):
// |                                |                      |                                  |                      |
// | length (1–n octets, default 1) | request id (1 octet) | event id (1–n octets, default 1) | payload (0–n octets) |
// |  packet length (incl. headers) |          always 0x00 |                        0x00–0xFF |                      |
// |                                |                      |                                  |                      |
//
const libName = 'tcp transport';
/**
  * @typedef TCPTransportOptions
  * @type {import('./index.js').TransportOptions & {
    *  host: string,
    *  port: number,
    *  lengthPreamble?: number,
    *  keepAlive?: number
    * }}
    */
/**
 * @class TCPTransport
 */
export class TCPTransport extends Transport {
    /**
     * create instance of Transport
     * @param {TCPTransportOptions} options configuration object
     */
    constructor(options) {
        const { host, port, lengthPreamble = 1, keepAlive = 2000 } = options;
        if (!lengthPreamble) {
            throw new Error('insufficient options provided');
        }
        super(options);
        this.log.friendlyName(`${host}:${port}`);
        /**
         * @type {TCPTransportOptions & {
         *  connectionTime: number,
         *  currentLength: number,
         *  shouldBeConnected: boolean,
         *  log: ReturnType<import('../log/index.js').Logger['withPrefix']>,
         *  socket: Socket | null,
         *  messageTimer: import('../utils/time').Timer
         * }}
         */
        this.tcpState = {
            connectionTime: 0,
            currentLength: 0,
            shouldBeConnected: false,
            host,
            keepAlive,
            lengthPreamble,
            log: this.log.withPrefix(libName),
            port,
            socket: null,
            messageTimer: new Timer(keepAlive * 2)
        };
        rebind(this, 'addDevice', 'connect', 'disconnect', 'reconnect', 'removeDevice', 'writeToNetwork', '_connect', '_handleReadable', '_onConnection', '_onDisconnection');
        setInterval(this._connect, Math.round(keepAlive / 2));
        this.tcpState.messageTimer.on('hit', this._onDisconnection);
    }
    /**
     * handle (dis)connection of socket
     */
    _connect() {
        const { log, shouldBeConnected } = this.tcpState;
        const { isConnected } = this.state;
        log.debug('connection/disconnection handling');
        if (shouldBeConnected && !isConnected) {
            this._nukeSocket();
            this._setUpSocket();
        }
        else if (!shouldBeConnected && isConnected) {
            this._nukeSocket();
        }
    }
    /**
     * handle readable (incoming) bytes from socket
     */
    _handleReadable() {
        let remainder = true;
        while (remainder) {
            remainder = this._read();
        }
    }
    /**
     * destroy old socket and remove listeners
     */
    _nukeSocket() {
        const { socket } = this.tcpState;
        if (!socket)
            return;
        socket.removeListener('readable', this._handleReadable);
        socket.removeListener('connect', this._onConnection);
        socket.removeListener('end', this._onDisconnection);
        socket.removeListener('timeout', this._onDisconnection);
        socket.removeListener('error', this._onDisconnection);
        socket.end();
        socket.destroy();
        this.tcpState.socket = null;
    }
    /**
     * handle socket connection
     */
    _onConnection() {
        const { log } = this.tcpState;
        const { isConnected } = this.state;
        if (isConnected)
            return;
        this.tcpState.connectionTime = Date.now();
        log.info({
            head: 'is connected',
            value: true
        });
        this._setConnected(true);
    }
    /**
     * handle socket disconnection
     */
    _onDisconnection() {
        const { log, messageTimer } = this.tcpState;
        const { isConnected } = this.state;
        if (!isConnected)
            return;
        messageTimer.stop();
        this._nukeSocket();
        this.tcpState.currentLength = 0;
        log.info({
            head: 'is connected',
            value: false
        });
        this._setConnected(false);
    }
    /**
     * read the right amount of bytes from socket
     * @returns {boolean}
     */
    _read() {
        const { currentLength, lengthPreamble, log, messageTimer, socket } = this.tcpState;
        if (currentLength) {
            const payload = socket.read(currentLength);
            if (!payload)
                return false;
            this.tcpState.currentLength = 0;
            messageTimer.stop();
            log.debug({
                head: 'msg incoming',
                attachment: humanPayload(payload)
            });
            this._ingestIntoDeviceInstances(null, payload);
            return true;
        }
        const length = socket.read(lengthPreamble);
        if (!length)
            return false;
        this.tcpState.currentLength = readNumber(length, lengthPreamble);
        messageTimer.start();
        if (this.tcpState.currentLength > 5) {
            log.error(`unusual large message: ${this.tcpState.currentLength} bytes`);
        }
        log.debug(`receive ${this.tcpState.currentLength} byte payload`);
        return true;
    }
    /**
     * create new socket and set up listeners
     */
    _setUpSocket() {
        const { host, keepAlive, port } = this.tcpState;
        const socket = new Socket();
        socket.connect({ host, port });
        socket.setNoDelay(true);
        if (keepAlive) {
            socket.setKeepAlive(true, keepAlive);
            socket.setTimeout(keepAlive * 2);
        }
        socket.on('readable', this._handleReadable);
        socket.on('connect', this._onConnection);
        socket.on('end', this._onDisconnection);
        socket.on('timeout', this._onDisconnection);
        socket.on('error', this._onDisconnection);
        this.tcpState.socket = socket;
    }
    /**
     * connect TCPTransport instance
     */
    connect() {
        this.tcpState.shouldBeConnected = true;
        this._connect();
        this.tcpState.log.info({
            head: 'set connect',
            value: true
        });
    }
    /**
     * disconnect TCPTransport instance
     */
    disconnect() {
        this.tcpState.shouldBeConnected = false;
        this._connect();
        this.tcpState.log.info({
            head: 'set connect',
            value: false
        });
    }
    /**
     * reconnect TCPTransport instance
     */
    reconnect() {
        this._onDisconnection();
    }
    /**
     * write from Transport instance to network – placeholder
     * @param {unknown} _ device identifier buffer (not needed on TCPTransport)
     * @param {Buffer} payload payload buffer
     */
    writeToNetwork(_, payload) {
        const { lengthPreamble, socket, log } = this.tcpState;
        const { isConnected } = this.state;
        if (!isConnected) {
            throw new Error('socket is not connected!');
        }
        log.debug(`send ${payload.length} byte payload`);
        log.debug({
            head: 'msg outgoing',
            attachment: humanPayload(payload)
        });
        socket.write(Buffer.concat([
            writeNumber(payload.length, lengthPreamble),
            payload
        ]));
    }
}
//# sourceMappingURL=tcp.js.map