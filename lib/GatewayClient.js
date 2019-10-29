const EventEmitter = require('events');
const WebSocket = require('ws');

const process = require('process');
const autoBind = require('auto-bind');

const BASE_URL = 'wss://gateway.discord.gg';
const GATEWAY_VERSION = 6;
const LIBRARY_NAME = 'discord-bot';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

class GatewayClient extends EventEmitter {
  constructor () {
    super();

    this.token = process.env.DiscordBotToken;
    this.platform = process.platform;

    this.identifyCalls = [];
    this.heartbeatACK = true;

    autoBind(this);
  }

  connect () {
    this.websocket = new WebSocket(GetGatewayURL());

    this.websocket.on('open', () => {
      console.log('Gateway Opened');
    });

    this.websocket.on('close', this._onClose);

    this.websocket.on('message', this._onMessage);

    this.websocket.on('error', (err) => {
      console.warn(err);
    });
  }

  disconnect (code, reason = '') {
    if (this.websocket === undefined) {
      return;
    }

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.identifyTimeout) {
      clearTimeout(this.identifyTimeout);
    }

    console.log(`Gateway Disconnecting: ${code} ${reason}`.trim());
    this.websocket.close(code, reason);
  }

  _onClose (code, reason) {
    const closeMessage = `Gateway Closed: ${code} ${reason}`.trim();

    switch (code) {
      case 1000: // CLOSE_NORMAL
        console.log(closeMessage);
        process.exit(0);
      case 4000: // Unknown Error
      case 4009: // Session Timeout
        console.log(closeMessage);
        break;
      case 4007: // Invalid Sequence
        console.log(closeMessage);
        console.log('Gateway: Clearing Session ID');
        this.sessionID = null;
        break;
      case 4001: // Unknown Opcode
      case 4002: // Decode Error
      case 4003: // Not Authenticated
      case 4005: // Already Authenticated
        console.warn(closeMessage);
        break;
      case 4004: // Authentication Failed
      case 4008: // Rate Limited
      case 4010: // Invalid Shard
      case 4011: // Sharding Required
        console.error(closeMessage);
        process.exit(1);
      case 4050: // CUSTOM: Reconnect
        console.log(closeMessage);
        break;
      case 4051: // CUSTOM: Reset Session ID
        console.log(closeMessage);
        console.log('Gateway: Clearing Session ID');
        this.sessionID = null;
        break;
      case 4052: // CUSTOM: Exit Application
        console.error(closeMessage);
        process.exit(1);
      default:
        console.warn(`Unknown Code: ${closeMessage}`);
    }

    this.connect();
  }

  _onMessage (msg) {
    msg = JSON.parse(msg);

    if (msg.op === 0) {
      console.log(`Gateway Received [${msg.op}] - ${msg.t}`);
    } else {
      console.log(`Gateway Received [${msg.op}]`);
    }

    if (Object.prototype.hasOwnProperty.call(msg, 's')) {
      this.lastSequence = msg.s;
    }

    switch (msg.op) {
      case 0: // Dispatch
        this._onDispatchMessage(msg);
        break;
      case 1: // Heartbeat
        this._sendHeartbeatPayload();
        break;
      case 7: // Reconnect
        console.log('Reconnect');
        this.disconnect(4050, 'Reconnect');
        break;
      case 9: // Invalid Session
        // Session is resumable
        if (msg.d) {
          this._sendResumePayload();
          return;
        }

        this.sessionID = null;
        this.disconnect(4051, 'Invalid Session');
        break;
      case 10: // Hello
        this.heartbeatInterval = setInterval(this._sendHeartbeatPayload, msg.d.heartbeat_interval);

        this._sendIdentifyPayload();
        break;
      case 11: // Heartbeat ACK
        this.heartbeatACK = true;
        break;
      default:
        console.warn(`Gateway: No case for Opcode ${msg.op}: ${msg}`);
    }
  }

  _onDispatchMessage (msg) {
    switch (msg.t) {
      case 'READY':
        if (this.sessionID) {
          console.log('Gateway Resuming');
          this._sendResumePayload();
          break;
        }

        this.sessionID = msg.d.session_id;
        break;
      case 'RESUMED':
        this.sessionID = msg.d_session_id;
        break;
      default:
        this.emit(msg.t, msg);
    }
  }

  _sendPayload (op, data, sequence, type) {
    const msg = JSON.stringify({
      op,
      d: data,
      s: sequence || null,
      t: type || null
    });

    this.websocket.send(msg);
    console.log(`Gateway Sent [${op}]`);
  }

  _sendResumePayload () {
    const data = {
      token: process.env.DiscordBotToken,
      session_id: this.sessionID,
      seq: this.lastSequence
    };

    this._sendPayload(6, data);
  }

  _sendHeartbeatPayload () {
    if (!this.heartbeatACK) {
      this.disconnect(4050, 'No Heartbeat ACK');
      return;
    }

    this.heartbeatACK = false;
    this._sendPayload(1, this.lastSequence);
  }

  _sendIdentifyPayload () {
    if (this._timeSinceLastIdentifyCall() < 5000) {
      this.identifyTimeout = setTimeout(this._sendIdentifyPayload, 5000);
      return;
    }

    if (this.identifyCalls.count >= 1000) {
      this.disconnect(4052, 'Identify Call Limit Reached');
      return;
    }

    this._addIdentifyCall();

    const data = {
      token: this.token,
      properties: {
        $os: this.platform,
        $browser: LIBRARY_NAME,
        $device: LIBRARY_NAME
      }
    };

    this._sendPayload(2, data);
  }

  _timeSinceLastIdentifyCall () {
    if (this.identifyTimestamp) {
      return Date.now() - this.identifyTimestamp;
    }

    return 5000;
  }

  _addIdentifyCall () {
    this.identifyTimestamp = Date.now();

    this.identifyCalls = this.identifyCalls.filter((call) => {
      return call >= Date.now() - DAY_IN_MILLISECONDS;
    });

    this.identifyCalls.push(this.identifyTimestamp);
  }
}

function GetGatewayURL () {
  const params = new URLSearchParams([
    ['v', GATEWAY_VERSION],
    ['encoding', 'json']
  ]);

  return BASE_URL + '/?' + params.toString();
}

module.exports = GatewayClient;
