# GUI Storyboard: Prediction Engine

## Screen 1: Dashboard Home (`/`)
**Layout:** 
- **Header:** Navigation bar with "Home", "Models", "Simulations", "Data". User profile on the far right.
- **Main Content:** 
  - Welcome banner with quick actions: "New Prediction Task", "Run Simulation".
  - Recent activity feed showing previously trained models and their status.

## Screen 2: Data Ingestion (`/data/upload`)
**Layout:**
- **Sidebar:** Steps indicator (1. Upload -> 2. Configure -> 3. Train).
- **Main Area:** 
  - Drag and drop file uploader component.
  - Data preview table showing the first 10 rows of the uploaded dataset.
  - Basic summary statistics sidebar (missing values, data types).

## Screen 3: Model Configuration (`/train/config`)
**Layout:**
- **Form Area:**
  - **Target Selection:** Dropdown populated with feature names from the dataset.
  - **Pipeline Settings:** Checkboxes for "Handle Outliers", "Impute Missing Values".
  - **Model Selection:** Radio buttons for "AutoML", "XGBoost", "Random Forest", "Neural Network".
- **Action Footer:** "Start Training" button (primary action).

## Screen 4: Explanation & Results (`/models/{id}/results`)
**Layout:**
- **At-a-glance Metrics Cards:** KPI cards across the top (e.g., Accuracy: 95%, R²: 0.89).
- **Interactive Visualizations:**
  - Plotly/Recharts rendering for Predicted vs. Actual values.
  - SHAP value waterfall chart for global explainability.
- **Export Controls:** "Download Model", "Export Predictions", "Generate Report" (PDF).
