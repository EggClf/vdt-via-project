

"""This code contains the implementation of the tools used for the CHASE-SQL agent."""

import enum
import os

from google.adk.tools import ToolContext

# pylint: disable=g-importing-member
from .dc_prompt_template import DC_PROMPT_TEMPLATE
from .llm_utils import GeminiModel
from .qp_prompt_template import QP_PROMPT_TEMPLATE
from .sql_postprocessor import sql_translator

# pylint: enable=g-importing-member

DB_SCHEMA_PREFIX = os.getenv("DB_SCHEMA_PREFIX", "public")


class GenerateSQLType(enum.Enum):
    """Enum for the different types of SQL generation methods.

    DC: Divide and Conquer ICL prompting
    QP: Query Plan-based prompting
    """

    DC = "dc"
    QP = "qp"


def exception_wrapper(func):
    """A decorator to catch exceptions in a function and return the exception as a string.

    Args:
       func (callable): The function to wrap.

    Returns:
       callable: The wrapped function.
    """

    def wrapped_function(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:  # pylint: disable=broad-exception-caught
            return f"Exception occurred in {func.__name__}: {str(e)}"

    return wrapped_function


def parse_response(response: str) -> str:
    """Parses the output to extract SQL content from the response.

    Args:
       response (str): The output string containing SQL query.

    Returns:
       str: The SQL query extracted from the response.
    """
    query = response
    try:
        if "```sql" in response and "```" in response:
            query = response.split("```sql")[1].split("```")[0]
    except ValueError as e:
        print(f"Error in parsing response: {e}")
        query = response
    return query.strip()


def initial_bq_nl2sql(
    question: str,
    tool_context: ToolContext,
) -> str:
    """Generates an initial SQL query from a natural language question.

    Args:
      question: Natural language question.
      tool_context: Function context.

    Returns:
      str: An SQL statement to answer this question.
    """
    print("****** Running agent with ChaseSQL algorithm.")
    ddl_schema = tool_context.state["database_settings"]["postgresql_ddl_schema"]
    schema = tool_context.state["database_settings"]["schema_name"]
    transpile_to_postgresql = tool_context.state["database_settings"][
        "transpile_to_postgresql"
    ]
    process_input_errors = tool_context.state["database_settings"][
        "process_input_errors"
    ]
    process_tool_output_errors = tool_context.state["database_settings"][
        "process_tool_output_errors"
    ]
    number_of_candidates = tool_context.state["database_settings"][
        "number_of_candidates"
    ]
    model = tool_context.state["database_settings"]["model"]
    temperature = tool_context.state["database_settings"]["temperature"]
    generate_sql_type = tool_context.state["database_settings"]["generate_sql_type"]

    if generate_sql_type == GenerateSQLType.DC.value:
        prompt = DC_PROMPT_TEMPLATE.format(
            SCHEMA=ddl_schema, QUESTION=question, DB_SCHEMA_PREFIX=DB_SCHEMA_PREFIX
        )
    elif generate_sql_type == GenerateSQLType.QP.value:
        prompt = QP_PROMPT_TEMPLATE.format(
            SCHEMA=ddl_schema, QUESTION=question, DB_SCHEMA_PREFIX=DB_SCHEMA_PREFIX
        )
    else:
        raise ValueError(f"Unsupported generate_sql_type: {generate_sql_type}")

    model = GeminiModel(model_name=model, temperature=temperature)
    requests = [prompt for _ in range(number_of_candidates)]
    responses = model.call_parallel(requests, parser_func=parse_response)
    # Take just the first response.
    responses = responses[0]

    # If postprocessing of the SQL is required, then do it here.
    if transpile_to_postgresql:
        translator = sql_translator.SqlTranslator(
            model=model,
            temperature=temperature,
            process_input_errors=process_input_errors,
            process_tool_output_errors=process_tool_output_errors,
        )
        responses: str = translator.translate(
            responses, ddl_schema=ddl_schema, db=schema
        )

    return responses
            responses, ddl_schema=ddl_schema, db=db, catalog=project
        )

    return responses
