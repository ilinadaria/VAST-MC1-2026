import json
import math
import re
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer


INPUT_FILE = Path("data.json")
OUTPUT_FILE = Path("tfidf_global.json")

MIN_WORDS = 8
MAX_MESSAGES = 30


def words(text):
    return re.findall(
        r"\b\w+\b",
        str(text or "").lower()
    )


def collect_messages(rounds):
    messages = []

    for round_index, round_data in enumerate(rounds):
        for message in round_data.get("communications", []):
            content = str(
                message.get("content") or ""
            ).strip()

            if len(words(content)) < MIN_WORDS:
                continue

            messages.append({
                "round_index": round_index,
                "round_hour": round_data.get("hour"),
                "message": message,
                "content": content
            })

    return messages


def calculate_scores(messages):
    texts = [
        item["content"]
        for item in messages
    ]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.85
    )

    try:
        matrix = vectorizer.fit_transform(texts)
    except ValueError:
        for item in messages:
            item["tfidf_score"] = 0.0

        return

    for index, item in enumerate(messages):
        word_count = len(words(item["content"]))
        tfidf_sum = float(matrix[index].sum())

        item["tfidf_score"] = (
            tfidf_sum / math.sqrt(word_count)
        )


def build_output(rounds, eligible_messages):
    ranked_messages = sorted(
        eligible_messages,
        key=lambda item: item["tfidf_score"],
        reverse=True
    )

    selected_messages = ranked_messages[:MAX_MESSAGES]

    selected_ids = {
        item["message"].get("message_id")
        for item in selected_messages
    }

    global_rank = {
        item["message"].get("message_id"): rank
        for rank, item in enumerate(
            ranked_messages,
            start=1
        )
    }

    score_by_id = {
        item["message"].get("message_id"):
            item["tfidf_score"]
        for item in eligible_messages
    }

    round_results = []

    for round_index, round_data in enumerate(rounds):
        output_messages = []
        important_message_ids = []

        for message in round_data.get(
            "communications",
            []
        ):
            message_id = message.get("message_id")
            is_important = message_id in selected_ids

            if is_important:
                important_message_ids.append(message_id)

            output_messages.append({
                "message_id": message_id,
                "score": round(
                    score_by_id.get(message_id, 0.0),
                    6
                ),
                "global_rank": global_rank.get(message_id),
                "important": is_important
            })

        round_results.append({
            "round_index": round_index,
            "hour": round_data.get("hour"),
            "total_messages": len(
                round_data.get("communications", [])
            ),
            "important_message_ids":
                important_message_ids,
            "messages": output_messages
        })

    selected_output = []

    for item in selected_messages:
        message = item["message"]
        message_id = message.get("message_id")

        selected_output.append({
            "message_id": message_id,
            "round_index": item["round_index"],
            "timestamp": message.get("timestamp"),
            "agent_id": message.get("agent_id"),
            "agent_label": message.get("agent_label"),
            "content": message.get("content"),
            "score": round(
                item["tfidf_score"],
                6
            ),
            "global_rank": global_rank[message_id]
        })

    return {
        "method": "global timeline TF-IDF",
        "selection_settings": {
            "minimum_words": MIN_WORDS,
            "maximum_messages": MAX_MESSAGES,
            "ngram_range": [1, 2],
            "min_df": 2,
            "max_df": 0.85,
            "scoring": (
                "tfidf_sum / sqrt(word_count)"
            )
        },
        "total_messages": sum(
            len(round_data.get("communications", []))
            for round_data in rounds
        ),
        "eligible_messages": len(eligible_messages),
        "selected_count": len(selected_messages),
        "important_message_ids": [
            item["message"].get("message_id")
            for item in selected_messages
        ],
        "selected_messages": selected_output,
        "rounds": round_results
    }


def main():
    print("Loading:", INPUT_FILE)

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            "Could not find data.json"
        )

    with INPUT_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:
        data = json.load(file)

    rounds = data.get("rounds")

    if not isinstance(rounds, list):
        raise ValueError(
            'The input must contain a "rounds" list.'
        )

    messages = collect_messages(rounds)

    print(
        "Eligible messages:",
        len(messages)
    )

    calculate_scores(messages)

    result = build_output(
        rounds,
        messages
    )

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False
        )

    print()
    print("Finished")
    print(
        "Messages selected globally:",
        result["selected_count"]
    )
    print("Saved to:", OUTPUT_FILE)


if __name__ == "__main__":
    main()