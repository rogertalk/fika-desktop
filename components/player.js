const React = require('react');

const e = React.createElement;

module.exports = class Player extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chunk: props.chunks[0],
      paused: !this.props.store.autoplay,
    };
    this.playbackEnded = this.playbackEnded.bind(this);
    this.playbackPaused = this.playbackPaused.bind(this);
    this.playbackStarted = this.playbackStarted.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const chunk = this.state.chunk && nextProps.chunks.find(c => c.id === this.state.chunk.id) || nextProps.chunks[0];
    this.setState({chunk});
  }

  playbackEnded() {
    const chunk = this.state.chunk;
    if (!chunk) return;
    this.props.onPlayedChunk(chunk);
    const index = this.props.chunks.findIndex(c => c.id === chunk.id);
    if (index === -1 || index >= this.props.chunks.length - 1) {
      this.props.onPlaybackComplete();
      return;
    }
    this.setState({chunk: this.props.chunks[index + 1]});
  }

  playbackPaused(e) {
    if (e.target.ended) return;
    this.setState({paused: true});
  }

  playbackStarted(e) {
    this.setState({audioOnly: !e.target.videoWidth, paused: false});
  }

  render() {
    if (!this.state.chunk) {
      return e('div', {className: 'player'}, null);
    }
    const style = {};
    if (this.state.audioOnly) {
      const sender = this.props.store.getSenderForStreamChunk(this.props.store.selectedStream, this.state.chunk);
      style.backgroundImage = `url(${sender.image_url})`;
      style.filter = 'blur(10px)';
    }
    if (this.state.paused) {
      style.filter = 'blur(10px)';
    }
    return e('div', {className: 'player'}, [
      e('video', {
        autoPlay: !this.state.paused,
        onClick: (e) => e.target.paused ? e.target.play() : e.target.pause(),
        onEnded: this.playbackEnded,
        onPause: this.playbackPaused,
        onPlaying: this.playbackStarted,
        src: this.state.chunk.url,
        style,
      }, null),
      this.state.paused ? e('span', {className: 'play-icon'}, '▶') : null,
    ]);
  }
};
