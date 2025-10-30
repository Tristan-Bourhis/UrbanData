import pandas as pd

def trim_arrondissement(s):
    s = str(s)
    s = s[3:]
    if s.startswith("0"):
        s = s[1:] 
    return s

def transport_filter():
    transport_path = "../../data/bronze/arrets.csv"
    transport = pd.read_csv(
        transport_path,
        sep=';',                
        encoding='utf-8',        
        on_bad_lines='skip'     
    )
    
    filtered_transport = transport[["ArRId", "ArRType", "ArRName", "ArRPostalRegion", "ArRGeopoint"]].dropna()
    filtered_transport = filtered_transport[filtered_transport['ArRPostalRegion'].astype(str).str.startswith("75")]
    filtered_transport['ArRPostalRegion'] = filtered_transport['ArRPostalRegion'].apply(trim_arrondissement)
    filtered_transport = filtered_transport.drop_duplicates(subset=["ArRGeopoint"])
    filtered_transport = filtered_transport.rename(columns={"ArRId": "id", "ArRType": "type", "ArRName": "nom", "ArRPostalRegion": "arrondissement", "ArRGeopoint": "geo_point_2d"})

    filtered_transport.to_csv("../../data/silver/arrets.csv")

if __name__ == "__main__":
    transport_filter()
