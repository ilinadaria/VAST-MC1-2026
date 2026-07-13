window.VastApp = window.VastApp || {};

window.VastApp.stockPriceChart = {
  init() {
    this.container =
      document.getElementById("stockPriceChart");

    if (!this.container) return;

    this.renderLegend();
    this.render();

    window.addEventListener(
      "resize",
      window.VastApp.utils.debounce(
        () => this.render(),
        120
      )
    );
  },

  getPrice(round) {
    const raw =
      round.environment_context
        ?.market_snapshot
        ?.stock_price;

    if (raw === null || raw === undefined) {
      return null;
    }

    const value = Number(
      String(raw).replace(/[^0-9.-]/g, "")
    );

    return Number.isFinite(value)
      ? value
      : null;
  },

  getData() {
    return (window.VAST_DATA?.rounds || [])
      .map((round, roundIndex) => ({
        round,
        roundIndex,
        price: this.getPrice(round),
        sentiment: String(
          round.environment_context
            ?.market_snapshot
            ?.sentiment || "unknown"
        ).toLowerCase()
      }));
  },

  renderLegend() {
    const container =
      document.getElementById(
        "stockSentimentLegend"
      );

    if (!container) {
      return;
    }

    const sentiments = [
      ["neutral", "Neutral"],
      ["cautious", "Cautious"],
      ["negative", "Negative"],
      ["critical", "Critical"],
      ["recovering", "Recovering"],
      ["low", "Low"]
    ];

    const items =
      sentiments.map(([key, label]) => {
        const item =
          document.createElement("span");

        item.className =
          "stock-sentiment-legend-item";

        const swatch =
          document.createElement("span");

        swatch.className =
          `stock-sentiment-swatch sentiment-${key}`;

        item.append(
          swatch,
          document.createTextNode(label)
        );

        return item;
      });

    container.replaceChildren(...items);
  },

  render() {
    const app = window.VastApp;
    const data = this.getData();

    if (!this.container || !data.length) {
      return;
    }

    const width = Math.max(
      260,
      this.container.clientWidth || 420
    );

    const height = Math.max(
      90,
      this.container.clientHeight || 100
    );

    const margin = {
      top: 8,
      right: 7,
      bottom: 14,
      left: 27
    };

    const plotWidth =
      width - margin.left - margin.right;

    const plotHeight =
      height - margin.top - margin.bottom;

    const prices = data
      .filter(item => item.price !== null)
      .map(item => item.price);

    const minimum =
      prices.length
        ? Math.min(...prices)
        : 0;

    const maximum =
      prices.length
        ? Math.max(...prices)
        : 1;

    const padding =
      maximum === minimum
        ? Math.max(1, Math.abs(maximum) * 0.03)
        : (maximum - minimum) * 0.12;

    const yMinimum = minimum - padding;
    const yMaximum = maximum + padding;

    const xFor = index =>
      margin.left +
      (
        index /
        Math.max(1, data.length - 1)
      ) * plotWidth;

    const yFor = price =>
      margin.top +
      (
        1 -
        (
          price - yMinimum
        ) /
        Math.max(0.0001, yMaximum - yMinimum)
      ) * plotHeight;

    const svg = app.utils.createSvg(
      "svg",
      {
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: "none"
      }
    );

    [0, 0.5, 1].forEach(ratio => {
      const y = margin.top + ratio * plotHeight;

      svg.append(
        app.utils.createSvg(
          "line",
          {
            x1: margin.left,
            y1: y,
            x2: width - margin.right,
            y2: y,
            class: "stock-price-grid-line"
          }
        )
      );

      const value =
        yMaximum -
        ratio * (yMaximum - yMinimum);

      const label =
        app.utils.createSvg(
          "text",
          {
            x: margin.left - 4,
            y: y + 2,
            class:
              "stock-price-value-label"
          }
        );

      label.textContent =
        value.toFixed(0);

      svg.append(label);
    });

    let drawing = false;

    const path = data
      .map((item, index) => {
        if (item.price === null) {
          drawing = false;
          return "";
        }

        const command =
          drawing ? "L" : "M";

        drawing = true;

        return (
          `${command} ` +
          `${xFor(index)} ` +
          `${yFor(item.price)}`
        );
      })
      .filter(Boolean)
      .join(" ");

    if (path) {
      svg.append(
        app.utils.createSvg(
          "path",
          {
            d: path,
            class: "stock-price-line"
          }
        )
      );
    }

    const bandWidth =
      plotWidth / Math.max(1, data.length);

    data.forEach((item, index) => {
      const centerX = xFor(index);

      const left =
        index === 0
          ? margin.left
          : (
              xFor(index - 1) +
              centerX
            ) / 2;

      const right =
        index === data.length - 1
          ? width - margin.right
          : (
              centerX +
              xFor(index + 1)
            ) / 2;

      const band =
        app.utils.createSvg(
          "rect",
          {
            x: left,
            y: margin.top,
            width: Math.max(1, right - left),
            height: plotHeight,
            class:
              `stock-sentiment-band ` +
              `sentiment-${item.sentiment}`,
            tabindex: 0,
            role: "button",
            "data-round-index":
              item.roundIndex,
            "aria-label":
              `Round ${item.roundIndex + 1}, ` +
              `sentiment ${item.sentiment}`
          }
        );

      band.addEventListener(
        "mouseenter",
        event =>
          this.showTooltip(event, item)
      );

      band.addEventListener(
        "mousemove",
        event =>
          this.moveTooltip(event)
      );

      band.addEventListener(
        "mouseleave",
        () => this.hideTooltip()
      );

      band.addEventListener(
        "click",
        () =>
          this.selectRound(
            item.roundIndex
          )
      );

      band.addEventListener(
        "keydown",
        event => {
          if (
            event.key !== "Enter" &&
            event.key !== " "
          ) {
            return;
          }

          event.preventDefault();
          this.selectRound(
            item.roundIndex
          );
        }
      );

      svg.insertBefore(
        band,
        svg.firstChild
      );

      if (
        data.length <= 24 ||
        index % 2 === 0
      ) {
        const label =
          app.utils.createSvg(
            "text",
            {
              x: centerX,
              y: height - 3,
              class:
                "stock-price-round-label"
            }
          );

        label.textContent =
          `R${item.roundIndex + 1}`;

        svg.append(label);
      }
    });

    this.container.replaceChildren(svg);
    this.updateSelection(app.state.roundIndex);
  },

  selectRound(roundIndex) {
    const app = window.VastApp;

    app.state.roundIndex = roundIndex;
    app.elements.roundSelect.value =
      String(roundIndex);

    app.state.selectedMessageId = null;
    app.state.replyTargets = new Map();

    app.details.render(null);
    app.app.renderRound();
  },

  updateSelection(roundIndex) {
    this.container
      ?.querySelectorAll(".stock-sentiment-band")
      .forEach(point => {
        point.classList.toggle(
          "selected-round",
          Number(point.dataset.roundIndex) === roundIndex
        );
      });
  },

  ensureTooltip() {
    let tooltip =
      document.getElementById("stockPriceTooltip");

    if (tooltip) return tooltip;

    tooltip = document.createElement("div");
    tooltip.id = "stockPriceTooltip";
    tooltip.className = "stock-price-tooltip";
    tooltip.hidden = true;

    document.body.append(tooltip);
    return tooltip;
  },

  showTooltip(event, item) {
    const tooltip = this.ensureTooltip();

    const market =
      item.round.environment_context
        ?.market_snapshot || {};

    tooltip.innerHTML = `
      <strong>Round ${item.roundIndex + 1}</strong>
      <span>
        Stock price:
        ${window.VastApp.utils.escapeHtml(
          market.stock_price ??
          item.price ??
          "Not reported"
        )}
      </span>
      <span>
        Change:
        ${window.VastApp.utils.escapeHtml(
          market.percent_change ?? "—"
        )}
      </span>
      <span>
        Sentiment:
        ${window.VastApp.utils.escapeHtml(
          item.sentiment
        )}
      </span>
    `;

    tooltip.hidden = false;
    this.moveTooltip(event);
  },

  moveTooltip(event) {
    const tooltip = this.ensureTooltip();

    tooltip.style.left = `${Math.min(
      event.clientX + 12,
      window.innerWidth - tooltip.offsetWidth - 8
    )}px`;

    tooltip.style.top = `${Math.min(
      event.clientY + 12,
      window.innerHeight - tooltip.offsetHeight - 8
    )}px`;
  },

  hideTooltip() {
    const tooltip =
      document.getElementById("stockPriceTooltip");

    if (tooltip) tooltip.hidden = true;
  }
};
