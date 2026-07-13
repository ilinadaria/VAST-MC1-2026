window.VastApp = window.VastApp || {};

window.VastApp.messageSearch = {
  query: "",
  matches: [],
  activeIndex: -1,
  pendingMessageId: null,

  init() {
    this.input =
      document.getElementById(
        "messageSearchInput"
      );
    this.searchButton =
      document.getElementById(
        "messageSearchButton"
      );
    this.previousButton =
      document.getElementById(
        "messageSearchPrevious"
      );
    this.nextButton =
      document.getElementById(
        "messageSearchNext"
      );
    this.count =
      document.getElementById(
        "messageSearchCount"
      );

    if (this.input) {
      this.input.placeholder =
        "Search exact words or message ID";
    }

    if (
      !this.input ||
      !this.searchButton ||
      !this.previousButton ||
      !this.nextButton ||
      !this.count
    ) {
      console.error(
        "Message search controls are incomplete."
      );
      return;
    }

    this.searchButton.addEventListener(
      "click",
      () => this.search()
    );

    this.input.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.search();
        }

        if (event.key === "Escape") {
          this.clear();
        }
      }
    );

    this.input.addEventListener(
      "input",
      () => {
        if (!this.input.value) {
          this.clear();
        }
      }
    );

    this.previousButton.addEventListener(
      "click",
      () => this.move(-1)
    );

    this.nextButton.addEventListener(
      "click",
      () => this.move(1)
    );
  },

  search() {
    const query =
      this.input?.value || "";

    if (!query.length) {
      this.clear();
      return;
    }

    this.query = query;
    this.matches =
      this.findAllMatches(query);
    this.activeIndex =
      this.matches.length ? 0 : -1;

    if (this.matches.length) {
      this.openActiveMatch();
    } else {
      this.pendingMessageId = null;
      this.clearTimelineSearchClasses();
      this.updateCounter();
    }
  },

  findAllMatches(query) {
    const matches = [];

    (
      window.VAST_DATA?.rounds || []
    ).forEach((round, roundIndex) => {
      (
        round.communications || []
      ).forEach(message => {
        const content =
          String(message.content || "");

        const messageId =
          String(message.message_id || "");

        const matchesContent =
          this.containsWholePhrase(
            content,
            query
          );

        const matchesMessageId =
          messageId === query;

        if (
          matchesContent ||
          matchesMessageId
        ) {
          matches.push({
            roundIndex,
            message
          });
        }
      });
    });

    return matches.sort((a, b) => {
      const timeDifference =
        new Date(a.message.timestamp) -
        new Date(b.message.timestamp);

      if (timeDifference) {
        return timeDifference;
      }

      return (
        a.roundIndex -
        b.roundIndex
      );
    });
  },

  containsWholePhrase(text, query) {
    if (!query) {
      return false;
    }

    let startIndex =
      text.indexOf(query);

    while (startIndex !== -1) {
      const before =
        startIndex > 0
          ? text[startIndex - 1]
          : "";

      const endIndex =
        startIndex + query.length;

      const after =
        endIndex < text.length
          ? text[endIndex]
          : "";

      const startsAtBoundary =
        !before ||
        !this.isWordCharacter(before);

      const endsAtBoundary =
        !after ||
        !this.isWordCharacter(after);

      if (
        startsAtBoundary &&
        endsAtBoundary
      ) {
        return true;
      }

      startIndex =
        text.indexOf(
          query,
          startIndex + 1
        );
    }

    return false;
  },

  isWordCharacter(character) {
    return /[\\p{L}\\p{N}_]/u.test(
      character
    );
  },

  move(direction) {
    if (!this.matches.length) {
      return;
    }

    this.activeIndex =
      (
        this.activeIndex +
        direction +
        this.matches.length
      ) % this.matches.length;

    this.openActiveMatch();
  },

  openActiveMatch() {
    const app = window.VastApp;
    const result =
      this.matches[this.activeIndex];

    if (!result) {
      this.updateCounter();
      return;
    }

    this.pendingMessageId =
      result.message.message_id;

    if (
      app.state.roundIndex !==
      result.roundIndex
    ) {
      app.state.roundIndex =
        result.roundIndex;
      app.state.highlightedRoundIndex =
        result.roundIndex;

      app.elements.roundSelect.value =
        String(result.roundIndex);

      app.state.selectedMessageId =
        null;
      app.state.replyTargets =
        new Map();

      app.details.render(null);
      app.app.renderRound();
      return;
    }

    this.activateRenderedMatch(
      result.message
    );
  },

  afterTimelineRender() {
    if (!this.query) {
      return;
    }

    this.applyRoundHighlights();

    if (!this.pendingMessageId) {
      this.updateCounter();
      return;
    }

    const result =
      this.matches[this.activeIndex];

    if (
      result &&
      result.roundIndex ===
        window.VastApp.state.roundIndex
    ) {
      this.activateRenderedMatch(
        result.message
      );
    }
  },

  activateRenderedMatch(message) {
    const app = window.VastApp;
    const svg =
      app.elements.timeline
        ?.querySelector("svg");

    if (!svg) {
      return;
    }

    this.clearSelectionHighlighting(svg);

    app.state.selectedMessageId =
      message.message_id;
    app.details.render(message);

    this.pendingMessageId =
      message.message_id;

    this.applyRoundHighlights();
    this.updateCounter();

    const selector =
      `.message-node[data-message-id="${CSS.escape(
        message.message_id
      )}"]`;

    const node =
      svg.querySelector(selector);

    node
      ?.querySelector(".message-dot")
      ?.focus({
        preventScroll: true
      });
  },

  applyRoundHighlights() {
    const app = window.VastApp;
    const svg =
      app.elements.timeline
        ?.querySelector("svg");

    if (!svg) {
      return;
    }

    svg.classList.toggle(
      "message-search-active",
      Boolean(this.query)
    );

    const roundIndex =
      app.state.roundIndex;

    const roundMatchIds =
      new Set(
        this.matches
          .filter(
            result =>
              result.roundIndex ===
              roundIndex
          )
          .map(
            result =>
              result.message.message_id
          )
      );

    const activeResult =
      this.matches[this.activeIndex];

    const activeId =
      activeResult &&
      activeResult.roundIndex ===
        roundIndex
        ? activeResult.message.message_id
        : null;

    svg
      .querySelectorAll(".message-node")
      .forEach(node => {
        const messageId =
          node.dataset.messageId;

        node.classList.toggle(
          "search-match",
          roundMatchIds.has(messageId)
        );

        node.classList.toggle(
          "search-active",
          messageId === activeId
        );
      });
  },

  clearSelectionHighlighting(svg) {
    svg
      .querySelectorAll(".message-dot")
      .forEach(dot => {
        dot.classList.remove(
          "chain-highlighted",
          "selected",
          "dimmed"
        );
      });

    svg
      .querySelectorAll(
        ".message-state-ring"
      )
      .forEach(ring => {
        ring.classList.remove(
          "chain-highlighted",
          "selected",
          "dimmed"
        );
      });

    svg
      .querySelectorAll(".reply-link")
      .forEach(link => {
        link.classList.remove(
          "highlighted",
          "dimmed"
        );
      });
  },

  clearTimelineSearchClasses() {
    const svg =
      window.VastApp.elements.timeline
        ?.querySelector("svg");

    if (!svg) {
      return;
    }

    svg.classList.remove(
      "message-search-active"
    );

    svg
      .querySelectorAll(
        ".message-node.search-match, " +
        ".message-node.search-active"
      )
      .forEach(node => {
        node.classList.remove(
          "search-match",
          "search-active"
        );
      });
  },

  clear() {
    this.query = "";
    this.matches = [];
    this.activeIndex = -1;
    this.pendingMessageId = null;

    if (this.input) {
      this.input.value = "";
    }

    this.clearTimelineSearchClasses();
    this.updateCounter();
  },

  updateCounter() {
    const total =
      this.matches.length;

    const current =
      total &&
      this.activeIndex >= 0
        ? this.activeIndex + 1
        : 0;

    if (this.count) {
      this.count.textContent =
        `${current}/${total}`;
    }

    const disabled =
      total <= 1;

    if (this.previousButton) {
      this.previousButton.disabled =
        disabled;
    }

    if (this.nextButton) {
      this.nextButton.disabled =
        disabled;
    }
  }
};
