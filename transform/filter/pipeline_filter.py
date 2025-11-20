import csv
import mysql.connector
import time
from logement_filter import logement_filter
from toilette_filter import toilette_filter
from transport_filter import transport_filter
from arbres_filter import filter_arbres
from valeursFoncieres import process_valeurs_foncieres
from number_logement import number_logement_filter

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def pipeline():
    paths = []

    try:
        logement_filter()
        print("Social housing pipeline finished")
        paths.append({
            "path": "../../data/silver/logements-sociaux-finances-a-paris.csv",
            "table_name": "silver_social_housing"
        })
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        toilette_filter()
        print("Toilette pipeline finished")
        paths.append({
            "path": "../../data/gold/sanisettesparis.csv",
            "table_name": "silver_toilette"
        })
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        transport_filter()
        print("Transport pipeline finished")
        paths.append({
            "path": "../../data/silver/arrets.csv",
            "table_name": "silver_transport"
        })
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        filter_arbres()
        print("Tree pipeline finished")
        paths.append({
            "path": "../../data/silver/arbres_clean.csv",
            "table_name": "silver_tree"
        })
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        process_valeurs_foncieres()
        print("Land value pipeline finished")
        paths.append({
            "path": "../../data/silver/ValeursFoncieres.csv",
            "table_name": "silver_land_value"
        })
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        number_logement_filter()
        print("Housing number pipeline finished")
        paths.append({
            "path": "../../data/silver/number_logement.csv",
            "table_name": "silver_housing_number"
        })
    except Exception as e:
        print(e)

    time.sleep(3)

    csv_to_mysql(paths)


def csv_to_mysql(paths):
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()

    for obj in paths:
        path = obj["path"]
        table_name = obj["table_name"]

        try:
            with open(path, 'r', encoding='utf-8-sig') as csvfile:
                sample = csvfile.read(2048)
                csvfile.seek(0)
                dialect = csv.Sniffer().sniff(sample)
                reader = csv.reader(csvfile, dialect)
                headers = next(reader)
                columns = [
                    h.strip().replace(" ", "_").replace("-", "_")
                    for h in headers if h.strip() != ""
                ]

                if not columns:
                    raise ValueError(f"Not column find {path}")

                create_table_query = f"""
                create table if not exists `{table_name}` (
                    {', '.join(f'`{c}` varchar(255)' for c in columns)}
                );
                """
                cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`")
                cursor.execute(create_table_query)

                placeholders = ', '.join(['%s'] * len(columns))
                safe_columns = ', '.join(f"`{c}`" for c in columns)
                insert_query = f"insert into `{table_name}` ({safe_columns}) values ({placeholders})"

                row_count = 0
                for row in reader:
                    if len(row) < len(headers):
                        row += [""] * (len(headers) - len(row))
                    cleaned_row = [row[i] for i in range(len(headers)) if headers[i].strip() != ""]
                    if len(cleaned_row) == len(columns):
                        cursor.execute(insert_query, cleaned_row)
                        row_count += 1
                    else:
                        print(f"Warning: Row has {len(cleaned_row)} values but {len(columns)} expected")

                conn.commit()
                print(f"Import finished for {table_name}: {row_count} rows imported")

        except Exception as e:
            print(f"Error importing {table_name}: {e}")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    pipeline()
