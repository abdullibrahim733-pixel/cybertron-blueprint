from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.design_agent import DesignAgent
from agents.circuit_agent import CircuitAgent
from agents.bom_agent import BomAgent

router = APIRouter()

class DesignRequest(BaseModel):
    description: str
    project_id: Optional[str] = None

class DesignResponse(BaseModel):
    project_name: str
    subsystems: list[dict]
    requirements: dict
    notes: str

class CircuitRequest(BaseModel):
    subsystem: str
    requirements: dict
    constraints: Optional[dict] = None

class CircuitResponse(BaseModel):
    subsystem: str
    components: list[dict]
    connections: list[dict]
    netlist: str
    notes: str

class BomRequest(BaseModel):
    design: dict
    budget: Optional[float] = None
    preferred_suppliers: Optional[list[str]] = None

class BomResponse(BaseModel):
    project_name: str
    entries: list[dict]
    total_estimated_cost: float
    notes: str

class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    context: Optional[list[dict]] = None

class ChatResponse(BaseModel):
    response: str
    design_data: Optional[dict] = None
    actions: Optional[list[str]] = None


@router.post("/design/generate", response_model=DesignResponse)
async def generate_design(request: DesignRequest):
    """Generate a hardware design from natural language description."""
    agent = DesignAgent()
    try:
        result = await agent.decompose(request.description)
        return DesignResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/design/circuit", response_model=CircuitResponse)
async def generate_circuit(request: CircuitRequest):
    """Generate circuit design for a specific subsystem."""
    agent = CircuitAgent()
    try:
        result = await agent.generate(
            subsystem=request.subsystem,
            requirements=request.requirements,
            constraints=request.constraints or {}
        )
        return CircuitResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/design/bom", response_model=BomResponse)
async def generate_bom(request: BomRequest):
    """Generate a Bill of Materials from a design."""
    agent = BomAgent()
    try:
        result = await agent.generate(
            design=request.design,
            budget=request.budget,
            preferred_suppliers=request.preferred_suppliers
        )
        return BomResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/design/chat", response_model=ChatResponse)
async def design_chat(request: ChatRequest):
    """Interactive design chat - ask questions about hardware design."""
    from openai import AsyncOpenAI
    from config import settings

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system_prompt = """You are Cybertron's AI hardware design assistant. You help users:
    - Design electronic circuits and systems
    - Select appropriate components
    - Understand hardware design principles
    - Generate schematics and BOMs
    - Debug hardware issues

    When a user describes a project, help them break it down into subsystems and suggest components.
    Be technical but accessible. Provide specific part numbers when possible."""

    messages = [{"role": "system", "content": system_prompt}]

    if request.context:
        for msg in request.context:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    messages.append({"role": "user", "content": request.message})

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        temperature=0.7,
        max_tokens=2000,
    )

    return ChatResponse(
        response=response.choices[0].message.content,
        design_data=None,
        actions=None,
    )


@router.get("/design/capabilities")
async def get_capabilities():
    """Return available AI design capabilities."""
    return {
        "capabilities": [
            {
                "name": "design_decomposition",
                "description": "Break down a project description into subsystems and requirements",
            },
            {
                "name": "circuit_generation",
                "description": "Generate circuit designs for specific subsystems",
            },
            {
                "name": "bom_generation",
                "description": "Generate a Bill of Materials from a design",
            },
            {
                "name": "component_selection",
                "description": "Recommend components based on requirements",
            },
            {
                "name": "design_review",
                "description": "Review a design for issues and improvements",
            },
        ],
        "supported_domains": [
            "electronics",
            "embedded_systems",
            "sensors",
            "power_electronics",
            "motor_control",
            "communication",
        ],
    }
