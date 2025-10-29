import json
import pandas as pd
pd.set_option('display.max_columns', None)

arbre_path = "../data/bronze/Arbre/les-arbres.NxlKJoRt.csv.part"
logement_sociaux_path = "../data/bronze/Part_de_logements_sociaux/logements-sociaux-finances-a-paris.csv"

valeur_fonciere_2024_path = "../data/bronze/Prix_m_médian/ValeursFoncieres-2024-75.csv"

proximite_transport_path = "../data/bronze/Proximite_transports/arrets.csv"
air_quality_path = "../data/bronze/Qualité_air/air_quality.json"
toilette_path = "../data/bronze/Toilette/sanisettesparis.csv"

print('\n\n----------------------------------------------')
print("Arbre data : \n")
arbre = pd.read_csv(
    arbre_path,
    sep=';',                
    encoding='utf-8',        
    on_bad_lines='skip'     
)
print(list(arbre.columns))

print('\n\n----------------------------------------------')
print("Logement sociaux data : \n")
logement_sociaux = pd.read_csv(
    logement_sociaux_path,
    sep=';',                
    encoding='utf-8',        
    on_bad_lines='skip'     
)
print(list(logement_sociaux.columns))

print('\n\n----------------------------------------------')
print("Proximité transport data : \n")
proximite_transport = pd.read_csv(
    proximite_transport_path,
    sep=';',                
    encoding='utf-8',        
    on_bad_lines='skip'     
)
print(list(proximite_transport.columns))


print('\n\n----------------------------------------------')
print("Toilette data : \n")
toilette = pd.read_csv(
    toilette_path,
    sep=';',                
    encoding='utf-8',        
    on_bad_lines='skip'     
)
print(list(toilette.columns))


print('\n\n----------------------------------------------')
print("Valeure foncières data : \n")
valeur_fonciere_2024 = pd.read_csv(
    valeur_fonciere_2024_path,
    sep=';',                
    encoding='utf-8',        
    on_bad_lines='skip'     
)
print(list(valeur_fonciere_2024.columns))


print('\n\n----------------------------------------------')
print("Air quality data : \n")
with open(air_quality_path, "r", encoding="utf-8") as f:
    data = json.load(f)

def flatten_feature(feature):
    flat = {}
    # Id et geometry_name
    flat["id"] = feature.get("id")
    flat["geometry_name"] = feature.get("geometry_name")
    
    # Géométrie
    geom = feature.get("geometry", {})
    flat["geometry_type"] = geom.get("type")
    coords = geom.get("coordinates", [None, None])
    flat["coord_x"] = coords[0]
    flat["coord_y"] = coords[1]
    
    # Propriétés
    properties = feature.get("properties", {})
    for k, v in properties.items():
        flat[k] = v
    
    return flat

flat_features = [flatten_feature(f) for f in data["features"]]
air_quality = pd.DataFrame(flat_features)
print(list(air_quality.columns))