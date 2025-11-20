from bd import get_db_connection
from flask import jsonify

def getLandValueModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT arrondissement, EXTRACT(YEAR FROM date_mutation) AS annee, AVG(prix) AS prix_moyen, AVG(nombre_pieces_principales) AS nb_pieces_moyen, AVG(prix_m2) AS prix_m2_moyen, AVG(surface_total) AS surface_totale_moyenne FROM gold_land_value GROUP BY arrondissement, EXTRACT(YEAR FROM date_mutation) ORDER BY annee DESC, arrondissement ASC;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400