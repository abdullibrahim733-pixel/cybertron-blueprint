from openai import AsyncOpenAI
from config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)

DESIGN_DECOMPOSITION_PROMPT = """You are an expert hardware design engineer. Given a project description, decompose it into subsystems and requirements.

Output JSON with this structure:
{
    "project_name": "string",
    "subsystems": [
        {
            "name": "string",
            "description": "string",
            "type": "electronic|mechanical|software",
            "key_components": ["component names"],
            "interfaces": ["connections to other subsystems"]
        }
    ],
    "requirements": {
        "power": "voltage and current requirements",
        "size": "physical constraints",
        "cost": "budget estimate",
        "performance": "key specs"
    },
    "notes": "any important design considerations"
}

Be specific and practical. Include actual component types (e.g., "ESP32 microcontroller" not just "microcontroller").
Consider power requirements, communication protocols, and physical constraints.
"""

class DesignAgent:
    async def decompose(self, description: str) -> dict:
        """Decompose a project description into subsystems and requirements."""
        
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": DESIGN_DECOMPOSITION_PROMPT},
                {"role": "user", "content": f"Design a hardware system for: {description}"},
            ],
            temperature=0.7,
            max_tokens=3000,
            response_format={"type": "json_object"},
        )

        import json
        result = json.loads(response.choices[0].message.content)
        
        # Ensure required fields
        result.setdefault("project_name", "Untitled Project")
        result.setdefault("subsystems", [])
        result.setdefault("requirements", {})
        result.setdefault("notes", "")
        
        return result

    async def review(self, design: dict) -> dict:
        """Review a design and suggest improvements."""
        
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "You are a hardware design reviewer. Analyze the design and provide feedback on feasibility, potential issues, and improvements."},
                {"role": "user", "content": f"Review this hardware design: {design}"},
            ],
            temperature=0.5,
            max_tokens=2000,
        )

        return {
            "review": response.choices[0].message.content,
            "status": "reviewed",
        }
