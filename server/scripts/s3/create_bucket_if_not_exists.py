#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
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


def bucket_exists(s3_client, bucket: str) -> bool:
    try:
        s3_client.head_bucket(Bucket=bucket)
        return True
    except ClientError:
        return False


def ensure_bucket(s3_client, bucket: str, region: str) -> None:
    if bucket_exists(s3_client, bucket):
        print(f"Bucket exists: {bucket}")
        return

    if region == "us-east-1":
        s3_client.create_bucket(Bucket=bucket)
    else:
        s3_client.create_bucket(
            Bucket=bucket,
            CreateBucketConfiguration={"LocationConstraint": region},
        )
    print(f"Bucket created: {bucket}")


def configure_public_read(s3_client, bucket: str) -> None:
    # Learner-lab requirement: readable object URLs for listing images.
    s3_client.put_public_access_block(
        Bucket=bucket,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": False,
            "IgnorePublicAcls": False,
            "BlockPublicPolicy": False,
            "RestrictPublicBuckets": False,
        },
    )

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            }
        ],
    }
    s3_client.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
    print(f"Applied public-read policy: {bucket}")


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser(description="Create S3 bucket if missing")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET_NAME", "").strip(), help="S3 bucket name")
    parser.add_argument("--region", default=os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1")), help="AWS region")
    args = parser.parse_args()

    if not args.bucket:
        raise SystemExit("S3 bucket name missing. Set S3_BUCKET_NAME or pass --bucket")

    session = get_session(args.region)
    s3_client = session.client("s3")

    ensure_bucket(s3_client, args.bucket, args.region)
    configure_public_read(s3_client, args.bucket)
    print(f"Ready: s3://{args.bucket}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
