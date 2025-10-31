import pandas as pd

def logement_filter():
    try:
        logement_path = "../../data/bronze/logements-sociaux-finances-a-paris.csv"
        logement = pd.read_csv(
            logement_path,
            sep=';',                
            encoding='utf-8',        
            on_bad_lines='skip'     
        )
        
        filtered_logement = logement[["Identifiant livraison", "Arrondissement", "Année du financement - agrément", "Nombre total de logements financés", "geo_point_2d"]].dropna()
        filtered_logement = filtered_logement.drop_duplicates(subset=["geo_point_2d"])
        filtered_logement = filtered_logement.rename(columns={"Identifiant livraison": "id", "Arrondissement": "arrondissement", "Année du financement - agrément": "annee_financement", "Nombre total de logements financés": "nombre_logement"})

        filtered_logement.to_csv("../../data/silver/logements-sociaux-finances-a-paris.csv")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    logement_filter()
