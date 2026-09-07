import argparse
import json
import sys
import os
import cv2
import urllib.request
from PIL import Image
import imagehash

MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
MODEL_PATH = "temp/models/face_detection_yunet_2023mar.onnx"

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def download_model_if_missing():
    if not os.path.exists(MODEL_PATH):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        eprint(f"Downloading YuNet model from {MODEL_URL}...")
        try:
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
            eprint("Model downloaded successfully.")
        except Exception as e:
            eprint(f"Failed to download model: {e}")
            print(json.dumps({"status": "error", "message": "Failed to download face detection model"}))
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="OpenCV YuNet Face Engine")
    parser.add_argument("--image", required=True, help="Path to input image")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"status": "error", "message": f"File not found: {args.image}"}))
        sys.exit(1)

    # Ensure model is available
    download_model_if_missing()

    # Read image
    img = cv2.imread(args.image)
    if img is None:
        print(json.dumps({"status": "error", "message": "Failed to decode image"}))
        sys.exit(1)

    h_img, w_img = img.shape[:2]

    # Resize the full image for the external search API to avoid payload size limits
    max_dim = max(h_img, w_img)
    os.makedirs("temp", exist_ok=True)
    resized_path = "temp/full_resized.jpg"

    if max_dim > 800:
        scale = 800.0 / max_dim
        new_w = int(w_img * scale)
        new_h = int(h_img * scale)
        full_resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        full_resized = img.copy()
        
    # Save the resized image with a JPEG quality of 85
    cv2.imwrite(resized_path, full_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])

    # Initialize FaceDetectorYN
    try:
        detector = cv2.FaceDetectorYN.create(
            model=MODEL_PATH,
            config="",
            input_size=(w_img, h_img),
            score_threshold=0.9,
            nms_threshold=0.3,
            top_k=5000
        )
    except Exception as e:
        eprint(f"Failed to initialize YuNet detector: {e}")
        print(json.dumps({"status": "error", "message": "Failed to initialize YuNet detector"}))
        sys.exit(1)

    # Detect faces
    status, faces = detector.detect(img)

    if faces is None or len(faces) == 0:
        print(json.dumps({"status": "error", "message": "No face detected in image"}))
        sys.exit(1)

    # Pick the largest detected face (x, y, w, h)
    # The bounding box is the first 4 elements: [x, y, w, h]
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    x, y, w, h = faces[0][:4]
    
    # Coordinates can be floats, so convert to int for array slicing
    x, y, w, h = int(x), int(y), int(w), int(h)

    # Add 15% margin around the face
    pad_x = int(w * 0.15)
    pad_y = int(h * 0.15)

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w_img, x + w + pad_x)
    y2 = min(h_img, y + h + pad_y)

    face_crop = img[y1:y2, x1:x2]
    
    if face_crop.size == 0:
        print(json.dumps({"status": "error", "message": "Face crop resulted in empty image"}))
        sys.exit(1)

    crop_path = "temp/face_crop.jpg"
    cv2.imwrite(crop_path, face_crop)

    # Compute Perceptual Hash (pHash) on the cropped face
    try:
        pil_crop = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB))
        phash_str = str(imagehash.phash(pil_crop))
    except Exception as e:
        eprint(f"Failed to compute phash: {e}")
        print(json.dumps({"status": "error", "message": "Failed to compute phash"}))
        sys.exit(1)

    # Generate a normalized 128-d feature representation from the face crop
    # Resize face crop to 16x8 (128 pixels), flatten and normalize
    resized = cv2.resize(face_crop, (16, 8), interpolation=cv2.INTER_AREA)
    embedding_raw = (resized.flatten() / 255.0).tolist()[:128]

    # Quantize to fixed-point int16 (-10000 to +10000 range) for Solidity EVM compatibility
    embedding_quantized = [int(v * 10000) for v in embedding_raw]

    output = {
        "status": "success",
        "resized_path": resized_path,
        "crop_path": crop_path,
        "phash": phash_str,
        "faces_detected": int(len(faces)),
        "embedding_raw": embedding_raw,
        "embedding_quantized": embedding_quantized
    }

    # Print ONLY single-line JSON to stdout
    print(json.dumps(output))

if __name__ == "__main__":
    main()