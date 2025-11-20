import time
from social_housing_agregation import social_housing_agregation
from toilette_agregation import toilette_agregation
from transport_agregate import transport_agregation
from tree_agregation import tree_agregation
from valeursFoncieres_agregation import valeursFoncieres_agregation

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def pipeline():
    try:
        social_housing_agregation()
        print("Social housing pipeline finished")
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        toilette_agregation()
        print("Toilette pipeline finished")
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        transport_agregation()
        print("Transport pipeline finished")
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        tree_agregation()
        print("Tree pipeline finished")
    except Exception as e:
        print(e)

    time.sleep(3)

    try:
        valeursFoncieres_agregation()
        print("Valeurs Foncieres pipeline finished")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    pipeline()
