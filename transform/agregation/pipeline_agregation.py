import time
from social_housing_agregation import social_housing_agregation
from toilette_agregation import toilette_agregation

config = {
    'user': 'flaskuser',
    'password': 'flaskpass',
    'host': 'localhost',
    'database': 'flaskdb',
}

def pipeline():
    paths = []

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

if __name__ == "__main__":
    pipeline()
