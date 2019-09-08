const electron = require('electron');
const React = require('react');
const ReactDOM = require('react-dom');

const {Store} = require('./lib/store');

const App = require('./components/app');

const store = new Store();

let lastUnplayedCount = 0;
let sessionAccount;
store.on('update', () => {
  localStorage.data = JSON.stringify(store);
  ReactDOM.render(React.createElement(App, {store}, null), document.getElementById('root'));
  // Let the main process know about changes to the logged in account.
  let newSessionAccount = store.session ? store.session.account : null;
  if (newSessionAccount !== sessionAccount) {
    sessionAccount = newSessionAccount;
    electron.ipcRenderer.send('status', 'sessionAccount', sessionAccount);
  }
  // Show the app when there is new unplayed content.
  // TODO: Only when autoplay is enabled?
  const chunks = store.unplayedChunks;
  if (chunks.length > lastUnplayedCount) {
    electron.ipcRenderer.send('control', 'show');
  } else if (chunks.length === 0 && !store.windowVisible) {
    // Try to select another unplayed stream if current stream is played.
    // Note that we only do this while window is hidden to avoid confusion.
    for (let i = store.streams.length - 1; i >= 0; i--) {
      const stream = store.streams[i];
      if (store.getUnplayedChunksForStream(stream).length > 0) {
        store.update({selectedStreamId: stream.id});
        break;
      }
    }
  }
  lastUnplayedCount = chunks.length;
});

store.update('data' in localStorage ? JSON.parse(localStorage.data) : {});

if (!store.session) {
  // The user is not logged in, so pop up the window.
  electron.ipcRenderer.send('control', 'show');
}

// Set initial autoplay state.
if (!store.hasOwnProperty('autoplay')) store.update({autoplay: true});
electron.ipcRenderer.send('control', store.autoplay ? 'enableAutoplay' : 'disableAutoplay');

// Enable main thread to control the app state.
electron.ipcRenderer.on('control', (event, action) => {
  switch (action) {
  case 'logOut':
    store.logOut();
    break;
  }
});

// Pass on app status updates to the UI.
electron.ipcRenderer.on('status', (event, status, value) => {
  switch (status) {
  case 'autoplay':
    store.update({autoplay: value});
    break;
  case 'visible':
    store.update({windowVisible: value});
    break;
  }
});

// Request streams every 30 seconds.
function requestStreams() {
  if (store.session) store.getStreams();
}

requestStreams();
setInterval(requestStreams, 30000);
