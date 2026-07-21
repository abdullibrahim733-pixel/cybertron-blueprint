from openai import AsyncOpenAI
from config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)

BOM_GENERATION_PROMPT = """You are a hardware procurement specialist. Given a design, generate a Bill of Materials.

Output JSON with this structure:
{
    "project_name": "string",
    "entries": [
        {
            "part_name": "string",
            "part_number": "string (manufacturer part number)",
            "description": "string",
            "quantity": 1,
            "unit_price_usd": 0.00,
            "supplier": "string (Digi-Key, Mouser, LCSC, etc.)",
            "category": "string",
            "alternatives": ["alternative part numbers"]
        }
    ],
    "total_estimated_cost": 0.00,
    "notes": "ordering notes, minimum quantities, lead times"
}

Use realistic pricing. Consider:
- Minimum order quantities
- Lead times
- Alternative sources
- Volume pricing
- Common, readily-available parts
"""

class BomAgent:
    async def generate(self, design: dict, budget: float = None, preferred_suppliers: list[str] = None) -> dict:
        """Generate a Bill of Materials from a design."""
        
        import json
        
        prompt = f"""Generate a BOM for this design:

{json.dumps(design, indent=2)}"""

        if budget:
            prompt += f"\n\nBudget: ${budget:.2f}"
        if preferred_suppliers:
            prompt += f"\n\nPreferred suppliers: {', '.join(preferred_suppliers)}"

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": BOM_GENERATION_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        
        # Ensure required fields
        result.setdefault("project_name", "Untitled")
        result.setdefault("entries", [])
        result.setdefault("total_estimated_cost", 0.0)
        result.setdefault("notes", "")
        
        return result
