const electron = require('electron');
const React = require('react');

const e = React.createElement;

const Camera = require('./camera');
const LogIn = require('./login');
const Player = require('./player');

module.exports = class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      requestedCode: false,
      working: false,
    };
    this.handleLogin = this.handleLogin.bind(this);
  }

  handleLogin(email, code) {
    if (!code) {
      this.setState({working: true});
      this.props.store.requestCode(email)
        .then(() => this.setState({requestedCode: true, working: false}))
        .catch(error => {
          if (error.code === 403) {
            alert('Fika is not available for that email domain.');
          } else {
            alert('Sorry, it looks like something went wrong. Please try again.');
          }
          this.setState({working: false});
        });
    } else {
      this.setState({working: true});
      this.props.store.verifyCode(email, code)
        .then(() => this.setState({working: false}));
    }
  }

  render() {
    const store = this.props.store;
    if (!store.session) {
      return e(LogIn, {
        disabled: this.state.working,
        onBackClick: () => this.setState({requestedCode: false}),
        onLoginRequest: this.handleLogin,
        requestedCode: this.state.requestedCode,
      }, null);
    }
    if (!store.windowVisible) {
      // Don't play/record while window is hidden.
      return e('div', {className: 'closed'}, null);
    }
    const stream = store.selectedStream;
    const chunks = store.unplayedChunks;
    if (chunks.length > 0) {
      return e(Player, {
        chunks,
        onPlaybackComplete: () => {},
        onPlayedChunk: c => store.setPlayedUntil(stream.id, c.end),
        store,
      }, null);
    }
    return e(Camera, {
      onChunk: c => store.sendChunk(stream.id, c.blob, c.duration),
      onStreamClick: s => store.update({selectedStreamId: s.id}),
      store,
    }, null);
  }
};
