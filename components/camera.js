const electron = require('electron');
const React = require('react');

const e = React.createElement;

function getCameraConstraints() {
  return Promise.resolve({audio: true, video: {facingMode: 'user'}});
}

function getScreenConstraints() {
  return new Promise((resolve, reject) => {
    electron.desktopCapturer.getSources({types: ['screen']}, (error, sources) => {
      if (error) {
        reject(error);
      } else if (sources.length < 1) {
        reject(new Error('Could not get screen for capture'));
      } else {
        // TODO: Support for multiple screens.
        resolve({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sources[0].id,
            }
          }
        });
      }
    });
  });
}

module.exports = class Camera extends React.Component {
  constructor(props) {
    super(props);

    this.chunks = [];
    this.mounted = false;
    this.recorder = null;
    this.recorderStart = null;
    this.videoStream = null;

    this.state = {
      presenting: false,
      recording: false,
      videoURL: null,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.setUpCapture();
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.state.recording) this.toggleRecording();
    this.stopCapture();
  }

  render() {
    // TODO: Separate out header and hover menu from this component.
    const store = this.props.store;
    return e('div', {className: this.state.recording ? 'camera recording' : 'camera'}, [
      e('video', {autoPlay: true, muted: true, src: this.state.videoURL}, null),
      e('header', null, [
        e('div', {className: 'hovermenu'}, [
          e('span', {className: 'title'}, store.selectedStreamTitle),
          e('ul', null, store.streams.map(s => {
            const classList = [];
            if (s.id === store.selectedStream.id) classList.push('active');
            if (!store.getStreamPlayed(s)) classList.push('new');
            return e('li', {
              className: classList.join(' '),
              key: s.id,
              onClick: e => this.props.onStreamClick(s),
            }, store.getStreamTitle(s));
          })),
        ]),
      ]),
      e('button', {className: 'record', onClick: () => this.toggleRecording()}, null),
    ]);
  }

  setUpCapture() {
    this.stopCapture();
    (this.state.presenting ? getDesktopConstraints() : getCameraConstraints())
      .then(c => navigator.mediaDevices.getUserMedia(c))
      .then(stream => {
        this.stopCapture();
        if (!this.mounted) return;
        this.videoStream = stream;
        this.setState({videoURL: URL.createObjectURL(stream)});
      });
  }

  stopCapture() {
    if (!this.videoStream) return;
    this.videoStream.getTracks().forEach(t => t.stop());
    this.videoStream = null;
  }

  toggleRecording() {
    if (this.state.recording) {
      this.recorder.stop();
      this.props.onChunk({
        blob: new Blob(this.chunks, {type: 'video/webm'}),
        duration: Date.now() - this.recorderStart,
      });
      this.chunks = [];
      this.recorder = null;
      this.recorderStart = null;
      this.setState({recording: false});
    } else {
      this.recorder = new MediaRecorder(this.videoStream, {mimeType: 'video/webm;codecs=vp9'});
      this.recorder.addEventListener('dataavailable', e => {
        if (!e.data.size) return;
        this.chunks.push(e.data);
      });
      this.recorder.start();
      this.recorderStart = Date.now();
      this.setState({recording: true});
    }
  }
};
