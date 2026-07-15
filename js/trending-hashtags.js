window.VastApp = window.VastApp || {};

window.VastApp.trendingHashtags = {
  render() {
    const target =
      document.getElementById(
        "trendingHashtags"
      );

    if (!target) {
      return;
    }

    const rounds =
      window.VAST_DATA?.rounds || [];

    const hashtags =
      this.collectHashtags(rounds);

    if (!hashtags.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "hashtag-matrix-empty";

      empty.textContent =
        "No trending hashtags recorded.";

      target.replaceChildren(empty);
      return;
    }

    const matrix =
      document.createElement("div");

    matrix.className =
      "hashtag-matrix";

    matrix.style.gridTemplateColumns =
      `74px repeat(${Math.max(1, rounds.length)}, minmax(0, 1fr))`;

    hashtags.forEach(item => {
      matrix.append(
        this.createLabel(item.tag)
      );

      rounds.forEach(
        (round, roundIndex) => {
          matrix.append(
            this.createCell(
              item,
              round,
              roundIndex
            )
          );
        }
      );
    });

    target.replaceChildren(matrix);
    target.scrollLeft = 0;
    target.scrollTop = 0;

    this.ensureTooltip();

    this.updateSelection(
      window.VastApp.state
        .highlightedRoundIndex
    );
  },

  collectHashtags(rounds) {
    const byTag =
      new Map();

    rounds.forEach(
      (round, roundIndex) => {
        const tags =
          round.environment_context
            ?.market_snapshot
            ?.trending_hashtags || [];

        tags.forEach(rawTag => {
          const tag =
            String(rawTag).trim();

          if (!tag) {
            return;
          }

          if (!byTag.has(tag)) {
            byTag.set(tag, {
              tag,
              rounds: new Set(),
              firstRound: roundIndex
            });
          }

          byTag
            .get(tag)
            .rounds
            .add(roundIndex);
        });
      }
    );

    return [...byTag.values()]
      .map(item => ({
        ...item,
        count: item.rounds.size
      }))
      .sort((a, b) =>
        a.firstRound - b.firstRound ||
        b.count - a.count ||
        a.tag.localeCompare(b.tag)
      );
  },

  createLabel(tag) {
    const label =
      document.createElement("span");

    label.className =
      "hashtag-matrix-label";

    label.textContent = tag;
    label.title = tag;

    return label;
  },

  createCell(
    item,
    round,
    roundIndex
  ) {
    const present =
      item.rounds.has(roundIndex);

    const cell =
      document.createElement("button");

    cell.type = "button";

    cell.className =
      "hashtag-matrix-cell" +
      (present ? " present" : "");

    cell.dataset.roundIndex =
      String(roundIndex);

    cell.disabled = !present;

    cell.setAttribute(
      "aria-label",
      present
        ? `${item.tag} trends in Round ${roundIndex + 1}`
        : `${item.tag} does not trend in Round ${roundIndex + 1}`
    );

    if (present) {
      cell.addEventListener(
        "click",
        () => {
          window.VastApp
            .roundSelection
            .select(
              roundIndex,
              {
                scrollToTimeline: true
              }
            );
        }
      );

      cell.addEventListener(
        "mouseenter",
        event => {
          this.showTooltip(
            event,
            item.tag,
            round,
            roundIndex
          );
        }
      );

      cell.addEventListener(
        "mousemove",
        event => {
          this.moveTooltip(event);
        }
      );

      cell.addEventListener(
        "mouseleave",
        () => {
          this.hideTooltip();
        }
      );
    }

    return cell;
  },

  updateSelection(roundIndex) {
    document
      .querySelectorAll(
        "#trendingHashtags " +
        "[data-round-index]"
      )
      .forEach(element => {
        element.classList.toggle(
          "selected-round",
          roundIndex !== null &&
          Number(
            element.dataset.roundIndex
          ) === roundIndex
        );
      });
  },

  ensureTooltip() {
    let tooltip =
      document.getElementById(
        "hashtagTooltip"
      );

    if (tooltip) {
      return tooltip;
    }

    tooltip =
      document.createElement("div");

    tooltip.id =
      "hashtagTooltip";

    tooltip.className =
      "hashtag-tooltip";

    tooltip.hidden = true;

    document.body.append(tooltip);

    return tooltip;
  },

  showTooltip(
    event,
    tag,
    round,
    roundIndex
  ) {
    const tooltip =
      this.ensureTooltip();

    const headline =
      round.environment_context
        ?.event_headline ||
      `Round ${roundIndex + 1}`;

    tooltip.innerHTML = `
      <strong>
        ${window.VastApp.utils.escapeHtml(
          tag
        )}
      </strong>
      <span>
        Round ${roundIndex + 1}
      </span>
      <span>
        ${window.VastApp.utils.escapeHtml(
          headline
        )}
      </span>
    `;

    tooltip.hidden = false;

    this.moveTooltip(event);
  },

  moveTooltip(event) {
    const tooltip =
      this.ensureTooltip();

    const offset = 12;

    const left =
      Math.min(
        event.clientX + offset,
        window.innerWidth -
          tooltip.offsetWidth -
          8
      );

    const top =
      Math.min(
        event.clientY + offset,
        window.innerHeight -
          tooltip.offsetHeight -
          8
      );

    tooltip.style.left =
      `${Math.max(8, left)}px`;

    tooltip.style.top =
      `${Math.max(8, top)}px`;
  },

  hideTooltip() {
    const tooltip =
      document.getElementById(
        "hashtagTooltip"
      );

    if (tooltip) {
      tooltip.hidden = true;
    }
  }
};
