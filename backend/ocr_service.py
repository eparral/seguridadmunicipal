import os
from typing import Optional

import cv2
import numpy as np
import pytesseract
from PIL import Image


def _configure_tesseract_cmd() -> str:
    """Ensure pytesseract points to the local tesseract binary."""
    env_path = os.getenv("TESSERACT_CMD")
    default_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    for candidate in (env_path, default_path):
        if candidate and os.path.exists(candidate):
            pytesseract.pytesseract.tesseract_cmd = candidate
            return candidate

    raise RuntimeError(
        "Tesseract binary not found. Install it or set TESSERACT_CMD to tesseract.exe path."
    )


def _preprocess_image(image_bytes: bytes) -> Image.Image:
    """Light preprocessing to improve OCR accuracy on license plates."""
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Could not decode image bytes.")

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    pil_image = Image.fromarray(thresh)
    return pil_image


def _normalize_plate(text: str) -> Optional[str]:
    """Clean OCR output to a plate-like token."""
    cleaned = "".join(ch for ch in text.upper() if ch.isalnum())
    return cleaned or None


def leer_patente_desde_imagen(image_bytes: bytes) -> Optional[str]:
    """Run OCR on raw image bytes and return a license plate string."""
    _configure_tesseract_cmd()
    processed = _preprocess_image(image_bytes)

    text = pytesseract.image_to_string(processed, config="--psm 8 --oem 3")
    return _normalize_plate(text)
