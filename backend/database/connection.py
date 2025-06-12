import psycopg2
from typing import List, Tuple, Dict, Any

class DatabaseConnection:
    def __init__(self, db_config):
        self.db_config = db_config
        self.connection = None
        self._cursor = None

    def connect(self):
        try:
            self.connection = psycopg2.connect(**self.db_config)
            return self.connection
        except Exception as e:
            print(f"Error connecting to database: {e}")
            raise

    def fetch_data(self, query):
        try:
            self._cursor = self.connection.cursor()
            self._cursor.execute(query)
            data = self._cursor.fetchall()
            column_names = [desc[0] for desc in self._cursor.description] if self._cursor.description else []
            return {'data': data, 'columns': column_names}
        except Exception as e:
            print(f"Error executing query: {e}")
            raise
        finally:
            if self._cursor:
                self._cursor.close()

    def close(self):
        if self.connection:
            self.connection.close()