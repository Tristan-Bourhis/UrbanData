from bd import get_db_connection
from flask import jsonify

def getLandValueModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT * FROM gold_land_value;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400