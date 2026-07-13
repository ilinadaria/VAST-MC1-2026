window.VastApp = window.VastApp || {};

window.VastApp.replies = {
  resolve(messages) {
    const messageIds = new Set(messages.map(message => message.message_id));
    const targetsByMessage = new Map();
    const previousMessages = [];

    messages.forEach(message => {
      const replyValue = window.VastApp.dataHelpers.getReplyValue(message);
      targetsByMessage.set(
        message.message_id,
        this.resolveValue(replyValue, messageIds, previousMessages)
      );
      previousMessages.push(message);
    });

    return targetsByMessage;
  },

  resolveValue(replyValue, messageIds, previousMessages) {
    if (typeof replyValue !== "string" || !replyValue.trim()) return [];
    if (messageIds.has(replyValue)) return [{ messageId: replyValue, inferred: false }];
    return this.resolveMentions(replyValue, previousMessages);
  },

  resolveMentions(replyValue, previousMessages) {
    const normalize = window.VastApp.dataHelpers.normalizeAgentName;
    const mentions = [...replyValue.matchAll(/@([a-zA-Z0-9_-]+)/g)]
      .map(match => normalize(match[1]));

    return [...new Set(mentions)]
      .map(mention => this.findMostRecent(previousMessages, mention))
      .filter(Boolean)
      .map(message => ({ messageId: message.message_id, inferred: true }));
  },

  findMostRecent(messages, mentionedAgent) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (this.getAliases(messages[index]).has(mentionedAgent)) return messages[index];
    }
    return null;
  },

  getAliases(message) {
    const normalize = window.VastApp.dataHelpers.normalizeAgentName;
    const aliases = [message.agent_id, message.agent_role, message.agent_label]
      .filter(Boolean)
      .map(normalize);

    if (aliases.some(alias => alias.includes("quality") || alias.includes("platformtrust"))) {
      aliases.push("platformtrust", "quality");
    }
    if (aliases.some(alias => alias.includes("socialmedia") || alias.includes("socialmanager"))) {
      aliases.push("socialmanager", "socialmedia", "social");
    }
    if (aliases.some(alias => alias === "pr" || alias.includes("pragent"))) {
      aliases.push("pr", "printern");
    }
    if (aliases.some(alias => alias.includes("legal"))) aliases.push("legal");

    return new Set(aliases);
  },

  getChain(startId, replyTargets) {
    const adjacency = this.buildAdjacency(replyTargets);
    const visited = new Set([startId]);
    const queue = [startId];

    while (queue.length) {
      const current = queue.shift();
      (adjacency.get(current) || []).forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    return visited;
  },

  buildAdjacency(replyTargets) {
    const adjacency = new Map();
    replyTargets.forEach((targets, messageId) => {
      targets.forEach(({ messageId: targetId }) => {
        this.connect(adjacency, messageId, targetId);
      });
    });
    return adjacency;
  },

  connect(adjacency, firstId, secondId) {
    if (!adjacency.has(firstId)) adjacency.set(firstId, new Set());
    if (!adjacency.has(secondId)) adjacency.set(secondId, new Set());
    adjacency.get(firstId).add(secondId);
    adjacency.get(secondId).add(firstId);
  }
};
