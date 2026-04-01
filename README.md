# Knee Disease Identifier

This app is an upload-and-analysis website for knee X-ray screening. It does not bundle or browse dataset images locally.

Dataset source: https://www.kaggle.com/datasets/mohamedgobara/multi-class-knee-osteoporosis-x-ray-dataset

## Run

From the `website` folder:

```powershell
powershell -ExecutionPolicy Bypass -File ".\run-backend.ps1"
```

Then open `http://127.0.0.1:5000`.

## Deploy

This project is prepared for Render deployment.

Start command:

```bash
gunicorn app:app
```

## Model setup

To use your trained model, put `knee_Model.h5` in this folder and install TensorFlow.
Without it, the app falls back to a lightweight built-in statistical model for demo analysis.
