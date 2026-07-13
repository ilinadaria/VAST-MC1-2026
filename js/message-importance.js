window.VastApp = window.VastApp || {};

window.VastApp.messageImportance = {
  roundData: null,
  globalData: null,
  llmData: null,

  async load() {
    const [
      roundResponse,
      globalResponse,
      llmResponse
    ] = await Promise.all([
      fetch("./tfidf_byround.json"),
      fetch("./tfidf_global.json"),
      fetch("./llm.json")
    ]);

    if (!roundResponse.ok) {
      throw new Error(
        "Could not load tfidf_byround.json"
      );
    }

    if (!globalResponse.ok) {
      throw new Error(
        "Could not load tfidf_global.json"
      );
    }

    if (!llmResponse.ok) {
      throw new Error(
        "Could not load llm.json"
      );
    }

    this.roundData = await roundResponse.json();
    this.globalData = await globalResponse.json();
    this.llmData = await llmResponse.json();
  },

  getImportantIds(roundIndex, filterMode) {
    if (filterMode === "tfidf-round") {
      const round =
        this.roundData?.rounds?.[roundIndex];

      return this.extractIds(round);
    }

    if (filterMode === "tfidf-global") {
      const round =
        this.globalData?.rounds?.[roundIndex];

      return this.extractIds(round);
    }

    if (filterMode === "llm") {
      return this.getLlmIds(roundIndex);
    }

    return new Set();
  },

  getLlmIds(roundIndex) {
    const data = this.llmData;

    if (!data) {
      return new Set();
    }

    if (Array.isArray(data)) {
      return this.extractIds(data);
    }

    const round =
      data?.rounds?.[roundIndex];

    const roundIds =
      this.extractIds(round);

    if (roundIds.size) {
      return roundIds;
    }

    return this.extractIds(data);
  },

  extractIds(source) {
    const ids = new Set();

    if (!source) {
      return ids;
    }

    if (typeof source === "string") {
      ids.add(source);
      return ids;
    }

    if (Array.isArray(source)) {
      source.forEach(item => {
        if (typeof item === "string") {
          ids.add(item);
          return;
        }

        if (!item || typeof item !== "object") {
          return;
        }

        const messageId =
          item.message_id ??
          item.messageId ??
          item.id;

        const selected =
          item.important ??
          item.selected ??
          item.is_important ??
          item.isSelected;

        if (
          typeof messageId === "string" &&
          selected !== false
        ) {
          ids.add(messageId);
        }
      });

      return ids;
    }

    const idLists = [
      source.important_message_ids,
      source.selected_message_ids,
      source.message_ids,
      source.selected_ids,
      source.ids
    ];

    idLists.forEach(list => {
      this.extractIds(list).forEach(id => ids.add(id));
    });

    const objectLists = [
      source.selected_messages,
      source.important_messages,
      source.messages,
      source.selections
    ];

    objectLists.forEach(list => {
      this.extractIds(list).forEach(id => ids.add(id));
    });

    return ids;
  }
};
