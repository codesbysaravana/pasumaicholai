#!/usr/bin/env python3
import argparse
import mimetypes
import os
import uuid
from pathlib import Path

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


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser(description="Upload image to farmer S3 path")
    parser.add_argument("--file", required=True, help="Local image path")
    parser.add_argument("--farmer_id", required=True, help="Farmer id")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET_NAME", "").strip(), help="S3 bucket")
    parser.add_argument("--region", default=os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1")), help="AWS region")
    args = parser.parse_args()

    if not args.bucket:
        raise SystemExit("S3 bucket missing. Set S3_BUCKET_NAME or pass --bucket")

    file_path = Path(args.file).expanduser().resolve()
    if not file_path.exists():
        raise SystemExit(f"File not found: {file_path}")

    ext = file_path.suffix.lower() or ".bin"
    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    key = f"farmers/{args.farmer_id}/{uuid.uuid4()}{ext}"

    session = get_session(args.region)
    s3_client = session.client("s3")
    with file_path.open("rb") as fp:
        s3_client.put_object(
            Bucket=args.bucket,
            Key=key,
            Body=fp,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )

    url = f"https://{args.bucket}.s3.{args.region}.amazonaws.com/{key}"
    print(f"Uploaded key: {key}")
    print(f"Public URL : {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
