from bd import get_db_connection
from flask import jsonify

def getNumberStationByAModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT * FROM gold_nombre_arrets_par_arrondissement;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400
    

def getRatioTypeStationByAModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT arrondissement, type, nombre_arrets_par_type, pourcentage_du_total FROM gold_ratio_types_transports_par_arrondissement;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400
    
def getStationspointsModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT type, nom, geo_point_2d FROM silver_transport;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400