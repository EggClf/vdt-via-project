import datetime
from zoneinfo import ZoneInfo
from google.adk.agents import Agent
from llama_index.llms.openai import OpenAI
import json
from google.adk.tools import ToolContext
import json
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core import Document
from llama_index.retrievers.bm25 import BM25Retriever
import Stemmer
from .prompts import return_instructions
import os
from dotenv import load_dotenv
load_dotenv()


# Load table data
with open('ddl.json', 'r', encoding="utf-8") as f:
    data = json.load(f)

candidates = [item['table_name'] for item in data if 'table_name' in item]
with open("tables_info.json", "r", encoding="utf-8") as f:
    metadata = json.load(f)
table_to_questions = {}
for item in metadata:
    if 'table_name' in item and 'sample_questions' in item:
        table_to_questions[item['table_name']] = item['sample_questions']



documents = []
for item in data:
    if 'table_name' in item and 'ddl_statement' in item:
        table_name = item['table_name']
        ddl_statement = item['ddl_statement']
        
        # Get sample questions for this table if available
        sample_questions = table_to_questions.get(table_name, [])
        
        # Create document text with both DDL and sample questions
        document_text = f"Table: {table_name}\n\nDDL Statement:\n{ddl_statement}"
        if sample_questions:
            questions_text = "\n\nSample Questions:\n" + "\n".join([f"- {q}" for q in sample_questions])
            document_text += questions_text
        
        documents.append(Document(text=document_text,metadata={
            "table_name": table_name
        }))
splitter = SentenceSplitter(chunk_size=5000)

# Get nodes from documents
nodes = splitter.get_nodes_from_documents(documents)

# Create BM25 retriever
bm25_retriever = BM25Retriever.from_defaults(
    nodes=nodes,
    similarity_top_k=2,
    stemmer=Stemmer.Stemmer("english"),
    language="english",
)
def get_ddl_template(table_1: str, table_2: str, tool_context: ToolContext) -> dict:
    """Generates a DDL template for the provided table names.
    
    Args:
        table_1 (str): The name of the first table for which to generate the DDL template.
        table_2 (str): The name of the second table for which to generate the DDL template.

    Returns:
        dict: A dictionary containing status and ddl_template.
    """
    # Load the DDL templates from the ddl.json file
    try:
        with open('ddl.json', 'r', encoding="utf-8") as f:
            ddl_data = json.load(f)
    except FileNotFoundError:
        return {
            "status": "error",
            "ddl_template": "DDL template file (ddl.json) not found."
        }
    except json.JSONDecodeError:
        return {
            "status": "error",
            "ddl_template": "Invalid JSON format in the DDL template file."
        }
    
    # Find the DDL templates for the specified table names
    table_1_ddl = None
    table_2_ddl = None
    
    for table_info in ddl_data:
        if table_info.get('table_name') == table_1:
            table_1_ddl = table_info.get('ddl_statement')
        elif table_info.get('table_name') == table_2:
            table_2_ddl = table_info.get('ddl_statement')
        
        # If both DDLs are found, break the loop
        if table_1_ddl and table_2_ddl:
            break
    
    # Check if both DDL templates were found
    if table_1_ddl and table_2_ddl:
        tool_context.state["ddl_template"]={
                "table_1": table_1_ddl,
                "table_2": table_2_ddl
        }
        return {
            "status": "success",
            "ddl_template": {
                "table_1": table_1_ddl,
                "table_2": table_2_ddl
            }
        }
    else:
        return {
            "status": "error",
            "ddl_template": "either or both table DDL templates not found."
        }
    
def get_tables_relevant_to_query(query: str) -> dict:
    """Extracts table names relevant to the query.
    
    Args:
        query (str): The SQL query string.

    Returns:
        dict: A dictionary containing status and list of table names.
    """
    
    
    # Retrieve relevant nodes for the query
    retrieved_nodes = bm25_retriever.retrieve(query)
    
    # Extract table names from retrieved nodes
    relevant_tables = []
    for node in retrieved_nodes:
        if "table_name" in node.metadata:
            relevant_tables.append(node.metadata["table_name"])
    
    # Remove duplicates while preserving order
    unique_tables = []
    for table in relevant_tables:
        if table not in unique_tables:
            unique_tables.append(table)
    
    return {
        "status": "success",
        "tables": unique_tables
    }


def initial_bq_nl2sql(
    question: str,
    tool_context: ToolContext,
) -> str:
    """Generates an initial SQL query from a natural language question.

    Args:
        question (str): Natural language question.
        tool_context (ToolContext): The tool context to use for generating the SQL
          query.

    Returns:
        str: An SQL statement to answer this question.
    """

    prompt_template = """
You are a PostgreSQL expert tasked with answering user's questions about database tables by generating SQL queries. Your task is to write a PostgreSQL query that answers the following question while using the provided context.

**Guidelines:**

- **Table Referencing:** Use schema-qualified names where appropriate in the SQL statement. Tables should be referred to using the format `schema_name.table_name`. Table names in PostgreSQL are typically case-insensitive unless quoted with double quotes.
- **Joins:** Join as few tables as possible. When joining tables, ensure all join columns are the same data type. Analyze the database and the table schema provided to understand the relationships between columns and tables.
- **Aggregations:** Use all non-aggregated columns from the `SELECT` statement in the `GROUP BY` clause.
- **SQL Syntax:** Return syntactically and semantically correct SQL for PostgreSQL. Use SQL `AS` statement to assign a new name temporarily to a table column or table wherever needed. Always enclose subqueries and union queries in parentheses.
- **Column Usage:** Use *ONLY* the column names (column_name) mentioned in the Table Schema. Do *NOT* use any other column names. Associate `column_name` mentioned in the Table Schema only to the `table_name` specified under Table Schema.
- **FILTERS:** You should write queries effectively to reduce and minimize the total rows to be returned. For example, use filters (like `WHERE`, `HAVING`, etc.) and aggregation functions (like 'COUNT', 'SUM', etc.) in the SQL query.
- **LIMIT ROWS:** The maximum number of rows returned should be less than {MAX_NUM_ROWS}.

**Schema:**

The database structure is defined by the following table schemas (possibly with sample rows):

```
{SCHEMA}
```

**Natural language question:**

```
{QUESTION}
```

**Think Step-by-Step:** Carefully consider the schema, question, guidelines, and best practices outlined above to generate the correct PostgreSQL SQL.
   """

    ddl_schema = tool_context.state["ddl_template"]

    prompt = prompt_template.format(
        MAX_NUM_ROWS=5, SCHEMA=ddl_schema, QUESTION=question
    )

    llm = OpenAI(
    model="gpt-4o-mini",
    temperature=0.1,
)


    response = llm.complete(prompt)
    sql = response.text
    if sql:
        sql = sql.replace("```sql", "").replace("```", "").strip()

    print("\n sql:", sql)

    tool_context.state["sql_query"] = sql

    return sql

root_agent = Agent(
    name="data_science_agent",
    model="gemini-2.0-flash",
    description=(
        "You are useful assistant for data science tasks. "
    ),
    instruction=return_instructions(),
    tools=[get_tables_relevant_to_query, get_ddl_template,initial_bq_nl2sql],
)