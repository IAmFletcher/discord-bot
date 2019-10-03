const EventEmitter = require('events');
const WebSocket = require('ws');

class WebSocketClient extends EventEmitter {
  constructor (token, os, name) {
    super();

    this._token = token;
    this._os = os;
    this._name = name;

    this._session_id = null;
    this._lastSequence = null;

    this.sendHeartbeat = this.sendHeartbeat.bind(this);
  }

  connect (url) {
    this._websocket = new WebSocket(url);

    this._websocket.on('open', () => {
      console.log('Gateway Opened');
    });

    this._websocket.on('close', (code, reason) => {
      console.log(`Gateway Closed: ${code} ${reason}`);
    });

    this._websocket.on('error', (err) => {
      throw err;
    });

    this._websocket.on('message', (e) => {
      const msg = JSON.parse(e);

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
          if (msg.t === 'READY') {
            if (this._session_id === null) {
              this._session_id = msg.d._session_id;
              return;
            }

            console.log('Resuming');
            this.sendPayload(6, { token: this._token, session_id: this._session_id, seq: this._lastSequence });
            return;
          }

          if (msg.t === 'RESUMED') {
            this._session_id = msg.d._session_id;
            return;
          }

          this.emit(msg.t, msg);
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
        case 11: // Heartbeat ACK
          this._heartbeatACK = true;
          break;
        default:
      }
    });
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
