const EventEmitter = require('events');
const WebSocket = require('ws');
const autoBind = require('auto-bind');

class WebSocketClient extends EventEmitter {
  constructor (token, os, name) {
    super();

    this._token = token;
    this._os = os;
    this._name = name;

    this._sessionID = null;
    this._lastSequence = null;

    autoBind(this);
  }

  connect (url) {
    this._websocket = new WebSocket(url);

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
        break;
      case 7: // Reconnect
        break;
      case 9: // Invalid Session
        console.warn('Invalid Session');
        setTimeout(this.sendIdentityPayload, 5000);
        break;
      case 10: // Hello
        this._heartbeatInterval = setInterval(this.sendHeartbeat, msg.d.heartbeat_interval);
        this.sendIdentityPayload();
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

  disconnect () {
    if (this._websocket === undefined) {
      return;
    }

    clearInterval(this._heartbeatInterval);
    this._websocket.close();
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

  sendIdentityPayload () {
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

      this._websocket.close(4000, 'No Heartbeat ACK');
      console.log('Closed: No Heartbeat ACK');
      return;
    }

    this._heartbeatACK = false;
    this.sendPayload(1, this._lastSequence);
  }
}

module.exports = WebSocketClient;
