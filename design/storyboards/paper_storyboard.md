# Paper Storyboard: Prediction Engine

## Scenario 1: User Uploads Data and Runs Prediction

**Sketch 1: Landing Page**
- **Visuals:** Large title "Prediction Engine". A prominent drag-and-drop zone in the center for "Upload Dataset (CSV/JSON)".
- **Action:** User draws a box representing dropping a file into the upload zone.

**Sketch 2: Configuration View**
- **Visuals:** A two-column layout. Left side: data columns detected. Right side: dropdowns for "Target Variable", "Model Type" (XGBoost, Neural Net, etc.), and "Run" button.
- **Action:** User selects the target variable and clicks "Run".

**Sketch 3: Processing Screen**
- **Visuals:** A progress bar or spinning gear indicating model training and prediction generation.
- **Text:** "Training model... Extracting features..."

**Sketch 4: Results Dashboard**
- **Visuals:** Top row shows key metrics (Accuracy, F1-Score, RMSE). Main area has a line chart (Predictions vs Actuals) and a bar chart (Feature Importance / SHAP values).
- **Action:** User points to the feature importance chart to understand the model's decision-making process.
