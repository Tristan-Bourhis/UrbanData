import csv
import mysql.connector
import time
from air_quality_filter import air_quality_filter
from logement_filter import logement_filter
from toilette_filter import toilette_filter
from transport_filter import transport_filter

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}


def pipeline():
    paths = []
    try:
        air_quality_filter()
        print("Air quality pipeline finished")
        paths.append({
            "path": "../../data/silver/air_quality.csv",
            "table_name": "silver_air_quality"
        })
    except Exception as e:
        print(e)

    time.sleep(3)

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

    csv_to_mysql(paths)


def csv_to_mysql(paths):
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()

    for obj in paths:
        path = obj["path"]
        table_name = obj["table_name"]

        try:
            with open(path, 'r', encoding='utf-8') as csvfile:
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
                cursor.execute(create_table_query)
                cursor.execute(f"truncate table `{table_name}`")

                placeholders = ', '.join(['%s'] * len(columns))
                safe_columns = ', '.join(f"`{c}`" for c in columns)
                insert_query = f"insert into `{table_name}` ({safe_columns}) values ({placeholders})"

                for row in reader:
                    cleaned_row = [v for i, v in enumerate(row) if headers[i].strip() != ""]
                    cursor.execute(insert_query, cleaned_row)

                conn.commit()
                print(f"Import finished for {table_name}")

        except Exception as e:
            print(e)

    cursor.close()
    conn.close()


if __name__ == "__main__":
    pipeline()
