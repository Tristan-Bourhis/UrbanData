# UrbanData

## Lauching the project

### First install

```bash
    bash install.sh
```

### 🏁 Results

This will launch the API and start the filtering and aggregation pipeline.

### Reload the project

```bash
    bash reload.sh
```

### 🏁 Results

This will reload the Docker API.

## Filter Pipeline

### 📋 Prerequisites

Ensure you have the following structure and files in place:

- The `data/silver` and `data/gold` folders must exist.
- **In `data/bronze/foncieres`:**
  - The 6 required `.txt` files.
- **In `data/bronze`:**
  - `air_quality.json`
  - `arrets.csv`
  - `les-arbres.NxlKJoRt.csv.part`
  - `logements-sociaux-finances-a-paris.csv`
  - `sanisettesparis.csv`

### Launching the Pipeline

1.  Start the API (follow the instructions in the API's `README`).
2.  Open a terminal and run:

    ```bash
    cd transform/filter
    python pipeline_filter.py
    ```

### 🏁 Results

Running the script will produce the following outputs:

- 1 file will be created in the `data/gold` folder.
- 5 other files will be created in the `data/silver` folder.
- 6 tables will be created in the API's MySQL storage.

## Agregation Pipeline

### 📋 Prerequisites

Ensure you have the following structure and files in place:

- The `data/silver` and `data/gold` folders must exist.
- **In `data/gold/`:**
  - The sanisettesparis.csv
- **In `data/silver`:**
  - `arbres_clean.csv`
  - `arrets.csv`
  - `logements-sociaux-finances-a-paris.csv`
  - `number_logement.csv`
  - `ValeursFoncieres.csv`

### Launching the Pipeline

1.  Start the API (follow the instructions in the API's `README`).
2.  Open a terminal and run:

    ```bash
    cd transform/agregation
    python pipeline_agregation.py
    ```

### 🏁 Results

Running the script will produce the following outputs:

- Tables will be created in the API's MySQL storage like gold_table_name.
