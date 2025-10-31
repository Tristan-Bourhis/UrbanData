import csv
import os
import re

def process_valeurs_foncieres(start_year=2020, end_year=2025):
    """
    Transforme les fichiers DVF ValeursFoncieres-YYYY.txt :
    - Filtre le département 75
    - Convertit Code postal -> Arrondissement
    - Supprime les lignes sans surface Carrez ou avec Surface reelle bati = 0
    - Supprime colonnes inutiles
    - Renomme certaines colonnes en minuscules avec underscores
    - Produit un seul fichier CSV consolidé
    """

    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_folder = os.path.join(base_dir, "..", "..", "data", "bronze", "foncieres")
    output_folder = os.path.join(base_dir, "..", "..", "data", "silver")
    os.makedirs(output_folder, exist_ok=True)
    output_file = os.path.join(output_folder, "ValeursFoncieres.csv")

    filter_column = "Code departement"
    filter_value = "75"

    columns_to_exclude = {
        "Identifiant de document", "Reference document",
        "1 Articles CGI", "2 Articles CGI", "3 Articles CGI",
        "4 Articles CGI", "5 Articles CGI", "No disposition",
        "Nature mutation", "No voie", "B/T/Q", "Type de voie",
        "Code voie", "Voie", "Commune", "Code departement",
        "Code commune", "Prefixe de section", "Section",
        "No plan", "No Volume", "Code type local",
        "Identifiant local", "Nature culture", "Nature culture speciale", "Surface terrain",
        "Surface reelle bati", "1er lot", "2eme lot", "3eme lot", "4eme lot", "5eme lot",
        "Nombre de lots"
    }

    # Colonnes à renommer (minuscules et underscores)
    rename_map = {
        "Date mutation": "date",
        "Valeur fonciere": "prix",
        "Arrondissement": "arrondissement",
        "Surface Carrez du 1er lot": "surface_carrez_du_1er_lot",
        "Surface Carrez du 2eme lot": "surface_carrez_du_2eme_lot",
        "Surface Carrez du 3eme lot": "surface_carrez_du_3eme_lot",
        "Surface Carrez du 4eme lot": "surface_carrez_du_4eme_lot",
        "Surface Carrez du 5eme lot": "surface_carrez_du_5eme_lot",
        "Type local": "type_local",
        "Nombre pieces principales": "nombre_pieces_principales"
    }

    all_rows = []
    output_headers = None

    for year in range(start_year, end_year + 1):
        input_path = os.path.join(input_folder, f"ValeursFoncieres-{year}.txt")
        if not os.path.exists(input_path):
            print(f"[{year}] Fichier {input_path} non trouvé, passage à l'année suivante.")
            continue

        try:
            with open(input_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f, delimiter='|')
                headers = next(reader)
                headers = [h.strip() for h in headers]

                idx_code_dept = headers.index(filter_column)
                idx_code_postal = headers.index("Code postal")
                idx_surface_bati = headers.index("Surface reelle bati") if "Surface reelle bati" in headers else None

                # Colonnes Surface Carrez
                surface_cols = [i for i, h in enumerate(headers) if "Surface Carrez" in h]

                # Colonnes à garder
                indices_to_keep = [i for i, h in enumerate(headers) if h not in columns_to_exclude]

                if output_headers is None:
                    out_hdrs = [headers[i] for i in indices_to_keep]
                    # remplacer Code postal par Arrondissement
                    if "Code postal" in out_hdrs:
                        idx_cp = out_hdrs.index("Code postal")
                        out_hdrs[idx_cp] = "Arrondissement"

                    # appliquer le renommage
                    out_hdrs = [rename_map.get(h, h) for h in out_hdrs]
                    output_headers = out_hdrs

                for row in reader:
                    row = [c.strip() for c in row]
                    if len(row) < len(headers):
                        row += [""] * (len(headers) - len(row))

                    # filtre département
                    if row[idx_code_dept] != filter_value:
                        continue

                    # au moins une surface Carrez
                    has_surface = any(row[i].strip() != "" for i in surface_cols)
                    if not has_surface:
                        continue

                    # vérifier surface réelle bati
                    if idx_surface_bati is not None:
                        try:
                            if float(row[idx_surface_bati].replace(",", ".")) == 0:
                                continue
                        except ValueError:
                            continue

                    # calcul arrondissement
                    arrondissement = ""
                    m = re.search(r"(\d{5})", row[idx_code_postal])
                    if m:
                        cp = m.group(1)
                        if cp.startswith("75"):
                            try:
                                arr = int(cp[3:5])
                                if 1 <= arr <= 20:
                                    arrondissement = str(arr)
                            except Exception:
                                pass

                    # construire ligne de sortie
                    out_row = [row[i] for i in indices_to_keep]
                    if "Code postal" in [headers[i] for i in indices_to_keep]:
                        idx_cp_out = [headers[i] for i in indices_to_keep].index("Code postal")
                        out_row[idx_cp_out] = arrondissement

                    all_rows.append(out_row)

            # print(f"[{year}] lignes filtrées : {len(all_rows)}")

        except Exception as e:
            print(f"[{year}] Erreur : {e}")

    # Écriture CSV final
    if all_rows:
        if os.path.exists(output_file):
            os.remove(output_file)
        with open(output_file, "w", newline="", encoding="utf-8-sig") as f_out:
            writer = csv.writer(f_out, delimiter=',')
            writer.writerow(output_headers)
            writer.writerows(all_rows)

        # print(f"\n✅ Fichier CSV final créé : {output_file}, total lignes : {len(all_rows)}")
    else:
        print("⚠️ Aucune donnée valide à écrire.")

if __name__ == "__main__":
    process_valeurs_foncieres()
