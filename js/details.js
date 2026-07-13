window.VastApp = window.VastApp || {};

window.VastApp.details = {
  render(message) {
    const app = window.VastApp;
    const container = app.elements.messageDetails;
    const charts = document.querySelector(".agent-metrics-content");
    const heading = document.querySelector(".agent-metrics-heading");

    if (!container || !charts) {
      console.error(
        "Agent panel view targets not found. Expected #messageDetails and .agent-metrics-content."
      );
      return;
    }

    if (!message) {
      container.replaceChildren();
      container.hidden = true;
      charts.hidden = false;

      if (heading) {
        heading.textContent = "Agent activity";
      }

      return;
    }

    charts.hidden = true;
    container.hidden = false;
    container.innerHTML = this.createMarkup(message);

    if (heading) {
      heading.textContent = "Message details";
    }
  },

  createMarkup(message) {
    const {
      escapeHtml,
      formatDate,
      humanize
    } = window.VastApp.utils;

    const replyTo =
      window.VastApp.dataHelpers.getReplyValue(message) ||
      "None";

    const recipients =
      Array.isArray(message.recipients) &&
      message.recipients.length
        ? message.recipients.join(", ")
        : "None";

    const content = String(message.content || "").trim();

    return `
      <div class="details-grid">
        <div class="details-main">
          <section class="details-section">
            <h3>Message</h3>
            <p class="message-content">${escapeHtml(content)}</p>
          </section>

          <section class="details-section internal-state-section">
            <h3>Internal state</h3>
            <div class="internal-state">
              ${this.internalState(message.internal_state)}
            </div>
          </section>
        </div>

        <aside class="details-meta">
          ${this.item(
            "Agent",
            message.agent_label || message.agent_id
          )}
          ${this.item(
            "Time",
            formatDate(new Date(message.timestamp))
          )}
          ${this.item(
            "Channel",
            humanize(message.channel || "unknown")
          )}
          ${this.item(
            "Type",
            humanize(message.message_type || "unknown")
          )}
          ${this.item(
            "Replying to",
            replyTo
          )}
          ${this.item(
            "Recipients",
            recipients
          )}
          ${this.item(
            "Message ID",
            message.message_id
          )}
          ${this.item(
            "Role",
            humanize(message.agent_role || "unknown")
          )}
        </aside>
      </div>
    `;
  },

  item(label, value) {
    const { escapeHtml } = window.VastApp.utils;

    return `
      <div class="meta-item">
        <span class="meta-label">${escapeHtml(label)}</span>
        <span class="meta-value">${escapeHtml(value)}</span>
      </div>
    `;
  },

  internalState(state) {
    const {
      escapeHtml,
      humanize
    } = window.VastApp.utils;

    if (!state) {
      return `
        <p class="empty-state">
          No internal state recorded for this message.
        </p>
      `;
    }

    const rows = Object.entries(state)
      .filter(([, value]) =>
        value !== null &&
        value !== ""
      )
      .map(([key, value]) => {
        const text = String(value).trim();

        return `
          <div class="state-row">
            <strong>${escapeHtml(humanize(key))}</strong>
            <span class="state-value">${escapeHtml(text)}</span>
          </div>
        `;
      })
      .join("");

    return rows || `
      <p class="empty-state">
        No internal state recorded for this message.
      </p>
    `;
  }
};
