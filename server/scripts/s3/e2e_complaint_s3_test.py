#!/usr/bin/env python3
"""
E2E test for complaint attachment storage in S3.

Flow:
1) Login as farmer
2) Create complaint with multipart attachment
3) Verify attachmentUrl is S3 URL
4) Verify object exists in S3
5) Fetch farmer complaints and confirm URL appears
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from pathlib import Path
from urllib.parse import urlparse

import boto3
import requests
from dotenv import load_dotenv


ONE_PIXEL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc`\x00\x00"
    b"\x00\x02\x00\x01\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
)


def load_env() -> None:
    base_dir = Path(__file__).resolve().parents[2]
    load_dotenv(base_dir / ".env")


def aws_session(region: str):
    return boto3.session.Session(
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
        region_name=region,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="E2E complaint attachment S3 test")
    parser.add_argument("--base-url", default="http://localhost:5000/api/v1", help="API base URL")
    parser.add_argument("--email", required=True, help="Farmer email")
    parser.add_argument("--password", required=True, help="Farmer password")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET_NAME", "").strip(), help="S3 bucket")
    parser.add_argument(
        "--region",
        default=os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1")),
        help="AWS region",
    )
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout seconds")
    return parser.parse_args()


def assert_ok(response: requests.Response, label: str) -> dict:
    if response.status_code >= 400:
        raise RuntimeError(f"{label} failed [{response.status_code}]: {response.text}")
    return response.json()


def key_from_url(bucket: str, url: str) -> str:
    parsed = urlparse(url)
    if not parsed.netloc.startswith(f"{bucket}.s3."):
        raise RuntimeError(f"Attachment URL does not belong to bucket '{bucket}': {url}")
    return parsed.path.lstrip("/")


def main() -> int:
    load_env()
    args = parse_args()
    if not args.bucket:
        raise SystemExit("S3 bucket missing. Set S3_BUCKET_NAME in .env or pass --bucket")

    print("Starting E2E complaint S3 test")
    print(f"API: {args.base_url}")

    client = requests.Session()

    login_res = client.post(
        f"{args.base_url}/auth/login",
        json={"email": args.email, "password": args.password},
        timeout=args.timeout,
    )
    login_payload = assert_ok(login_res, "Login")
    role = (login_payload.get("data") or {}).get("role")
    if role != "farmer":
        raise RuntimeError(f"User role must be farmer, got {role!r}")

    run_id = uuid.uuid4().hex[:8]
    form_data = {
        "farmerLocation": "Palanjur, Tamil Nadu",
        "complaintType": "Water Supply",
        "description": f"E2E S3 complaint attachment test {run_id} - please ignore.",
        "ward": "Unknown",
        "city": "Palanjur",
        "state": "Tamil Nadu",
    }
    files = {
        "attachment": (f"e2e-{run_id}.png", ONE_PIXEL_PNG, "image/png"),
    }

    create_res = client.post(
        f"{args.base_url}/farmer/complaints",
        data=form_data,
        files=files,
        timeout=args.timeout,
    )
    create_payload = assert_ok(create_res, "Create complaint")
    complaint = create_payload.get("data") or {}
    attachment_url = complaint.get("attachmentUrl")
    if not attachment_url:
        raise RuntimeError(f"attachmentUrl missing in create response: {create_payload}")

    key = key_from_url(args.bucket, attachment_url)
    print(f"Complaint created: {complaint.get('id')}")
    print(f"Attachment URL: {attachment_url}")

    s3 = aws_session(args.region).client("s3")
    s3.head_object(Bucket=args.bucket, Key=key)
    print(f"S3 object exists: s3://{args.bucket}/{key}")

    list_res = client.get(f"{args.base_url}/farmer/complaints", timeout=args.timeout)
    list_payload = assert_ok(list_res, "Get farmer complaints")
    complaints = list_payload.get("data") or []
    found = any((item or {}).get("attachmentUrl") == attachment_url for item in complaints)
    if not found:
        raise RuntimeError("Created complaint attachment URL not found in list endpoint")

    print("Complaint retrieval OK: attachment URL present")
    print("E2E complaint S3 test PASSED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"E2E complaint S3 test FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
