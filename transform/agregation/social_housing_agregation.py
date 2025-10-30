import mysql.connector
from mysql.connector import Error

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def social_housing_agregation():
    try:
        connection = mysql.connector.connect(**config)
        if connection.is_connected():
            cursor = connection.cursor()

            drop_query = "DROP TABLE IF EXISTS gold_social_housing_par_arrondissement_par_an;"
            create_table = """
            CREATE TABLE gold_social_housing_par_arrondissement_par_an AS
            SELECT
                ssh.arrondissement,               
                SUM(ssh.nombre_logement) AS nombre_logements_sociaux,
                shn.nombre_logements AS nombre_total_logements,
                ROUND(
                    (CAST(SUM(ssh.nombre_logement) AS DECIMAL(10,2)) / NULLIF(shn.nombre_logements, 0)) * 100,
                    2
                ) AS ratio_logements_sociaux_pourcent
            FROM silver_social_housing AS ssh
            LEFT JOIN silver_housing_number AS shn
                ON ssh.arrondissement = shn.arrondissement
            GROUP BY
                ssh.arrondissement,
                shn.nombre_logements
            ORDER BY
                ssh.arrondissement;
            """

            cursor.execute(drop_query)
            cursor.execute(create_table)
            connection.commit()

    except Error as e:
        print(e)

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    social_housing_agregation()
