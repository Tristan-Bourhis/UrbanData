from bd import get_db_connection
from flask import jsonify

def getTreeModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT * FROM gold_tree;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400
    

def getTreeNumberModel():
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor(dictionary=True, buffered=True)
        mycursor.execute("SELECT arrondissement, count(*) as nombre_arbre FROM gold_tree GROUP BY arrondissement;")
        myresult = mycursor.fetchall()
        mycursor.close()
        mydb.close()
        return myresult
    except Exception as e:
        return jsonify(error=str(e)), 400