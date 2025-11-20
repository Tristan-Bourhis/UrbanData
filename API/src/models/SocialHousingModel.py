from bd import get_db_connection
from flask import jsonify

def getSocialHousingModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT arrondissement, nombre_logements_sociaux, nombre_total_logements, ratio_logements_sociaux_pourcent FROM gold_social_housing_par_arrondissement_par_an;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400