from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
USERNAME = os.getenv("USERNAME")
PASSWORD = os.getenv("PASSWORD")
HOST = os.getenv("HOST")
PORT = os.getenv("PORT")
DATABASE_NAME = os.getenv("DATABASE_NAME")

DB_CONFIG = {
    "user": USERNAME,
    "password": PASSWORD,
    "host": HOST,
    "port": PORT,
    "dbname": DATABASE_NAME
}