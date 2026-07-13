import json
import math
import re
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer


INPUT_FILE = Path("data.json")
OUTPUT_FILE = Path("tfidf_byround.json")

MIN_WORDS = 8
MAX_PER_ROUND = 8

NGRAM_RANGE = (1, 2)
MIN_DF = 2
MAX_DF = 0.85


def words(text):
    return re.findall(
        r"\b\w+\b",
        str(text or "").lower()
    )


def get_content(message):
    return str(
        message.get("content") or ""
    ).strip()


def is_eligible(message):
    return len(words(get_content(message))) >= MIN_WORDS


def collect_messages_until_round(rounds, current_round_index):
    """
    Collect eligible messages from the first round through
    the current round.
    """
    collected = []

    for round_index in range(current_round_index + 1):
        round_data = rounds[round_index]

        for message in round_data.get("communications", []):
            if not is_eligible(message):
                continue

            collected.append({
                "round_index": round_index,
                "message": message,
                "content": get_content(message)
            })

    return collected


def calculate_scores(messages):
    """
    Fit TF-IDF on all messages available up to the current round.
    """
    if not messages:
        return {}

    texts = [
        item["content"]
        for item in messages
    ]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=NGRAM_RANGE,
        min_df=MIN_DF,
        max_df=MAX_DF
    )

    try:
        matrix = vectorizer.fit_transform(texts)
    except ValueError:
        return {
            item["message"].get("message_id"): 0.0
            for item in messages
        }

    scores = {}

    for index, item in enumerate(messages):
        message = item["message"]
        message_id = message.get("message_id")

        word_count = len(words(item["content"]))
        tfidf_sum = float(matrix[index].sum())

        score = (
            tfidf_sum / math.sqrt(word_count)
            if word_count > 0
            else 0.0
        )

        scores[message_id] = score

    return scores


def process_round(rounds, round_index):
    current_round = rounds[round_index]

    all_current_messages = current_round.get(
        "communications",
        []
    )

    cumulative_messages = collect_messages_until_round(
        rounds,
        round_index
    )

    cumulative_scores = calculate_scores(
        cumulative_messages
    )

    current_eligible_messages = [
        message
        for message in all_current_messages
        if is_eligible(message)
    ]

    ranked_current_messages = sorted(
        current_eligible_messages,
        key=lambda message: cumulative_scores.get(
            message.get("message_id"),
            0.0
        ),
        reverse=True
    )

    selected_messages = ranked_current_messages[
        :MAX_PER_ROUND
    ]

    selected_ids = {
        message.get("message_id")
        for message in selected_messages
    }

    rank_by_id = {
        message.get("message_id"): rank
        for rank, message in enumerate(
            ranked_current_messages,
            start=1
        )
    }

    output_messages = []

    for message in all_current_messages:
        message_id = message.get("message_id")

        output_messages.append({
            "message_id": message_id,
            "score": round(
                cumulative_scores.get(
                    message_id,
                    0.0
                ),
                6
            ),
            "rank": rank_by_id.get(message_id),
            "important": message_id in selected_ids
        })

    return {
        "round_index": round_index,
        "hour": current_round.get("hour"),
        "total_messages": len(all_current_messages),
        "eligible_messages": len(
            current_eligible_messages
        ),
        "comparison_messages": len(
            cumulative_messages
        ),
        "selected_count": len(
            selected_messages
        ),
        "important_message_ids": [
            message.get("message_id")
            for message in selected_messages
        ],
        "messages": output_messages
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
            'The input file must contain a "rounds" list.'
        )

    round_results = []

    for round_index in range(len(rounds)):
        result = process_round(
            rounds,
            round_index
        )

        round_results.append(result)

        print(
            "Round",
            round_index + 1,
            "- compared current messages against",
            result["comparison_messages"],
            "messages from rounds 1-",
            round_index + 1,
            "- selected",
            result["selected_count"]
        )

    output = {
        "method": "cumulative TF-IDF by round",
        "description": (
            "For each round, TF-IDF is fitted using messages "
            "from the current and all preceding rounds. "
            "Only messages from the current round are selected."
        ),
        "selection_settings": {
            "minimum_words": MIN_WORDS,
            "maximum_per_round": MAX_PER_ROUND,
            "ngram_range": list(NGRAM_RANGE),
            "min_df": MIN_DF,
            "max_df": MAX_DF,
            "scoring": (
                "tfidf_sum / sqrt(word_count)"
            )
        },
        "rounds": round_results
    }

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False
        )

    total_selected = sum(
        result["selected_count"]
        for result in round_results
    )

    print()
    print("Finished")
    print("Rounds processed:", len(round_results))
    print("Total selected:", total_selected)
    print("Saved to:", OUTPUT_FILE)


if __name__ == "__main__":
    main()