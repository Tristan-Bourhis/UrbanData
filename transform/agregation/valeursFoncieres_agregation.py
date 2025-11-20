import mysql.connector
from mysql.connector import Error

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def valeursFoncieres_agregation():
    try:
        connection = mysql.connector.connect(**config)
        if connection.is_connected():
            cursor = connection.cursor()

            drop_query = "DROP TABLE IF EXISTS gold_land_value;"
            create_query = """
            CREATE TABLE gold_land_value AS
            SELECT
                date_mutation,
                CAST(REPLACE(NULLIF(prix, ''), ',', '.') AS DECIMAL(15,2)) AS prix,
                arrondissement,
                type_local,
                nombre_pieces_principales,
                (
                    COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_1er_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                    COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_2eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                    COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_3eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                    COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_4eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                    COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_5eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0)
                ) AS surface_total,
                (
                    CAST(REPLACE(NULLIF(prix, ''), ',', '.') AS DECIMAL(15,2)) /
                    NULLIF(
                        COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_1er_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                        COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_2eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                        COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_3eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                        COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_4eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0) +
                        COALESCE(CAST(REPLACE(NULLIF(surface_carrez_du_5eme_lot, ''), ',', '.') AS DECIMAL(15,2)), 0),
                        0
                    )
                ) AS prix_m2
            FROM silver_land_value;
            """

            cursor.execute(drop_query)
            cursor.execute(create_query)
            connection.commit()

    except Error as e:
        print(e)

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    valeursFoncieres_agregation()
