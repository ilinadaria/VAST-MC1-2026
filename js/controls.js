window.VastApp = window.VastApp || {};

window.VastApp.controls = {
  populateRoundSelect() {
    const app = window.VastApp;

    const options = window.VAST_DATA.rounds.map((round, index) => {
      const option = document.createElement("option");

      option.value = String(index);
      option.textContent =
        app.dataHelpers.formatRoundLabel(round, index);

      return option;
    });

    app.elements.roundSelect.replaceChildren(...options);
  },

  renderLegend() {
    const app = window.VastApp;

    const items = app.LEGEND_CHANNELS.map(channel => {
      const style = app.dataHelpers.getChannelStyle(channel);
      const item = document.createElement("span");

      item.className = "legend-item";

      const dot = document.createElement("span");

      dot.className = "legend-dot";
      dot.style.background = style.color;

      item.append(
        dot,
        document.createTextNode(style.label)
      );

      return item;
    });

    app.elements.legend.replaceChildren(...items);
  },

  bindMessageFilter() {
    const app = window.VastApp;
    const filterSelect =
      document.getElementById("messageFilter");

    if (!filterSelect) {
      return;
    }

    filterSelect.addEventListener("change", () => {
      app.app.renderRound();
    });
  },

  renderRoundInfo(round) {
    const element = document.getElementById("roundInfo");

    if (!element) return;

    const market =
      round.environment_context?.market_snapshot || {};

    const sentimentDescriptions = {
      neutral: "No strong positive or negative market reaction",
      cautious: "Investors appear uncertain or concerned",
      negative: "The market reaction is unfavorable",
      critical: "The market reaction is severely negative",
      recovering: "Market sentiment is improving",
      low: "Current market concern is limited"
    };

    const sentiment = String(
      market.sentiment || "unknown"
    ).toLowerCase();

    const sentimentSymbols = {
      neutral: "😐",
      cautious: "😬",
      negative: "📉",
      critical: "🚨",
      recovering: "📈",
      low: "😌",
      unknown: "❓"
    };

    element.replaceChildren();

    const priceGroup = document.createElement("div");
    priceGroup.className = "round-metric";

    const priceLabel = document.createElement("span");
    priceLabel.className = "round-metric-label";
    priceLabel.textContent = "Stock price";

    const priceValue = document.createElement("span");
    priceValue.className = "round-metric-value";
    priceValue.textContent = market.stock_price || "—";

    priceGroup.append(priceLabel, priceValue);

    const changeGroup = document.createElement("div");
    changeGroup.className = "round-metric";

    const changeLabel = document.createElement("span");
    changeLabel.className = "round-metric-label";
    changeLabel.textContent = "Price change";

    const changeValue = document.createElement("span");
    changeValue.className = "round-metric-value";
    changeValue.textContent = market.percent_change || "—";

    changeGroup.append(changeLabel, changeValue);

    const sentimentGroup = document.createElement("div");
    sentimentGroup.className = "round-metric round-sentiment";

    const sentimentLabel = document.createElement("span");
    sentimentLabel.className = "round-metric-label";
    sentimentLabel.textContent = "Market sentiment";

    const sentimentRow = document.createElement("div");
    sentimentRow.className = "round-sentiment-value";

    const sentimentArrow = document.createElement("span");
    sentimentArrow.className =
      "sentiment-arrow sentiment-" + sentiment;
    sentimentArrow.textContent =
      sentimentSymbols[sentiment] || "?";

    const sentimentValue = document.createElement("span");
    sentimentValue.className = "round-metric-value";
    sentimentValue.textContent = sentiment;

    const description = document.createElement("span");
    description.className = "round-metric-description";
    description.textContent =
      sentimentDescriptions[sentiment] ||
      "No description available";

    sentimentRow.append(
      sentimentArrow,
      sentimentValue
    );

    sentimentGroup.append(
      sentimentLabel,
      sentimentRow,
      description
    );

    element.append(
      priceGroup,
      changeGroup,
      sentimentGroup
    );
  },
};
