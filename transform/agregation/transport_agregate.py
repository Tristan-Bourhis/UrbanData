import mysql.connector
from mysql.connector import Error

# Configuration de la base de données
config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def transport_agregation():
    """
    Crée les deux tables agrégées pour les indicateurs de transport.
    """
    # print("\nDébut de l'agrégation des transports...")
    connection = None # Initialiser la connexion en dehors du try
    try:
        connection = mysql.connector.connect(**config)
        if connection.is_connected():
            cursor = connection.cursor()

            # --- Indicateur 1: Nombre total d'arrêts par arrondissement ---
            drop_query_1 = "DROP TABLE IF EXISTS gold_nombre_arrets_par_arrondissement;"
            create_query_1 = """
            CREATE TABLE gold_nombre_arrets_par_arrondissement AS
            SELECT
                arrondissement,
                COUNT(*) AS nombre_total_arrets
            FROM
                silver_transport
            GROUP BY
                arrondissement
            ORDER BY
                arrondissement;
            """
            cursor.execute(drop_query_1)
            cursor.execute(create_query_1)
            # print("-> Table 'gold_nombre_arrets_par_arrondissement' créée avec succès.")

            # --- Indicateur 2: Ratio des types de transport par arrondissement ---
            drop_query_2 = "DROP TABLE IF EXISTS gold_ratio_types_transports_par_arrondissement;"
            create_query_2 = """
            CREATE TABLE gold_ratio_types_transports_par_arrondissement AS
            SELECT
                arrondissement,
                type,
                COUNT(*) AS nombre_arrets_par_type,
                SUM(COUNT(*)) OVER (PARTITION BY arrondissement) AS total_arrets_arrondissement,
                
                -- Calcule le ratio en pourcentage (ex: (10 / 50) * 100)
                (COUNT(*) * 100.0) / SUM(COUNT(*)) OVER (PARTITION BY arrondissement) AS pourcentage_du_total
            FROM
                silver_transport
            GROUP BY
                arrondissement, type
            ORDER BY
                arrondissement, pourcentage_du_total DESC;
            """
            cursor.execute(drop_query_2)
            cursor.execute(create_query_2)
            # print("-> Table 'gold_ratio_types_transports_par_arrondissement' créée avec succès.")

            # Valider les deux créations de table
            connection.commit()

    except Error as e:
        print(f"Erreur lors de l'agrégation des transports: {e}")
    finally:
        # S'assurer que la connexion est fermée, même en cas d'erreur
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            # print("Connexion (transports) fermée.")


if __name__ == "__main__":
    transport_agregation()
    # print("\n--- Pipeline d'agrégation terminé ---")