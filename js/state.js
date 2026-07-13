window.VastApp = window.VastApp || {};

window.VastApp.state = {
  roundIndex: 0,
  selectedMessageId: null,
  replyTargets: new Map()
};

window.VastApp.elements = {
  roundSelect: document.querySelector("#roundSelect"),
  timeline: document.querySelector("#timeline"),
  messageDetails: document.querySelector("#messageDetails"),
  legend: document.querySelector("#timelineLegend"),
  tooltip: document.querySelector("#tooltip")
};
