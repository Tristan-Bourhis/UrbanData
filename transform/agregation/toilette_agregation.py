import mysql.connector
from mysql.connector import Error

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def toilette_agregation():
    try:
        connection = mysql.connector.connect(**config)
        if connection.is_connected():
            cursor = connection.cursor()

            drop_query = "DROP TABLE IF EXISTS gold_nombre_toilette_par_arrondissement;"
            create_query = """
            CREATE TABLE gold_nombre_toilette_par_arrondissement AS
            SELECT arrondissement, COUNT(*) AS nombre
            FROM silver_toilette
            GROUP BY arrondissement;
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
    toilette_agregation()
