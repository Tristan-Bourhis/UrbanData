# UrbanData

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
