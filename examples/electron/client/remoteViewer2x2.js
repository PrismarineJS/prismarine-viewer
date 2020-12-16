const RemoteViewer = require("./remoteViewer");

class RemoteViewer2x2 {
  constructor(hosts) {
    this.viewers = []
    for (let host of hosts) {
      this.viewers.push(new RemoteViewer(host))
    }
  }

  start() {
    for (var viewer of viewers) {
      host.start()
    }
  }
}