import mysql.connector
from mysql.connector import Error

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def tree_agregation():
    try:
        connection = mysql.connector.connect(**config)
        if connection.is_connected():
            cursor = connection.cursor()

            drop_query = "DROP TABLE IF EXISTS gold_tree;"
            create_query = """
            CREATE TABLE gold_tree AS
            SELECT arrondissement, espece, hauteur, geo_point_2d
            FROM silver_tree
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
    tree_agregation()
