import pandas as pd

pd.set_option('display.max_columns', None)

def filter_arbres():
    try:
        df = pd.read_csv("../../data/bronze/les-arbres.NxlKJoRt.csv.part",
                     sep=";", encoding="utf-8", on_bad_lines="skip")

        df = df[["ARRONDISSEMENT", "GENRE", "ESPECE", "HAUTEUR (m)","geo_point_2d"]].dropna()

        df["ARRONDISSEMENT"] = (
            df["ARRONDISSEMENT"]
            .replace("BOIS DE VINCENNES", "PARIS 12E ARRDT")
            .astype(str)
            .str.extract(r"(\d+)")[0]
        )

        df = df.rename(columns={"ARRONDISSEMENT": "arrondissement", "GENRE": "genre", "ESPECE": "espece", "HAUTEUR (m)": "hauteur"})
        df = df.dropna()

        df.to_csv("../../data/silver/arbres_clean.csv", sep=",", index=False, encoding="utf-8")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    filter_arbres()