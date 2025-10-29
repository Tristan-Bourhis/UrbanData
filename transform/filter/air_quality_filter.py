import pandas as pd
import json

def flatten_feature(feature):
    flat = {}
    flat["id"] = feature.get("id")
    flat["geometry_name"] = feature.get("geometry_name")
    
    geom = feature.get("geometry", {})
    flat["geometry_type"] = geom.get("type")
    coords = geom.get("coordinates", [None, None])
    flat["coord_x"] = coords[0]
    flat["coord_y"] = coords[1]
    
    properties = feature.get("properties", {})
    for k, v in properties.items():
        flat[k] = v
    
    return flat

def air_quality_filter():
    air_quality_path = "../../data/bronze/air_quality.json"

    with open(air_quality_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    flat_features = [flatten_feature(f) for f in data["features"]]
    air_quality = pd.DataFrame(flat_features)

    filtered_air_quality = air_quality[["coord_x", "coord_y", "valeur", "qualif", "val_no2", "val_pm10", "val_o3", "val_so2", "val_pm25"]].dropna()

    filtered_air_quality.to_csv("../../data/silver/air_quality.csv")

if __name__ == "__main__":
    air_quality_filter()
