from typing import Dict, List


def registrar_evento(delito: Dict) -> Dict:
    """Store a reported crime event."""
    raise NotImplementedError("Persist event to database.")


def listar_eventos() -> List[Dict]:
    """Return events for map rendering."""
    raise NotImplementedError("Read events from database.")
