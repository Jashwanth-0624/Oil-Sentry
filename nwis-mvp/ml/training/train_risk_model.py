"""Train a group-aware XGBoost drilling-risk classifier."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
for path in (str(PROJECT_ROOT), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from ml.data.prepare_data import FEATURE_COLUMNS, TARGET_COLUMN, prepare_training_arrays  # noqa: E402
from ml.inference.predict import MODEL_PATH, clear_loaded_model  # noqa: E402
from ml.labels import CLASS_NAMES, CLASS_ORDER, EVENT_LABEL_TO_NAME, label_name  # noqa: E402

RANDOM_STATE = 42
TEST_WELL_FRACTION = 0.20
METADATA_PATH = PROJECT_ROOT / "ml" / "models" / "model_metadata.json"

# Conservative MVP hyperparameters. Not a tuned production configuration.
XGB_PARAMS = {
    "objective": "multi:softprob",
    "num_class": len(CLASS_ORDER),
    "n_estimators": 150,
    "max_depth": 4,
    "learning_rate": 0.08,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "min_child_weight": 3,
    "reg_lambda": 1.0,
    "random_state": RANDOM_STATE,
    "n_jobs": 1,
    "tree_method": "hist",
    "eval_metric": "mlogloss",
}

CLASS_WEIGHTING = {
    "method": "sklearn.utils.class_weight.compute_sample_weight",
    "strategy": "balanced",
    "description": (
        "Each training row is weighted as n_samples / (n_classes * n_samples_for_class). "
        "Weights are applied only through XGBClassifier.fit(sample_weight=...). "
        "SMOTE is not used. Test rows are unweighted."
    ),
}


def split_by_well(
    features: Any,
    target: Any,
    groups: Any,
    random_state: int = RANDOM_STATE,
) -> tuple[np.ndarray, np.ndarray, list[str], list[str]]:
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=TEST_WELL_FRACTION,
        random_state=random_state,
    )
    train_index, test_index = next(splitter.split(features, target, groups))
    train_wells = sorted(groups.iloc[train_index].unique().tolist())
    test_wells = sorted(groups.iloc[test_index].unique().tolist())
    overlap = set(train_wells) & set(test_wells)
    if overlap:
        raise RuntimeError(f"Well leakage detected in train/test split: {sorted(overlap)}")

    train_labels = set(target.iloc[train_index].unique())
    missing_train_classes = set(CLASS_ORDER) - train_labels
    if missing_train_classes:
        raise RuntimeError(
            "Training wells do not contain every event class. "
            f"Missing: {sorted(missing_train_classes)}. Choose another random_state."
        )
    return train_index, test_index, train_wells, test_wells


def build_model() -> XGBClassifier:
    return XGBClassifier(**XGB_PARAMS)


def evaluate(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=list(CLASS_ORDER),
        zero_division=0,
    )
    per_class = {}
    for index, class_id in enumerate(CLASS_ORDER):
        per_class[label_name(class_id)] = {
            "precision": float(precision[index]),
            "recall": float(recall[index]),
            "f1": float(f1[index]),
            "support": int(support[index]),
        }
    matrix = confusion_matrix(y_true, y_pred, labels=list(CLASS_ORDER))
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "per_class_metrics": per_class,
        "confusion_matrix": matrix.astype(int).tolist(),
        "classification_report": classification_report(
            y_true,
            y_pred,
            labels=list(CLASS_ORDER),
            target_names=list(CLASS_NAMES),
            zero_division=0,
        ),
    }


def print_report(
    train_wells: list[str],
    test_wells: list[str],
    training_rows: int,
    testing_rows: int,
    metrics: dict[str, Any],
) -> None:
    print("=" * 50)
    print("NWIS DRILLING RISK MODEL")
    print("=" * 50)
    print()
    print("Features:")
    for name in FEATURE_COLUMNS:
        print(f"    {name}")
    print()
    print("Target:")
    print(f"    {TARGET_COLUMN}")
    print()
    print("Train wells:")
    print(f"    {', '.join(train_wells)}")
    print()
    print("Test wells:")
    print(f"    {', '.join(test_wells)}")
    print()
    print("Training rows:")
    print(f"    {training_rows}")
    print()
    print("Testing rows:")
    print(f"    {testing_rows}")
    print()
    print("Accuracy:")
    print(f"    {metrics['accuracy']:.4f}")
    print()
    print("Macro F1:")
    print(f"    {metrics['macro_f1']:.4f}")
    print()
    print("Weighted F1:")
    print(f"    {metrics['weighted_f1']:.4f}")
    print()
    print("Classification Report:")
    print(metrics["classification_report"])
    print("Confusion Matrix:")
    print("    rows = true class, columns = predicted class")
    print(f"    order = {list(CLASS_NAMES)}")
    for row in metrics["confusion_matrix"]:
        print(f"    {row}")
    print()
    print("=" * 50)
    print("This is a synthetic-data MVP. High test scores do not imply")
    print("production performance on real OIL drilling data.")
    print("=" * 50)


def save_model(model: XGBClassifier, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": model,
        "feature_names": list(FEATURE_COLUMNS),
        "target": TARGET_COLUMN,
        "classes": list(CLASS_ORDER),
        "class_labels": dict(EVENT_LABEL_TO_NAME),
        "preprocessing": None,
    }
    joblib.dump(artifact, path)


def save_metadata(payload: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def train() -> dict[str, Any]:
    features, target, groups = prepare_training_arrays()
    train_index, test_index, train_wells, test_wells = split_by_well(features, target, groups)
    x_train = features.iloc[train_index]
    x_test = features.iloc[test_index]
    y_train = target.iloc[train_index].to_numpy()
    y_test = target.iloc[test_index].to_numpy()

    sample_weight = compute_sample_weight(class_weight="balanced", y=y_train)
    model = build_model()
    model.fit(x_train, y_train, sample_weight=sample_weight)
    y_pred = model.predict(x_test)
    metrics = evaluate(y_test, y_pred)

    save_model(model, MODEL_PATH)
    clear_loaded_model()
    metadata = {
        "model_type": "XGBClassifier",
        "objective": XGB_PARAMS["objective"],
        "hyperparameters": XGB_PARAMS,
        "class_weighting": CLASS_WEIGHTING,
        "feature_names": list(FEATURE_COLUMNS),
        "target": TARGET_COLUMN,
        "classes": {str(key): value for key, value in EVENT_LABEL_TO_NAME.items()},
        "split_method": "GroupShuffleSplit",
        "test_well_fraction": TEST_WELL_FRACTION,
        "random_state": RANDOM_STATE,
        "training_row_count": int(len(x_train)),
        "testing_row_count": int(len(x_test)),
        "training_well_ids": train_wells,
        "testing_well_ids": test_wells,
        "accuracy": metrics["accuracy"],
        "macro_f1": metrics["macro_f1"],
        "weighted_f1": metrics["weighted_f1"],
        "per_class_metrics": metrics["per_class_metrics"],
        "confusion_matrix": metrics["confusion_matrix"],
        "confusion_matrix_order": list(CLASS_NAMES),
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_note": "Training used synthetic NWIS drilling_logs. This is not production-ready.",
        "limitations": [
            "Dataset is synthetic.",
            "Real-world drilling data is required for production validation.",
            "Probabilities come from predict_proba and are not calibrated.",
            "Group-aware well split tests generalization to unseen wells in this synthetic set only.",
        ],
    }
    save_metadata(metadata, METADATA_PATH)
    print_report(
        train_wells=train_wells,
        test_wells=test_wells,
        training_rows=len(x_train),
        testing_rows=len(x_test),
        metrics=metrics,
    )
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved metadata: {METADATA_PATH}")
    return metadata


def main() -> None:
    train()


if __name__ == "__main__":
    main()
