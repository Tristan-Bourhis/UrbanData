import pandas as pd

def number_logement_filter():
    file_path_arm = "../../data/bronze/TD_PRINC1_2022.xlsx"

    df_arm = pd.read_excel(file_path_arm, sheet_name='ARM', header=10)

    cols_to_sum = df_arm.columns[2:]
    df_arm[cols_to_sum] = df_arm[cols_to_sum].apply(pd.to_numeric, errors='coerce')
    df_arm['nombre_logements'] = df_arm[cols_to_sum].fillna(0).sum(axis=1)

    df_result = df_arm[['LIBGEO', 'nombre_logements']].copy()
    df_result.rename(columns={'LIBGEO': 'arrondissement'}, inplace=True)
    df_paris = df_result[df_result['arrondissement'].str.contains('Paris', na=False)].copy()
    df_paris['nombre_logements'] = df_paris['nombre_logements'].round().astype(int)
    df_paris['arrondissement'] = df_paris['arrondissement'].astype(str).str.extract(r"(\d+)")[0].astype(int)

    output_path = "../../data/silver/number_logement.csv"
    df_paris.to_csv(output_path, index=False, sep=',', decimal='.') 


if __name__ == "__main__":
    number_logement_filter()