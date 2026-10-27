import os
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from PIL import Image
import imagehash
from sklearn.cluster import KMeans
import numpy as np
from backend.app.core.config import UPLOADS_DIR, DATA_DIR

def extract_image_metadata(img_path: Path) -> Dict[str, Any]:
    with Image.open(img_path) as img:
        width, height = img.size
        aspect_ratio = round(float(width / height), 2) if height > 0 else 1.0
        mode = img.mode
        img_format = img.format or img_path.suffix.lstrip(".").upper()

        # Compute exact MD5 hash
        hasher = hashlib.md5()
        with open(img_path, "rb") as f:
            hasher.update(f.read())
        md5_hash = hasher.hexdigest()

        # Compute perceptual hash (pHash & dHash)
        phash_val = str(imagehash.phash(img))
        dhash_val = str(imagehash.dhash(img))

        # Extract normalized color histogram feature (RGB 8 bins each = 24 features)
        rgb_img = img.convert("RGB")
        hist = rgb_img.histogram() # 256 R, 256 G, 256 B
        # Aggregate into 8 bins per channel
        r_bins = np.array(hist[0:256]).reshape(8, 32).sum(axis=1)
        g_bins = np.array(hist[256:512]).reshape(8, 32).sum(axis=1)
        b_bins = np.array(hist[512:768]).reshape(8, 32).sum(axis=1)
        feat_vec = np.concatenate([r_bins, g_bins, b_bins])
        total_pixels = width * height
        feat_norm = (feat_vec / total_pixels).tolist() if total_pixels > 0 else [0.0] * 24

    return {
        "filename": img_path.name,
        "path": str(img_path),
        "file_size_kb": round(img_path.stat().st_size / 1024.0, 2),
        "width": width,
        "height": height,
        "aspect_ratio": aspect_ratio,
        "format": img_format,
        "color_mode": mode,
        "md5_hash": md5_hash,
        "phash": phash_val,
        "dhash": dhash_val,
        "color_feature": feat_norm
    }

def analyze_multimedia_database(
    custom_dir: Optional[str] = None,
    use_sample_if_empty: bool = True
) -> Dict[str, Any]:
    search_dir = Path(custom_dir) if custom_dir else UPLOADS_DIR
    valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

    img_files = [f for f in search_dir.glob("*") if f.suffix.lower() in valid_exts]
    if not img_files and use_sample_if_empty:
        sample_dir = DATA_DIR / "sample_images"
        if sample_dir.exists():
            img_files = [f for f in sample_dir.glob("*") if f.suffix.lower() in valid_exts]

    if not img_files:
        return {
            "total_images": 0,
            "images_metadata": [],
            "exact_duplicates": [],
            "perceptual_duplicates": [],
            "visual_clusters": [],
            "note": "No images found in upload directory. Please upload images to run multimedia mining."
        }

    metas = []
    for f in img_files:
        try:
            metas.append(extract_image_metadata(f))
        except Exception:
            continue

    if not metas:
        return {
            "total_images": 0,
            "images_metadata": [],
            "exact_duplicates": [],
            "perceptual_duplicates": [],
            "visual_clusters": [],
            "note": "Uploaded images could not be parsed."
        }

    # 1. Exact Duplicate Detection (MD5 match)
    md5_groups: Dict[str, List[str]] = {}
    for m in metas:
        md5_groups.setdefault(m["md5_hash"], []).append(m["filename"])

    exact_dups = [
        {"hash": h, "filenames": files, "count": len(files)}
        for h, files in md5_groups.items() if len(files) > 1
    ]

    # 2. Perceptual Duplicate Detection (pHash Hamming distance <= 6)
    perceptual_pairs = []
    n = len(metas)
    for i in range(n):
        for j in range(i + 1, n):
            h1 = imagehash.hex_to_hash(metas[i]["phash"])
            h2 = imagehash.hex_to_hash(metas[j]["phash"])
            dist = int(h1 - h2)
            if dist <= 6:
                perceptual_pairs.append({
                    "image_1": metas[i]["filename"],
                    "image_2": metas[j]["filename"],
                    "hamming_distance": dist,
                    "similarity": round(float((64 - dist) / 64.0) * 100, 1),
                    "is_exact_file_match": bool(metas[i]["md5_hash"] == metas[j]["md5_hash"])
                })

    # 3. Visual Clustering using Color Features
    features = [m["color_feature"] for m in metas]
    k = min(3, len(metas))
    clusters = []
    if len(metas) >= 2:
        km = KMeans(n_clusters=k, n_init=5, random_state=1).fit(features)
        labels = km.labels_
        for cluster_idx in range(k):
            cluster_files = [metas[i]["filename"] for i in range(len(metas)) if labels[i] == cluster_idx]
            clusters.append({
                "cluster_id": cluster_idx + 1,
                "image_count": len(cluster_files),
                "images": cluster_files
            })
    else:
        clusters = [{"cluster_id": 1, "image_count": len(metas), "images": [m["filename"] for m in metas]}]

    # Clean out raw feature vectors before returning JSON
    for m in metas:
        m.pop("color_feature", None)

    return {
        "total_images": len(metas),
        "images_metadata": metas,
        "exact_duplicates": exact_dups,
        "perceptual_duplicates": perceptual_pairs,
        "visual_clusters": clusters,
    }
