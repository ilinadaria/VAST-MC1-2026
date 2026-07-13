window.VastApp = window.VastApp || {};

window.VastApp.app = {
  async init() {
    const app = window.VastApp;

    try {
      const dataResponse = await fetch("./data.json");

      if (!dataResponse.ok) {
        throw new Error("Could not load data.json");
      }

      window.VAST_DATA = await dataResponse.json();
      await app.messageImportance.load();
    } catch (error) {
      console.error(error);

      if (app.elements.timeline) {
        app.elements.timeline.textContent =
          "Could not load dashboard data.";
      }
      return;
    }

    if (!window.VAST_DATA?.rounds?.length) {
      app.elements.timeline.textContent =
        "No rounds found in the dataset.";
      return;
    }

    app.controls.populateRoundSelect();
    app.controls.renderLegend();
    app.controls.bindMessageFilter();
    app.messageSearch?.init();
    app.stockPriceChart?.init();
    app.overallActivity?.render();
    app.internalStateHeatmap?.render();

    this.bindEvents();
    this.renderRound();
  },

  bindEvents() {
    const app = window.VastApp;

    app.elements.roundSelect.addEventListener(
      "change",
      event => {
        app.state.roundIndex = Number(event.target.value);
        app.state.selectedMessageId = null;
        app.state.replyTargets = new Map();

        app.details.render(null);
        this.renderRound();
      }
    );

    window.addEventListener(
      "resize",
      app.utils.debounce(
        () => this.renderRound(),
        app.CONFIG.resizeDebounceMs
      )
    );
  },

  renderRound() {
    const app = window.VastApp;
    const round = window.VAST_DATA.rounds[app.state.roundIndex];

    if (!round) return;

    app.timelineRenderer.render(round);
    app.controls.renderRoundInfo(round);
    app.stockPriceChart?.updateSelection(
      app.state.roundIndex
    );
    app.agentActivity?.render(app.state.roundIndex);
  }
};

window.VastApp.app.init();
