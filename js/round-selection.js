window.VastApp = window.VastApp || {};

window.VastApp.roundSelection = {
  select(roundIndex, options = {}) {
    const app = window.VastApp;
    const rounds = window.VAST_DATA?.rounds || [];
    const index = Number(roundIndex);
    const toggle = options.toggle !== false;

    if (!Number.isInteger(index) || !rounds[index]) {
      return;
    }

    const alreadyHighlighted =
      app.state.highlightedRoundIndex === index;

    if (toggle && alreadyHighlighted) {
      app.state.highlightedRoundIndex = null;
      this.updateHighlights(null);
      return;
    }

    app.state.roundIndex = index;
    app.state.highlightedRoundIndex = index;
    app.state.selectedMessageId = null;
    app.state.replyTargets = new Map();

    if (app.elements.roundSelect) {
      app.elements.roundSelect.value = String(index);
    }

    app.details.render(null);
    app.app.renderRound();

    if (options.scrollToTimeline) {
      app.elements.timeline?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  },

  updateHighlights(roundIndex) {
    const app = window.VastApp;

    app.stockPriceChart?.updateSelection(roundIndex);
    app.overallActivity?.updateSelection(roundIndex);
    app.internalStateHeatmap?.updateSelection(roundIndex);
    app.trendingHashtags?.updateSelection(roundIndex);
  }
};
