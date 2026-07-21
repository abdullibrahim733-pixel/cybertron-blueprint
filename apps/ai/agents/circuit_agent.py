from openai import AsyncOpenAI
from config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)

CIRCUIT_GENERATION_PROMPT = """You are an expert circuit designer. Given a subsystem and requirements, generate a circuit design.

Output JSON with this structure:
{
    "subsystem": "string",
    "components": [
        {
            "name": "string",
            "type": "resistor|capacitor|ic|sensor|motor|led|connector|other",
            "value": "string (e.g., 10kΩ, 100nF)",
            "package": "string (e.g., 0805, SOIC-8)",
            "quantity": 1,
            "description": "string",
            "part_number": "suggested part number if known"
        }
    ],
    "connections": [
        {
            "from": "component:pin",
            "to": "component:pin",
            "net_name": "string",
            "notes": "optional"
        }
    ],
    "netlist": "SPICE-compatible netlist or connection description",
    "notes": "design notes, power requirements, etc."
}

Be specific with component values and part numbers. Include decoupling capacitors, pull-up/pull-down resistors as needed.
Consider signal integrity, power filtering, and protection circuits.
"""

class CircuitAgent:
    async def generate(self, subsystem: str, requirements: dict, constraints: dict) -> dict:
        """Generate a circuit design for a subsystem."""
        
        import json
        
        prompt = f"""Design a circuit for: {subsystem}

Requirements: {json.dumps(requirements, indent=2)}

Constraints: {json.dumps(constraints, indent=2)}"""

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": CIRCUIT_GENERATION_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        
        # Ensure required fields
        result.setdefault("subsystem", subsystem)
        result.setdefault("components", [])
        result.setdefault("connections", [])
        result.setdefault("netlist", "")
        result.setdefault("notes", "")
        
        return result
