const EventEmitter = require('events');

const v = 'v31';

exports.Store = class Store extends EventEmitter {
  constructor(state = {}) {
    super();
    Object.assign(this, state);
    // These properties should not be persisted.
    Object.defineProperties(this, {
      inFlightRequests: {value: new Map()},
      scheduledUpdate: {value: false, writable: true},
      windowVisible: {value: false, writable: true},
    });
  }

  get(endpoint, options) {
    return this.request(endpoint, Object.assign({}, options, {method: 'GET'}));
  }

  post(endpoint, options) {
    return this.request(endpoint, Object.assign({}, options, {method: 'POST'}));
  }

  request(endpoint, {body, chainKey, form, method = 'GET', qs} = {}) {
    if (body && form) {
      throw new Error('Cannot handle both body and form arguments');
    }
    const headers = {'User-Agent': 'FikaDesktop/1'};
    if (this.session) {
      headers['Authorization'] = `Bearer ${this.session.access_token}`;
    }
    if (form) {
      body = new FormData();
      for (let key in form) {
        body.set(key, form[key]);
      }
    }
    let input = `https://api.rogertalk.com${endpoint}`;
    if (qs) {
      let first = true;
      for (let key in qs) {
        input += `${first ? '?' : '&'}${encodeURIComponent(key)}=${encodeURIComponent(qs[key])}`;
        first = false;
      }
    }
    const start = () => fetch(input, {body, method, headers})
      .then(response => response.json().then(data => ({response, data})))
      .then(({response, data}) => {
        if (!response.ok) throw {code: response.status, message: data.error.message};
        return data;
      });
    if (chainKey !== undefined) {
      // Chain requests with the same chain key to ensure they execute in sequence.
      const p = Promise.resolve(this.inFlightRequests.get(chainKey)).then(start, start);
      this.inFlightRequests.set(chainKey, p);
      return p;
    } else {
      return start();
    }
  }

  toJSON() {
    const copy = Object.assign({}, this);
    delete copy['domain'];
    delete copy['_events'];
    delete copy['_eventsCount'];
    return copy;
  }

  update(newValues) {
    Object.assign(this, newValues);
    if (this.scheduledUpdate) return;
    this.scheduledUpdate = true;
    process.nextTick(() => {
      this.scheduledUpdate = false;
      this.emit('update');
    });
  }

  // Business logic.

  get selectedStream() {
    if (!this.streams) return null;
    const selection = this.streams.find(s => s.id === this.selectedStreamId);
    return selection || (this.streams.length > 0 ? this.streams[0] : null);
  }

  get selectedStreamTitle() {
    const stream = this.selectedStream;
    return stream ? this.getStreamTitle(stream) : '';
  }

  get unplayedChunks() {
    const stream = this.selectedStream;
    return stream ? this.getUnplayedChunksForStream(stream) : [];
  }

  getSenderForStreamChunk(stream, chunk) {
    if (chunk.sender_id === this.session.account.id) return this.session.account;
    return stream.others.find(a => a.id === chunk.sender_id);
  }

  getStreamById(streamId) {
    return this.streams.find(s => s.id === streamId);
  }

  getStreamPlayed(stream) {
    for (let i = stream.chunks.length - 1; i >= 0; i--) {
      if (stream.chunks[i].sender_id === this.session.account.id) continue;
      return stream.played_until >= stream.chunks[i].end;
    }
    return true;
  }

  getStreamTitle(stream) {
    return (
      stream.title ||
      stream.others.map(a => a.display_name).join(', ') ||
      `${this.session.account.display_name} (you)`);
  }

  getUnplayedChunksForStream(stream) {
    return stream.chunks.filter(c => c.sender_id != this.session.account.id && c.end > stream.played_until);
  }

  logOut() {
    this.update({session: null, streams: []});
  }

  updateStream(stream) {
    this.update({streams: this.streams.map(s => s.id === stream.id ? stream : s)});
  }

  // API endpoints.

  getStreams() {
    return this.get(`/${v}/streams`)
      .then(result => {
        this.update({streams: result.data});
        return result;
      });
  }

  requestCode(email) {
    return this.post(`/${v}/challenge`, {qs: {identifier: email}});
  }

  sendChunk(streamId, blob, duration) {
    const form = new FormData();
    form.set('payload', blob, 'video.webm');
    return this.post(`/${v}/streams/${streamId}/chunks`, {body: form, chainKey: streamId, qs: {duration}})
      .then(result => {
        this.updateStream(result);
        return result;
      });
  }

  setPlayedUntil(streamId, playedUntil) {
    const localStream = this.getStreamById(streamId);
    if (localStream) {
      // Simulate a local update before updating the backend.
      const newStream = Object.assign({}, localStream);
      newStream.played_until = playedUntil;
      this.updateStream(newStream);
    }
    return this.post(`/${v}/streams/${streamId}`, {qs: {played_until: playedUntil}})
      .then(result => {
        this.updateStream(result);
        return result;
      });
  }

  verifyCode(email, code) {
    return this.post(`/${v}/challenge/respond`, {form: {secret: code}, qs: {identifier: email}})
      .then(result => {
        this.update({session: result, streams: result.streams});
        return result;
      });
  }
};
