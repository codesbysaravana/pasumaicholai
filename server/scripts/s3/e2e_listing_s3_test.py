#!/usr/bin/env python3
"""
End-to-end test for farmer listing image storage in S3.

Flow:
1) Login as farmer
2) Create listing with base64 image
3) Verify response image URL points to S3
4) Verify object exists in S3
5) Fetch listing API and validate same image URL
6) Cleanup: delete listing and verify S3 object deletion
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from pathlib import Path
from urllib.parse import urlparse

import boto3
import requests
from botocore.exceptions import ClientError
from dotenv import load_dotenv


ONE_PIXEL_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+X6wXmwAAAABJRU5ErkJggg=="
)


def load_env() -> None:
    base_dir = Path(__file__).resolve().parents[2]
    load_dotenv(base_dir / ".env")


def session_with_aws(region: str):
    return boto3.session.Session(
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
        region_name=region,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="E2E test for listing -> S3 image flow")
    parser.add_argument("--base-url", default="http://localhost:5000/api/v1", help="API base URL")
    parser.add_argument("--email", required=True, help="Farmer user email")
    parser.add_argument("--password", required=True, help="Farmer user password")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET_NAME", "").strip(), help="S3 bucket name")
    parser.add_argument(
        "--region",
        default=os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1")),
        help="AWS region",
    )
    parser.add_argument("--keep-listing", action="store_true", help="Do not delete listing at end")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout seconds")
    return parser.parse_args()


def api_post(client: requests.Session, url: str, payload: dict, timeout: int) -> dict:
    response = client.post(url, json=payload, timeout=timeout)
    if response.status_code >= 400:
        raise RuntimeError(f"POST {url} failed [{response.status_code}]: {response.text}")
    return response.json()


def api_get(client: requests.Session, url: str, timeout: int) -> dict:
    response = client.get(url, timeout=timeout)
    if response.status_code >= 400:
        raise RuntimeError(f"GET {url} failed [{response.status_code}]: {response.text}")
    return response.json()


def api_delete(client: requests.Session, url: str, timeout: int) -> dict:
    response = client.delete(url, timeout=timeout)
    if response.status_code >= 400:
        raise RuntimeError(f"DELETE {url} failed [{response.status_code}]: {response.text}")
    return response.json()


def build_listing_payload() -> dict:
    return {
        "cropName": f"E2E Crop {uuid.uuid4().hex[:8]}",
        "category": "vegetable",
        "quantity": 5,
        "pricePerKg": 12.5,
        "harvestDate": "2026-03-01",
        "description": "E2E listing to validate S3 image storage",
        "location": "Madurai",
        "images": [f"data:image/png;base64,{ONE_PIXEL_PNG_BASE64}"],
        "unit": "kg",
    }


def extract_s3_key(bucket: str, image_url: str) -> str:
    parsed = urlparse(image_url)
    if not parsed.scheme.startswith("http"):
        raise RuntimeError(f"Invalid image URL scheme: {image_url}")
    if not parsed.netloc.startswith(f"{bucket}.s3."):
        raise RuntimeError(f"Image URL does not point to expected bucket '{bucket}': {image_url}")
    return parsed.path.lstrip("/")


def assert_s3_object_exists(s3_client, bucket: str, key: str) -> None:
    s3_client.head_object(Bucket=bucket, Key=key)


def assert_s3_object_deleted(s3_client, bucket: str, key: str) -> None:
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        raise RuntimeError(f"S3 object still exists after listing delete: s3://{bucket}/{key}")
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code not in {"404", "NoSuchKey", "NotFound"}:
            raise


def main() -> int:
    load_env()
    args = parse_args()
    if not args.bucket:
        raise SystemExit("Missing S3 bucket. Set S3_BUCKET_NAME in .env or pass --bucket")

    print("Starting E2E test: listing image -> S3")
    print(f"API: {args.base_url}")
    print(f"Bucket: {args.bucket} | Region: {args.region}")

    s3_client = session_with_aws(args.region).client("s3")
    client = requests.Session()

    login_payload = {"email": args.email, "password": args.password}
    login_res = api_post(client, f"{args.base_url}/auth/login", login_payload, args.timeout)
    user = login_res.get("data") or {}
    role = user.get("role")
    if role != "farmer":
        raise RuntimeError(f"Authenticated user is not farmer. role={role!r}")
    print(f"Login OK as farmer: {user.get('email')}")

    listing_payload = build_listing_payload()
    create_res = api_post(client, f"{args.base_url}/marketplace/farmer/create-listing", listing_payload, args.timeout)
    created = create_res.get("data") or {}
    listing_id = created.get("id")
    images = created.get("images") or []
    if not listing_id:
        raise RuntimeError(f"Missing listing id in response: {json.dumps(create_res)}")
    if not images:
        raise RuntimeError(f"Missing images in create-listing response: {json.dumps(create_res)}")

    image_url = images[0]
    key = extract_s3_key(args.bucket, image_url)
    print(f"Create listing OK: id={listing_id}")
    print(f"S3 image URL: {image_url}")

    assert_s3_object_exists(s3_client, args.bucket, key)
    print(f"S3 object exists: s3://{args.bucket}/{key}")

    listing_res = api_get(client, f"{args.base_url}/marketplace/listings/{listing_id}", args.timeout)
    fetched = listing_res.get("data") or {}
    fetched_images = fetched.get("images") or []
    if not fetched_images or fetched_images[0] != image_url:
        raise RuntimeError(f"Retrieved listing image mismatch. expected={image_url}, got={fetched_images}")
    print("Retrieve listing OK: image URL matches")

    if args.keep_listing:
        print("Cleanup skipped (--keep-listing)")
        print("E2E test PASSED")
        return 0

    api_delete(client, f"{args.base_url}/marketplace/listings/{listing_id}", args.timeout)
    print(f"Listing deleted: id={listing_id}")

    assert_s3_object_deleted(s3_client, args.bucket, key)
    print(f"S3 object deleted with listing cleanup: s3://{args.bucket}/{key}")
    print("E2E test PASSED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"E2E test FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
