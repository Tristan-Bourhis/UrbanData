import pandas as pd

def trim_arrondissement(s):
    s = str(s)
    s = s[3:]
    if s.startswith("0"):
        s = s[1:] 
    return s

def toilette_filter():
    try: 
        toilette_path = "../../data/bronze/sanisettesparis.csv"
        toilette = pd.read_csv(
            toilette_path,
            sep=';',                
            encoding='utf-8',        
            on_bad_lines='skip'     
        )
        
        filtered_toilette = toilette[["ARRONDISSEMENT", "geo_point_2d"]].dropna()
        filtered_toilette['ARRONDISSEMENT'] = filtered_toilette['ARRONDISSEMENT'].apply(trim_arrondissement)
        filtered_toilette = filtered_toilette.drop_duplicates(subset=["geo_point_2d"])
        filtered_toilette = filtered_toilette.rename(columns={"ARRONDISSEMENT": "arrondissement"})

        filtered_toilette.to_csv("../../data/gold/sanisettesparis.csv")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    toilette_filter()
