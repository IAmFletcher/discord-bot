const EventEmitter = require('events');
const WebSocket = require('ws');
const autoBind = require('auto-bind');

const UNRECOVERABLE_CODES = [4000, 4004, 4008, 4010, 4011];

class WebSocketClient extends EventEmitter {
  constructor (token, os, name) {
    super();

    this._token = token;
    this._os = os;
    this._name = name;

    this._sessionID = null;
    this._lastSequence = null;

    this._identifyTimestamp = null;

    autoBind(this);
  }

  connect (url) {
    if (!this._url) {
      this._url = url;
    }

    this._websocket = new WebSocket(this._url);

    this._websocket.on('open', () => {
      this._onOpen();
    });

    this._websocket.on('close', (code, reason) => {
      this._onClose(code, reason);
    });

    this._websocket.on('error', (err) => {
      this._onError(err);
    });

    this._websocket.on('message', (e) => {
      this._onMessage(JSON.parse(e));
    });
  }

  _onOpen () {
    console.log('Gateway Opened');
  }

  _onClose (code, reason) {
    console.log(`Gateway Closed: ${code} ${reason}`.trim());

    if (code === 1000 || UNRECOVERABLE_CODES.includes(code)) {
      console.error('Unrecoverable: ' + code);
      process.exit();
    }

    if (code === 4006) {
      console.log('Cannot Resume on Code 4006');
      this.session_id = null;
    }

    this.connect();
  }

  _onError (err) {
    console.warn(`Gateway Error: ${err}`);
  }

  _onMessage (msg) {
    if (msg.op === 0) {
      console.log(`Received [${msg.op}] - ${msg.t}`);
    } else {
      console.log(`Received [${msg.op}]`);
    }

    if (Object.prototype.hasOwnProperty.call(msg, 's')) {
      this._lastSequence = msg.s;
    }

    switch (msg.op) {
      case 0: // Dispatch
        this._onDispatchMessage(msg);
        break;
      case 1: // Heartbeat
        this.sendHeartbeat();
        break;
      case 7: // Reconnect
        this.disconnect(1001);
        break;
      case 9: // Invalid Session
        console.warn('Invalid Session');

        if (msg.d) {
          setTimeout(this.sendResumePayload, 5000);
          return;
        }

        this._sessionID = null;
        this.disconnect(1001);
        break;
      case 10: // Hello
        this._heartbeatInterval = setInterval(this.sendHeartbeat, msg.d.heartbeat_interval);
        this.sendIdentifyPayload();
        break;
      case 11:
        this._heartbeatACK = true;
        break;
      default:
        console.warn(`No case for Opcode ${msg.op}: ${msg}`);
    }
  }

  _onDispatchMessage (msg) {
    switch (msg.t) {
      case 'READY':
        if (this._sessionID === null) {
          this._sessionID = msg.d.session_id;
          break;
        }

        console.log('Resuming');
        this.sendResumePayload();
        break;
      case 'RESUMED':
        this._sessionID = msg.d.session_id;
        break;
      default:
        this.emit(msg.t, msg);
    }
  }

  disconnect (code, reason = '') {
    if (this._websocket === undefined) {
      return;
    }

    clearInterval(this._heartbeatInterval);
    this._websocket.close(code, reason);
  }

  sendPayload (op, data, sequence, type) {
    if (sequence === undefined) {
      sequence = null;
    }

    if (type === undefined) {
      type = null;
    }

    const msg = JSON.stringify({
      op: op,
      d: data,
      s: sequence,
      t: type
    });

    this._websocket.send(msg);
    console.log(`Sent [${op}]`);
  }

  sendIdentifyPayload () {
    if (!this._identifyTimestamp && (Date.now() - this._identifyTimestamp) < 5000) {
      setTimeout(this.sendIdentifyPayload, 5000);
      return;
    }

    this._identityTimestamp = Date.now();

    const data = {
      token: this._token,
      properties: {
        $os: this._os,
        $browser: this._name,
        $device: this._name
      }
    };

    this.sendPayload(2, data);
  }

  sendResumePayload () {
    const data = {
      token: this._token,
      session_id: this._session_id,
      seq: this._lastSequence
    };

    this.sendPayload(6, data);
  }

  sendHeartbeat () {
    if (this._heartbeatACK !== undefined && this._heartbeatACK === false) {
      clearInterval(this._heartbeatInterval);

      this.disconnect(4000, 'No Heartbeat ACK');
      console.log('Closed: No Heartbeat ACK');
      return;
    }

    this._heartbeatACK = false;
    this.sendPayload(1, this._lastSequence);
  }
}

module.exports = WebSocketClient;
