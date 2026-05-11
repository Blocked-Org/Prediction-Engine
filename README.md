# Marketing ML pipeline (Python, XGBoost, SHAP)

Production-style training and inference scaffolding for **regression targets** such as ROI, conversions, or engagement surrogates. Models are intentionally **explainable**: SHAP values are computed with `TreeExplainer`—no scraped Meta Ad Library data and no fabricated natural-language “reason” strings.

---

## Prerequisites

- **Python 3.11 or newer**
- Recommended: create a virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Linux/macOS:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Folder layout

```
data/raw/               # Drop Kaggle CSVs here (you download them manually)
data/processed/         # train.parquet | val.parquet | test.parquet + manifest JSON
artifacts/shap/         # Optional SHAP plots after training (waterfall/summary_bar)
configs/dataset.yaml    # Tune columns + paths (copy from configs/dataset.example.yaml)
models/                 # Saved sklearn Pipeline (*.joblib) + *_metadata.json
notebooks/
src/preprocessing/
src/training/
src/inference/
src/explainability/
```

Entry points:

- [`train.py`](train.py): load CSVs → preprocess → tuned XGBoost → metrics + plots
- [`predict.py`](predict.py): JSON in → predictions + optional SHAP output
- Optional FastAPI layer: [`src/api/main.py`](src/api/main.py)

---

## 1. Collect public marketing data (Kaggle, manual download)

Never scrape proprietary sources. Typical **Kaggle datasets** aligned with marketing analytics include:

