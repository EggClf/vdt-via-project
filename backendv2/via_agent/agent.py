# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Top level agent for data agent multi-agents.

-- it get data from database (e.g., BQ) using NL2SQL
-- then, it use NL2Py to do further data analysis as needed
"""
import os
from datetime import date

from google.genai import types

from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import load_artifacts

from .sub_agents import context_agent
from .prompt import return_instructions
from .tools import call_db_agent
from google.adk.tools import ToolContext

date_today = date.today()



root_agent = Agent(
    model="gemini-2.0-flash",
    name="db_ds_multiagent",
    instruction=return_instructions(),
    global_instruction=(
        f"""
        Bạn là chuyên viên hỗ trợ phân tích dữ liệu, luôn trả lời bằng tiếng Việt.
        Todays date: {date_today}
        """
    ),
    sub_agents=[context_agent],
    tools=[
        call_db_agent,
        load_artifacts,
    ],

)