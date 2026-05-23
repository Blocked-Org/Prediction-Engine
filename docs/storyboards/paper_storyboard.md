# Paper-Based Storyboard: Prediction-Engine

This document contains a structured, high-level narrative intended to be sketched out during paper-prototyping workshops. Teams can use these panels to quickly align on user flows without getting bogged down in specific UI implementations.

**Target Audience:** Data scientists, domain experts, product managers.
**Format:** 6-Panel comic strip approach.

---

## Scenario A: The End-to-End Prediction Flow
*Data Scientist "Alex" wants to upload sales data, build a quick model, and show the "Why" to their manager.*

### Panel 1: Discovery & Ingestion
* **Sketch Idea:** A large monitor showing a drag-and-drop box. Alex holds a file labeled `synthetic_demo.csv`. A thought bubble says, "Let's see if this platform can handle our sales data."
* **User Action:** Drags CSV file into the browser window.
* **System Response:** Shows a loading spinner, then instantly displays a data preview with detected column types (Numeric, Categorical).

### Panel 2: Pipeline Configuration
* **Sketch Idea:** A blueprint or connect-the-dots view. Alex draws a line from "Missing Values" to "Standard Scaler".
* **User Action:** Selects default preprocessing steps (`preprocessing/pipelines.py`) and clicks "Train".
* **System Response:** The system locks the pipeline and starts the background worker.

### Panel 3: Training & Waiting
* **Sketch Idea:** Alex goes to grab a coffee. On the screen, a progress bar fills up. A mini terminal window scrolls with text like "Tune Train: Fold 1/5 Complete."
* **User Action:** Alex simply waits/monitors.
* **System Response:** Progress finishes and dings. Displays a large "Model Ready — RMSE: 0.12" badge.

### Panel 4: The "What-If" Inference
* **Sketch Idea:** Alex is back at the desk. The screen shows a simple form. Alex types high values into "Marketing Spend" and "Region: North".
* **User Action:** Hits "Predict".
* **System Response:** A bold number pops up: **"Predicted Sales: 15,200"** with a confidence bar.

### Panel 5: Explaining to the Manager
* **Sketch Idea:** Alex shows the screen to a manager ("Pat"). Pat looks confused and asks, "Why did it predict so high?" Alex clicks the "Explain" button.
* **User Action:** Clicks "Explain Prediction".
* **System Response:** The screen transforms. A large SHAP bar chart appears. "Marketing Spend" is the largest green bar pushing the prediction up.

### Panel 6: GraphRAG Knowledge Deep Dive
* **Sketch Idea:** Pat says, "But what else connects to this region?" Alex switches to the "GraphRAG" view.
* **User Action:** Clicks "Knowledge Graph".
* **System Response:** An interactive spider-web of nodes appears, connecting the region to a past successful campaign (`graphrag_service.py`), instantly validating the model's logic.

---

## Scenario B: Macro & Micro Simulations (ABM)

### Panel 1: Simulation Setup
* **Sketch Idea:** A dashboard with multiple sliding controls.
* **Focus:** Setting up Agent-Based Models (`simulation/abm_engine.py`) to forecast the next quarter.

### Panel 2: Running the Engine
* **Sketch Idea:** A timeline chart that forks into 3 different colored paths (Best Case, Worst Case, Expected).
* **Focus:** Visualizing the multi-branch output returned by `engine_runner.py`.

---

## Workshop Instructions
1. Print a 6-box comic strip template on A3 paper.
2. Form groups of 2-3 (ideally mixing engineering with business).
3. Have each group re-sketch *Scenario A* using their own domain's vocabulary (e.g., Supply Chain instead of Sales).
4. Identify missing data fields or required UI components based on the sketches.