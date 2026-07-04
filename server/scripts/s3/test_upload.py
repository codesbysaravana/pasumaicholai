#!/usr/bin/env python3
import os
import uuid
from pathlib import Path

import boto3
from dotenv import load_dotenv


ONE_PIXEL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc`\x00\x00"
    b"\x00\x02\x00\x01\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
)


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
    region = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
    bucket = os.getenv("S3_BUCKET_NAME", "").strip()
    if not bucket:
        raise SystemExit("S3_BUCKET_NAME is missing in .env")

    key = f"farmers/test/{uuid.uuid4()}.png"
    session = get_session(region)
    s3 = session.client("s3")

    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=ONE_PIXEL_PNG,
        ContentType="image/png",
        CacheControl="public, max-age=31536000, immutable",
    )
    s3.head_object(Bucket=bucket, Key=key)

    url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    print("S3 upload test successful")
    print(f"Key: {key}")
    print(f"URL: {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
