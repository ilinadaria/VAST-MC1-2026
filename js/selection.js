window.VastApp = window.VastApp || {};

window.VastApp.selection = {
  select(message, svg) {
    const app = window.VastApp;
    app.state.selectedMessageId = message.message_id;
    const chainIds = app.replies.getChain(
      message.message_id,
      app.state.replyTargets
    );

    this.highlightMessages(
      svg,
      chainIds,
      message.message_id
    );
    this.highlightLinks(svg, chainIds);
    app.details.render(message);
  },

  clear(svg) {
    window.VastApp.state.selectedMessageId = null;

    svg.querySelectorAll(".message-dot").forEach(dot => {
      dot.classList.remove(
        "chain-highlighted",
        "selected",
        "dimmed"
      );
    });

    svg.querySelectorAll(".message-state-ring").forEach(ring => {
      ring.classList.remove(
        "chain-highlighted",
        "selected",
        "dimmed"
      );
    });

    svg.querySelectorAll(".reply-link").forEach(link => {
      link.classList.remove(
        "highlighted",
        "dimmed"
      );
    });

    window.VastApp.details.render(null);
  },

  highlightMessages(svg, chainIds, selectedId) {
    svg.querySelectorAll(".message-node").forEach(node => {
      const messageId =
        node.dataset.messageId;
      const inChain =
        chainIds.has(messageId);
      const isSelected =
        messageId === selectedId;

      const dot =
        node.querySelector(".message-dot");
      const ring =
        node.querySelector(".message-state-ring");

      [dot, ring].forEach(element => {
        if (!element) return;

        element.classList.toggle(
          "chain-highlighted",
          inChain
        );
        element.classList.toggle(
          "selected",
          isSelected
        );
        element.classList.toggle(
          "dimmed",
          !inChain
        );
      });
    });
  },

  highlightLinks(svg, chainIds) {
    svg.querySelectorAll(".reply-link").forEach(link => {
      const inChain =
        chainIds.has(link.dataset.source) &&
        chainIds.has(link.dataset.target);

      link.classList.toggle(
        "highlighted",
        inChain
      );
      link.classList.toggle(
        "dimmed",
        !inChain
      );
    });
  }
};