| Theme | Starter ideas |
|-------|---------------|
| Facebook-style ads / conversions | [Facebook-style campaign datasets](https://www.kaggle.com/datasets/tunguz/facebook-ad-metrics) and similar “marketing conversion” tables |
| General campaign performance | [Advertising Campaign Performance](https://www.kaggle.com/datasets/adityasingh01676/advertising-campaign-performance) |
| Google Ads–adjacent KPIs | [Google Ads aggregates](https://www.kaggle.com/datasets/caodewei/google-ads), [combined Google + Facebook summaries](https://www.kaggle.com/datasets/bpforever/google-and-facebook-ads) |
| CTR / engagement proxies | Tables with impressions, clicks, spend, CTR, creatives, placements |

Always read the dataset license on each Kaggle page before using it commercially.

### Manual download checklist

1. Sign in at [https://www.kaggle.com/](https://www.kaggle.com/)
2. Navigate to your chosen dataset → **Download** (ZIP/archive)
3. Extract the CSV (or parquet) locally
4. Copy the CSV into [`data/raw/`](data/raw/), e.g. `data/raw/marketing_oct2025.csv`

> **Exactly where datasets go**: any file reachable by the `raw_glob` pattern in [`configs/dataset.yaml`](configs/dataset.yaml). The default expects `data/raw/*.csv`.

---

## 2. Configure features (YAML)

1. Duplicate [`configs/dataset.example.yaml`](configs/dataset.example.yaml) if you deleted the packaged copy.
2. Edit [`configs/dataset.yaml`](configs/dataset.yaml):

| Key | Guidance |
|-----|----------|
| `target_column` | The numeric column you regress (often conversions, CPA inverses, etc.) |
| `numeric_features` / `categorical_features` | Explicit typing keeps Parquet ingestion stable |
| `drop_columns` | IDs, leaky aggregates, hashed strings you never engineered |
| `outlier.enabled` | IQR clipping (fit on train only, inside sklearn) |
| `model_output_path` | Where `joblib` writes the finalized pipeline |

Likely regression targets depending on CSV:

| Business question | Typical target candidates |
|-------------------|---------------------------|
| Conversions | `Approved_Conversion`, `Total_Conversion`, purchases |
| Acquisition cost | Inverse CPA (`spend / max(conversions, ε))`—engineer beforehand) |
| Engagement | CTR (`clicks / impressions`), weighted likes/shares, session depth |
| ROI / ROAS | Revenue minus spend ratios if revenue exists |

⚠️ **Leakage caution**: dropping post-campaign aggregates that summarize the outcome you are forecasting will inflate metrics. Inspect column definitions before choosing `numeric_features`.

### Adapting preprocessing when schemas differ

1. Inspect column names (`pandas.read_csv(nrows=5)` in a notebook)
2. Update YAML lists—not Python files—for new numeric/categorical assignments
3. If you derive features (ROI, CTR) add engineering cells in `notebooks/` then persist the engineered CSV prior to training
4. Re-run [`train.py`](train.py)—processed splits refresh automatically.

---

## 3. Train the XGBoost regressor

Example:

```powershell
python train.py --config configs/dataset.yaml --n-iter 25
```

What happens internally:

1. CSVs globs merge into one table
2. Train/validation/test splits with fixed `random_state`
3. **`sklearn.pipeline.Pipeline`** = optional **IQR clipper** → `ColumnTransformer` (median imputer + RobustScaler | OHE + imputer)
4. **`RandomizedSearchCV`** tunes `xgboost.sklearn.XGBRegressor`
5. Best candidate **refits on train+validation** union; untouched **test metrics** quantify generalization.
6. Artifacts saved:
   - `models/<name>.joblib` – full preprocessing + regressor bundle
   - `models/<name>_metadata.json` – metrics, residual dispersion, YAML echo
   - `artifacts/shap/summary_bar.png` + `waterfall_example.png` unless `--skip-shap-plots`

Environment overrides (also documented inside [`.env.example`](.env.example)):

| Variable | Effect |
|---------|--------|
| `PE_CONFIG_PATH` | Default YAML for `train.py` |
| `PE_TARGET_COLUMN` | Override target column name without touching YAML |
| `PE_ARTIFACTS_DIR` | Change SHAP PNG output folder |
| `PE_RANDOM_STATE` | Shared RNG between CLI helpers |

---

## 4. How XGBoost works (regression recap)

Gradient boosted trees sequentially fit shallow decision trees targeting the residual error of earlier trees. **`XGBRegressor`** minimizes a differentiable loss (defaults to squared error) with optional regularizers (`gamma`, `reg_lambda`, etc.). Hyperparameters such as **`learning_rate`**, **`max_depth`**, **`subsample`**, and **`colsample_bytree`** jointly control bias/variance trade-offs.

Because models are ensembles of trees they can capture nonlinear interactions similar to logistic stacks but retain tabular scalability.

---

## 5. How SHAP explanations work here

[`shap.TreeExplainer`](https://github.com/shap/shap) gives **additive Shapley-style attributions** for tree models. Given a baseline expectation `E[f(X)]`, each transformed feature receives a **`φᵢ`** (“SHAP value”) such that **`f(x) ≈ baseline + Σ φᵢ`** for observation `x`. We purposely **expose only numerical structures** (`shap_values`, sorted contributions, decomposition checks)—no hallucinated textual narratives.

Operational notes:

1. Explainations operate in **preprocessed** feature space (`OneHotEncoder`, scaling, clipping).
2. **Background datasets** approximate interventional perturbations (`feature_perturbation="interventional"`). Larger backgrounds are more faithful but slower.
3. Inspect `artifacts/shap/` for global bar charts and illustrative waterfalls.

More deep dives:

- Lundberg & Lee — *Unified Approach to Interpreting Model Predictions*

---

## 6. Inference via JSON CLI

Ensure training finished so `models/xgb_pipeline_metadata.json` and `data/processed/train.parquet` exist.

Example using the bundled dummy row ([`sample_campaign.json`](sample_campaign.json)):

```powershell
python predict.py --input sample_campaign.json --model models/xgb_pipeline.joblib
```

stdin mode:

```powershell
Get-Content sample_campaign.json | python predict.py --stdin
```

Flags:

| Flag | Meaning |
|------|---------|
| `--no-shap` | Faster if you only need point predictions |
| `--background-parquet` | Defaults to processed training split (`PE_BACKGROUND_PARQUET`) |
| `PE_MODEL_PATH` | Switch models without rewriting scripts |

Confidence-like telemetry is **explicitly heuristic**: symmetric bands ±`1.96 × MAE_candidate` sourced from validation residuals of the **pre-merge** estimator (honest dispersion prior to stacking train/val).

---

## 7. FastAPI preparation (stub)

The core logic avoids FastAPI coupling. Thin adapters live under `src/api/`.

Suggested dev server once you hardened auth:

```powershell
$env:PE_MODEL_PATH="models/xgb_pipeline.joblib"
uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8090
```

Expose only after adding authentication, quota limits, and monitoring.

---

## 8. Future improvements

| Direction | Benefit |
|-----------|---------|
| **LightGBM / CatBoost** | Strong baselines when categoricals dominate |
| **Time-series forecasting** | Residual telemetry for pacing & seasonality |
| **Calibration / ensembles** | Stacked residuals, quantile ensembles, Bayesian stacking |
| **Causal uplift (double ML, meta-learners)** | Move from correlation to incremental lift estimation |
| **Reinforcement learning** | Sequential budget pacing (delayed reward learning) |

---

## 9. Troubleshooting pointers

| Symptom | Fix |
|---------|-----|
| `Feature names unknown` mismatches SHAP lengths | Align YAML feature lists vs CSV; ensure OneHot cardinality reasonable |
| `pyarrow` import errors installing parquet | Upgrade pip / install `pip install pyarrow --upgrade` |
| SHAP slowdown | Lower `--background-rows` or shrink training parquet sample |
| XGBoost early-stopping quirks | Inspect `xgboost.__version__` vs docs; rerun with fewer `n_iter` while prototyping |

Happy experimenting—stay transparent with stakeholders by pairing **prediction + SHAP JSON** exported from [`predict.py`](predict.py).
