#!/usr/bin/env python3
import argparse
import os
from pathlib import Path
from urllib.parse import urlparse

import boto3
from dotenv import load_dotenv


def load_env() -> None:
    base_dir = Path(__file__).resolve().parents[2]
    load_dotenv(base_dir / ".env")


def get_session(region: str):
    return boto3.session.Session(
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
        region_name=region,
    )


def key_from_url(bucket: str, image_url: str) -> str:
    parsed = urlparse(image_url)
    if not parsed.netloc.startswith(f"{bucket}.s3."):
        raise ValueError("URL does not match configured bucket")
    return parsed.path.lstrip("/")


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser(description="Delete image from S3")
    parser.add_argument("--key", default="", help="S3 object key")
    parser.add_argument("--url", default="", help="S3 public URL")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET_NAME", "").strip(), help="S3 bucket")
    parser.add_argument("--region", default=os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1")), help="AWS region")
    args = parser.parse_args()

    if not args.bucket:
        raise SystemExit("S3 bucket missing. Set S3_BUCKET_NAME or pass --bucket")
    if not args.key and not args.url:
        raise SystemExit("Provide either --key or --url")

    key = args.key.strip()
    if not key:
        key = key_from_url(args.bucket, args.url.strip())

    session = get_session(args.region)
    s3_client = session.client("s3")
    s3_client.delete_object(Bucket=args.bucket, Key=key)
    print(f"Deleted key: {key}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
