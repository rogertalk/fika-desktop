const React = require('react');

const e = React.createElement;

module.exports = class LogIn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {email: '', code: ''};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(e) {
    if (!e.target.name) return;
    this.setState({[e.target.name]: e.target.value});
  }

  render() {
    if (!this.props.requestedCode) {
      return e('form', {className: 'log-in stage-1', onSubmit: this.handleSubmit}, [
        e('p', null, 'Enter your work email:'),
        e('p', null, e('input', {autoFocus: true, disabled: this.props.disabled, key: 'email', name: 'email', onChange: this.handleChange, placeholder: 'jane.doe@example.com', value: this.state.email}, null)),
        e('p', null, e('button', {disabled: this.props.disabled, type: 'submit'}, 'Request code')),
      ]);
    } else {
      return e('form', {className: 'log-in stage-2', onSubmit: this.handleSubmit}, [
        e('div', {className: 'back', onClick: this.props.onBackClick}, [
          e('img', {src: 'back.svg'}, null),
          e('span', null, 'Back'),
        ]),
        e('p', null, `We sent a code to ${this.state.email}.`),
        e('p', null, e('input', {autoFocus: true, disabled: this.props.disabled, key: 'code', name: 'code', onChange: this.handleChange, placeholder: '123456', value: this.state.code}, null)),
        e('p', null, e('button', {disabled: this.props.disabled, type: 'submit'}, 'Verify')),
      ]);
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    this.props.onLoginRequest(this.state.email, this.state.code);
  }
};
